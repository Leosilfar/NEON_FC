import type { GameSettings, GS, MatchSound, SlotPiece } from "@/types"

import { DEFAULT_GAME_CONTROLS } from "@/constants"

import {
  BR,
  FIELD_FRICTION,
  GOAL_Y0,
  GOAL_Y1,
  MOVE_SPD,
  PR,
  SUBSTEPS,
  VH,
  VW,
  clamp,
} from "@/constants/physics"

import { clampPieceToField } from "@/engine/physics"

import { applyTacticalAi, getTacticalAiSpinDirections } from "@/engine/ai"

import { updateFx } from "@/engine/fx/particles"

import { applyAiKick, applyPlayerKick } from "@/engine/combat/kicks"

import { updateKickoffRegroup } from "@/engine/rules/kickoff/update"

import {
  clampBallInsideDuringRegroup,
  correctResidualBallOverlaps,
  resolveMatchCollisions,
} from "@/engine/collision"

import {
  beginGoal,
  beginKickoffRegroup,
  CENTER_CIRCLE_RADIUS,
  getKickoffFacingRotation,
  REGROUP_ARRIVAL_DISTANCE,
} from "@/engine/rules/matchFlow"

export interface MatchInputState {
  keys: ReadonlySet<string>
}

const BALL_STUCK_RADIUS = 2.5 * PR

const KICKOFF_LIGHTS_SOUND_AT = 2.88
const ENDING_RETURN_SPEED = 280
const ENDING_BLACKOUT_DURATION = 1.25
const AI_DECISION_INTERVAL = 1 / 30

function updateMatchEnding(gs: GS, dt: number) {
  if (gs.endingPhase === "return") {
    let allPiecesHome = true

    for (const piece of gs.pieces) {
      const target = gs.homePositions[piece.id]
      if (!target) continue

      const dx = target.x - piece.x
      const dy = target.y - piece.y
      const distance = Math.hypot(dx, dy)
      const travel = Math.min(distance, ENDING_RETURN_SPEED * dt)

      if (distance > 0.1) {
        piece.x += (dx / distance) * travel
        piece.y += (dy / distance) * travel
        piece.vx = (dx / distance) * (dt > 0 ? travel / dt : 0)
        piece.vy = (dy / distance) * (dt > 0 ? travel / dt : 0)
        allPiecesHome = false
      } else {
        piece.x = target.x
        piece.y = target.y
        piece.vx = 0
        piece.vy = 0
      }

      const currentRotation = piece.rot ?? 0
      const rotationDelta = Math.atan2(
        Math.sin(target.rot - currentRotation),
        Math.cos(target.rot - currentRotation),
      )
      const maxRotation = Math.PI * dt
      piece.rot = currentRotation + clamp(rotationDelta, -maxRotation, maxRotation)
      if (Math.abs(rotationDelta) > maxRotation) allPiecesHome = false
      else piece.rot = target.rot
    }

    if (allPiecesHome) {
      gs.endingPhase = "blackout"
      gs.endingElapsed = 0
      gs.endingProgress = 0
    }
    return
  }

  if (gs.endingPhase === "blackout") {
    gs.endingElapsed += dt
    gs.endingProgress = clamp(
      gs.endingElapsed / ENDING_BLACKOUT_DURATION,
      0,
      1,
    )

    if (gs.endingProgress >= 1) {
      gs.endingPhase = null
      gs.finished = true
      gs.notification = "FIM DE JOGO"
    }
  }
}

function updateStuckBallTelemetry(gs: GS, dt: number) {
  const distanceFromAnchor = Math.hypot(
    gs.ball.x - gs.stuckBallX,

    gs.ball.y - gs.stuckBallY,
  )

  if (distanceFromAnchor > BALL_STUCK_RADIUS) {
    gs.stuckBallX = gs.ball.x

    gs.stuckBallY = gs.ball.y

    gs.stuckBallDuration = 0

    return
  }

  gs.stuckBallDuration += dt
}

export function stepMatchSimulation({
  gs,

  settings,

  input,

  playerSlots,

  dt,

  ts,

  onSound,
}: {
  gs: GS

  settings: GameSettings

  input: MatchInputState

  playerSlots: SlotPiece[]

  dt: number

  ts: number

  onSound?: (cue: MatchSound, intensity?: number) => void
}): GS {
  if (gs.paused || gs.finished) return gs

  if (gs.endingPhase) {
    updateMatchEnding(gs, dt)
    return gs
  }

  const controls = settings.controls ?? DEFAULT_GAME_CONTROLS

  updateFx(gs, dt)

  for (const [key, remaining] of Object.entries(gs.collisionCooldowns)) {
    if (remaining <= dt) delete gs.collisionCooldowns[key]
    else gs.collisionCooldowns[key] = remaining - dt
  }

  // Decrement kick cooldown every tick

  if (gs.kickCooldown > 0) gs.kickCooldown = Math.max(0, gs.kickCooldown - dt)

  applyPlayerKick(
    gs,
    settings,
    input.keys.has(controls.kick ?? "Space"),
    ts,
    onSound,
  )

  if (gs.goalCooldown > 0) {
    gs.goalCooldown -= dt

    const drag = Math.exp(-FIELD_FRICTION * dt)

    gs.ball.vx *= drag

    gs.ball.vy *= drag

    gs.ball.x += gs.ball.vx * dt

    gs.ball.y += gs.ball.vy * dt

    for (const piece of gs.pieces) {
      piece.vx *= drag

      piece.vy *= drag

      piece.x += piece.vx * dt

      piece.y += piece.vy * dt

      const result = clampPieceToField(piece, 0, VW, 0, VH)

      if (result.hitX) piece.vx = -piece.vx * 0.4

      if (result.hitY) piece.vy = -piece.vy * 0.4
    }

    if (gs.goalCooldown <= 0 || ts > gs.notifEnd) {
      beginKickoffRegroup(gs, playerSlots, settings)
    }

    return gs
  }

  if (gs.kickoffPhase === "intro" && gs.kickoffCountdown > 0) {
    const previousElapsed = gs.kickoffDuration - gs.kickoffCountdown

    gs.kickoffCountdown = Math.max(0, gs.kickoffCountdown - dt)

    const currentElapsed = gs.kickoffDuration - gs.kickoffCountdown

    if (
      previousElapsed < KICKOFF_LIGHTS_SOUND_AT &&
      currentElapsed >= KICKOFF_LIGHTS_SOUND_AT
    ) {
      onSound?.("lights-on")
    }

    if (gs.kickoffCountdown === 0) {
      gs.kickoffPhase = null

      onSound?.("whistle")

      onSound?.("match-start")
    }

    return gs
  }

  gs.notification = null

  const regrouping = gs.kickoffPhase === "regroup"

  if (gs.matchMode === "normal" && !regrouping) {
    gs.timeLeft = Math.max(0, gs.timeLeft - dt)

    if (gs.timeLeft <= 0) {
      gs.timeLeft = 0

      gs.endingPhase = "return"

      gs.endingProgress = 0

      gs.endingElapsed = 0

      gs.ball.vx = 0

      gs.ball.vy = 0

      gs.ball.x = VW / 2

      gs.ball.y = VH / 2

      gs.pieceVx = 0

      gs.pieceVy = 0

      gs.notification = null

      gs.particles = []

      gs.shockwaves = []

      onSound?.("match-end", 0.7)

      return gs
    }
  }

  const teamA = gs.pieces.filter((p) => p.team === "A")

  const sel = teamA.find((p) => p.isPlayerControlled) ?? teamA[gs.selectedIdx]

  const subDt = dt / SUBSTEPS

  const selId = sel?.id ?? -1

  if (!regrouping && gs.matchMode !== "training") {
    gs.aiDecisionElapsed += dt
    if (gs.aiDecisionElapsed >= AI_DECISION_INTERVAL) {
      const decisionDt = gs.aiDecisionElapsed
      gs.aiDecisionElapsed %= AI_DECISION_INTERVAL
      applyTacticalAi(gs, settings, decisionDt)

      const spinDirections = getTacticalAiSpinDirections(gs, settings)
      gs.aiSpinDirections = Object.fromEntries(spinDirections)
    }
  }

  for (let step = 0; step < SUBSTEPS; step++) {
    const angularSpeeds = new Map<number, number>()

    for (const piece of gs.pieces) {
      if (regrouping && piece.id === gs.kickoffConductorId) {
        const targetRotation = getKickoffFacingRotation(
          piece,

          gs.ball,

          gs.kickoffRecovery,

          settings,
        )

        const currentRotation = piece.rot ?? 0

        const rotationDifference = Math.atan2(
          Math.sin(targetRotation - currentRotation),

          Math.cos(targetRotation - currentRotation),
        )

        const rotationSpeed =
          Math.PI * (0.5 + settings.attrs[piece.type].speed / 40)

        const rotationDelta = clamp(
          rotationDifference,

          -rotationSpeed * subDt,

          rotationSpeed * subDt,
        )

        piece.rot = currentRotation + rotationDelta

        angularSpeeds.set(piece.id, subDt > 0 ? rotationDelta / subDt : 0)

        continue
      }

      if (regrouping) continue

      const rotationDirection =
        piece.id === selId
          ? (input.keys.has(controls.rotateRight) ? 1 : 0) -
            (input.keys.has(controls.rotateLeft) ? 1 : 0)
            : (gs.aiSpinDirections[piece.id] ?? 0)

      if (rotationDirection === 0) continue

      const maxRotationSpeed =
        Math.PI * (0.5 + settings.attrs[piece.type].speed / 40)

      const angularSpeed = rotationDirection * maxRotationSpeed

      piece.rot = (piece.rot ?? 0) + angularSpeed * subDt

      angularSpeeds.set(piece.id, angularSpeed)
    }

    applyAiKick(gs, settings, regrouping, ts, onSound)

    if (regrouping) {
      updateKickoffRegroup(gs, settings, subDt)
    } else if (sel) {
      const speedAttr = settings.attrs[sel.type].speed

      let dx = 0

      let dy = 0

      if (input.keys.has(controls.moveUp)) dy -= 1

      if (input.keys.has(controls.moveDown)) dy += 1

      if (input.keys.has(controls.moveLeft)) dx -= 1

      if (input.keys.has(controls.moveRight)) dx += 1

      const len = Math.hypot(dx, dy)

      if (len > 0) {
        const maxSpeed = MOVE_SPD * (0.5 + speedAttr / 200)

        const accel = maxSpeed * 8

        const targetVx = (dx / len) * maxSpeed

        const targetVy = (dy / len) * maxSpeed

        sel.vx += (targetVx - sel.vx) * Math.min(1, accel * subDt)

        sel.vy += (targetVy - sel.vy) * Math.min(1, accel * subDt)
      } else {
        sel.vx *= 0.95

        sel.vy *= 0.95

        if (Math.abs(sel.vx) < 5) sel.vx = 0

        if (Math.abs(sel.vy) < 5) sel.vy = 0
      }

      gs.pieceVx = sel.vx

      gs.pieceVy = sel.vy
    }

    for (const p of gs.pieces) {
      p.x += p.vx * subDt

      p.y += p.vy * subDt

      if (!regrouping && gs.matchMode === "training" && p.id !== selId) {
        const pieceDrag = Math.exp(-FIELD_FRICTION * subDt)

        p.vx *= pieceDrag

        p.vy *= pieceDrag

        if (Math.hypot(p.vx, p.vy) < 5) {
          p.vx = 0

          p.vy = 0
        }
      }
    }

    const drag = Math.exp(-FIELD_FRICTION * subDt)

    gs.ball.vx *= drag

    gs.ball.vy *= drag

    if (Math.hypot(gs.ball.vx, gs.ball.vy) < 6) {
      gs.ball.vx = 0

      gs.ball.vy = 0
    }

    gs.ball.x += gs.ball.vx * subDt

    gs.ball.y += gs.ball.vy * subDt

    if (regrouping) clampBallInsideDuringRegroup(gs)

    if (
      !regrouping &&
      gs.ball.x - BR <= 0 &&
      gs.ball.y >= GOAL_Y0 &&
      gs.ball.y <= GOAL_Y1
    ) {
      gs.scoreB++

      beginGoal(gs, settings, false, 0, gs.ball.y, ts, onSound)

      return gs
    }

    if (
      !regrouping &&
      gs.ball.x + BR >= VW &&
      gs.ball.y >= GOAL_Y0 &&
      gs.ball.y <= GOAL_Y1
    ) {
      gs.scoreA++

      beginGoal(gs, settings, true, VW, gs.ball.y, ts, onSound)

      return gs
    }

    resolveMatchCollisions(
      gs,
      settings,
      angularSpeeds,
      selId,
      subDt,
      regrouping,
      onSound,
    )

    for (const p of gs.pieces) {
      const res = clampPieceToField(p, 0, VW, 0, VH)

      if (res.hitX) p.vx = -p.vx * 0.4

      if (res.hitY) p.vy = -p.vy * 0.4
    }

    correctResidualBallOverlaps(gs, settings, regrouping, onSound)

    if (regrouping && !gs.kickoffCarryComplete) {
      if (
        !gs.kickoffCenterBraking &&
        Math.hypot(VW / 2 - gs.ball.x, VH / 2 - gs.ball.y) <=
          CENTER_CIRCLE_RADIUS - BR
      ) {
        gs.kickoffCenterBraking = true

        gs.kickoffConductorStriking = false
      }

      if (gs.kickoffCenterBraking) {
        const brake = Math.exp(-7 * subDt)

        gs.ball.vx *= brake

        gs.ball.vy *= brake

        if (Math.hypot(gs.ball.vx, gs.ball.vy) <= 18) {
          gs.ball.vx = 0

          gs.ball.vy = 0

          gs.kickoffCarryComplete = true
        }
      }
    }
  }

  if (regrouping && gs.kickoffCarryComplete) {
    const allPiecesReturned = gs.pieces.every((piece) => {
      const target = gs.kickoffTargets[piece.id]

      if (!target) return true

      return (
        Math.hypot(target.x - piece.x, target.y - piece.y) <=
          REGROUP_ARRIVAL_DISTANCE && Math.hypot(piece.vx, piece.vy) <= 18
      )
    })

    if (allPiecesReturned) {
      gs.kickoffPhase = null

      gs.kickoffConductorId = null

      gs.kickoffTeam = null

      gs.kickoffTargets = {}

      gs.kickoffYieldSides = {}

      gs.kickoffConductorStriking = false

      gs.kickoffCenterBraking = false

      gs.kickoffRecovery = null

      onSound?.("whistle")

      onSound?.("match-start")
    }
  }

  if (!regrouping && gs.matchMode !== "training")
    updateStuckBallTelemetry(gs, dt)

  return gs
}
