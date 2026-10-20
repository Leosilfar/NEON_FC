import type {
  GameSettings,
  GS,
  KickoffRecoveryState,
  MatchSound,
  SlotPiece,
  Team,
} from "@/types"
import { DEFAULT_GAME_CONTROLS } from "@/constants"

import {
  BALL_MASS,
  BR,
  FIELD_FRICTION,
  GOAL_Y0,
  GOAL_Y1,
  MOVE_SPD,
  PIECE_MASS_BASE,
  PR,
  SUBSTEPS,
  VH,
  VW,
  WALL_PINCH_VEL_CAP,
  clamp,
} from "@/constants/physics"

import {
  ballNearPieceAabb,
  ballRoundedWall,
  clampPieceToField,
  getPieceVerts,
  getPieceKickNormal,
  type HitResult,
  piecePieceHit,
  shapeBallHit,
} from "@/engine/physics"

import {
  applyTacticalAi,
  getTacticalAiKickIntents,
  getTacticalAiSpinDirections,
} from "@/engine/ai"
import { makeGS } from "@/engine/state"
import { emitCollision, updateFx } from "@/engine/fx/particles"
import {
  beginGoal,
  beginKickoffRegroup,
  CENTER_CIRCLE_RADIUS,
  getKickoffFacingRotation,
  getKickoffYieldTarget,
  KICKOFF_BALL_CONTACT_RADIUS,
  KICKOFF_PROGRESS_DISTANCE,
  KICKOFF_REPLAN_BALL_DISTANCE,
  KICKOFF_REPOSITION_ARRIVAL,
  KICKOFF_REPOSITION_RETRY_TIME,
  KICKOFF_STRIKE_RETRY_TIME,
  planKickoffRecovery,
  REGROUP_ARRIVAL_DISTANCE,
  REGROUP_BALL_X_MAX,
  REGROUP_BALL_X_MIN,
  steerKickoffConductor,
  steerPieceToTarget,
} from "@/engine/rules/matchFlow"

export interface MatchInputState {
  keys: ReadonlySet<string>
}

const BALL_STUCK_RADIUS = 2.5 * PR
const KICKOFF_LIGHTS_SOUND_AT = 2.88

type ImpactCallback = (
  x: number,
  y: number,
  nx: number,
  ny: number,
  intensity: number,
) => void

function clampBallToWallWithPinchEscape(
  gs: GS,
  pieceHit: HitResult & { rebound: number } | null,
  onWallImpact?: ImpactCallback,
) {
  const wall = ballRoundedWall(gs.ball.x, gs.ball.y, GOAL_Y0, GOAL_Y1)
  if (!wall.collided) return false

  gs.ball.x = wall.x
  gs.ball.y = wall.y

  const wallVn = gs.ball.vx * wall.nx + gs.ball.vy * wall.ny
  if (wallVn > 0) {
    if (wallVn > 18) {
      onWallImpact?.(
        gs.ball.x,
        gs.ball.y,
        wall.nx,
        wall.ny,
        Math.min(1, wallVn / 300),
      )
    }
    gs.ball.vx -= 1.9 * wallVn * wall.nx
    gs.ball.vy -= 1.9 * wallVn * wall.ny
  }

  if (pieceHit) {
    const pinch = pieceHit.nx * wall.nx + pieceHit.ny * wall.ny
    if (pinch > 0.25) {
      const tx = -wall.ny
      const ty = wall.nx
      const hitTangent = pieceHit.nx * tx + pieceHit.ny * ty
      const velocityTangent = gs.ball.vx * tx + gs.ball.vy * ty
      const sign =
        Math.abs(hitTangent) > 0.05
          ? Math.sign(hitTangent)
          : Math.sign(velocityTangent) || 1
      const escapeSpeed = 80 + pieceHit.rebound * 2.4

      gs.ball.x += tx * sign * 0.75
      gs.ball.y += ty * sign * 0.75
      gs.ball.vx += tx * sign * escapeSpeed
      gs.ball.vy += ty * sign * escapeSpeed
    }
  }

  return true
}

function clampBallInsideDuringRegroup(gs: GS) {
  if (gs.ball.x < REGROUP_BALL_X_MIN) {
    gs.ball.x = REGROUP_BALL_X_MIN
    gs.ball.vx = Math.max(0, gs.ball.vx)
  } else if (gs.ball.x > REGROUP_BALL_X_MAX) {
    gs.ball.x = REGROUP_BALL_X_MAX
    gs.ball.vx = Math.min(0, gs.ball.vx)
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
  const controls = settings.controls ?? DEFAULT_GAME_CONTROLS

  updateFx(gs, dt)
  for (const [key, remaining] of Object.entries(gs.collisionCooldowns)) {
    if (remaining <= dt) delete gs.collisionCooldowns[key]
    else gs.collisionCooldowns[key] = remaining - dt
  }

  // Decrement kick cooldown every tick
  if (gs.kickCooldown > 0) gs.kickCooldown = Math.max(0, gs.kickCooldown - dt)

  // ── KICK (Space) ────────────────────────────────────────────────────────────
  // Fires once per keydown (tracked via kickCooldown, not held-key detection).
  // Finds the piece face whose normal points closest to the ball, then applies
  // an impulse scaled by the piece's `power` attribute.
  if (
    !gs.finished &&
    gs.kickCooldown <= 0 &&
    gs.kickoffPhase === null &&
    input.keys.has(controls.kick ?? "Space")
  ) {
    const teamA = gs.pieces.filter((p) => p.team === "A")
    const kicker = teamA.find((p) => p.isPlayerControlled) ?? teamA[gs.selectedIdx ?? 0]
    if (kicker) {
      const kickResult = getPieceKickNormal(kicker, gs.ball.x, gs.ball.y)
      const KICK_REACH = PR + BR + 4        // contact distance: bola quase encostada na peça
      if (kickResult && kickResult.dist <= KICK_REACH) {
        // Base power from attribute (power 58-95 → multiplier 1.0-1.8)
        const powerAttr = settings.attrs[kicker.type].power
        const BASE_KICK_SPEED = 440         // pixels/s at power 58
        const kickSpeed = BASE_KICK_SPEED * (0.8 + powerAttr / 130)

        // Blend current ball velocity out (feel of a real kick, not a redirect)
        gs.ball.vx = gs.ball.vx * 0.15 + kickResult.nx * kickSpeed
        gs.ball.vy = gs.ball.vy * 0.15 + kickResult.ny * kickSpeed

        // Tiny kickback on the piece itself (mass ratio effect)
        kicker.vx -= kickResult.nx * kickSpeed * 0.06
        kicker.vy -= kickResult.ny * kickSpeed * 0.06

        // Separate ball from piece to avoid instant re-collision
        gs.ball.x += kickResult.nx * (BR + 2)
        gs.ball.y += kickResult.ny * (BR + 2)

        // Cooldown prevents kick-spam; short enough for rhythm play (~0.25s)
        gs.kickCooldown = 0.25

        // Visual flash on the kicker
        gs.kickFlashUntil = ts + 120  // ms

        // Spawn particles at contact point
        emitCollision(
          gs,
          `kick-${kicker.id}`,
          "ball-piece",
          0.6 + powerAttr / 200,
          gs.ball.x - kickResult.nx * BR,
          gs.ball.y - kickResult.ny * BR,
          kickResult.nx,
          kickResult.ny,
          settings.pieceColors[kicker.type],
          onSound,
        )
      }
    }
  }
  // ── END KICK ────────────────────────────────────────────────────────────────

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
      gs.finished = true
      gs.ball.vx = 0
      gs.ball.vy = 0
      gs.pieceVx = 0
      gs.pieceVy = 0
      gs.notification = "FIM DE JOGO"
      return gs
    }
  }

  const teamA = gs.pieces.filter((p) => p.team === "A")
  const sel = teamA.find((p) => p.isPlayerControlled) ?? teamA[gs.selectedIdx]
  const subDt = dt / SUBSTEPS
  const selId = sel?.id ?? -1

  for (let step = 0; step < SUBSTEPS; step++) {
    const aiSpinDirections = new Map<number, number>()
    if (!regrouping && gs.matchMode !== "training") {
      applyTacticalAi(gs, settings, subDt)
      for (const [pieceId, direction] of getTacticalAiSpinDirections(
        gs,
        settings,
      )) {
        aiSpinDirections.set(pieceId, direction)
      }
    }

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
          : (aiSpinDirections.get(piece.id) ?? 0)
      if (rotationDirection === 0) continue

      const maxRotationSpeed =
        Math.PI * (0.5 + settings.attrs[piece.type].speed / 40)
      const angularSpeed = rotationDirection * maxRotationSpeed
      piece.rot = (piece.rot ?? 0) + angularSpeed * subDt
      angularSpeeds.set(piece.id, angularSpeed)
    }

    if (!regrouping && gs.matchMode !== "training") {
      for (const intent of getTacticalAiKickIntents(gs)) {
        const kickResult = getPieceKickNormal(
          intent.piece,
          gs.ball.x,
          gs.ball.y,
        )
        if (!kickResult || kickResult.dist > PR + BR + 4) continue

        const aimX = intent.x - gs.ball.x
        const aimY = intent.y - gs.ball.y
        const aimDistance = Math.hypot(aimX, aimY) || 1
        const alignment =
          (kickResult.nx * aimX + kickResult.ny * aimY) / aimDistance
        let kickNx = kickResult.nx
        let kickNy = kickResult.ny
        if (alignment < 0.65) {
          if (intent.action !== "PASS") continue
          // A pass is a deliberate team action: if contact is legal but the shape
          // cannot align its face, guide the kick toward the chosen receiver.
          kickNx = aimX / aimDistance
          kickNy = aimY / aimDistance
        }

        const powerAttr = settings.attrs[intent.piece.type].power
        const kickSpeed = 440 * (0.8 + powerAttr / 130) *
          (intent.action === "PASS" ? 0.72 : 1)
        gs.ball.vx = gs.ball.vx * 0.15 + kickNx * kickSpeed
        gs.ball.vy = gs.ball.vy * 0.15 + kickNy * kickSpeed
        intent.piece.vx -= kickNx * kickSpeed * 0.06
        intent.piece.vy -= kickNy * kickSpeed * 0.06
        gs.ball.x += kickNx * (BR + 2)
        gs.ball.y += kickNy * (BR + 2)

        const decision = gs.aiDecisionStates[intent.piece.id]
        if (decision) {
          decision.kickCooldown = 0.65
          decision.kickIntentTimer = 0
          decision.action = "ATTACK"
          decision.pendingAction = "ATTACK"
          decision.decisionTimer = 0
        }
        if (intent.action === "PASS") {
          gs.aiPassReceiverId = intent.receiverId
          gs.aiPassTeam = intent.piece.team
          gs.aiPassTimer = 2.2
        }
        gs.aiKickFlashUntil[intent.piece.id] = ts + 140
        gs.aiKickCount++
        if (intent.action === "PASS") gs.aiPassCount++
        else gs.aiShotCount++
        emitCollision(
          gs,
          `ai-kick-${intent.piece.id}`,
          "ball-piece",
          0.6 + powerAttr / 200,
          gs.ball.x - kickResult.nx * BR,
          gs.ball.y - kickResult.ny * BR,
          kickResult.nx,
          kickResult.ny,
          settings.pieceColors[intent.piece.type],
          onSound,
        )
        break
      }
    }

    if (regrouping) {
      const conductor = gs.pieces.find(
        (piece) => piece.id === gs.kickoffConductorId,
      )
      let conductorRoute: Pick<GS["ball"], "x" | "y"> | null = null
      if (conductor && !gs.kickoffCarryComplete && !gs.kickoffCenterBraking) {
        const towardCenterX = VW / 2 - gs.ball.x
        const towardCenterY = VH / 2 - gs.ball.y
        gs.kickoffConductorCarrying =
          Math.hypot(conductor.x - gs.ball.x, conductor.y - gs.ball.y) <=
          KICKOFF_BALL_CONTACT_RADIUS

        let recovery =
          gs.kickoffRecovery ??
          planKickoffRecovery(conductor, gs.ball, settings)
        gs.kickoffRecovery = recovery
        const ballDisplacement = Math.hypot(
          gs.ball.x - recovery.plannedBallX,
          gs.ball.y - recovery.plannedBallY,
        )
        const centerDistance = Math.hypot(towardCenterX, towardCenterY)
        recovery.noProgressTime += subDt

        if (recovery.phase === "strike") {
          if (
            centerDistance <
            recovery.bestCenterDistance - KICKOFF_PROGRESS_DISTANCE
          ) {
            recovery.bestCenterDistance = centerDistance
            recovery.noProgressTime = 0
            if (ballDisplacement >= KICKOFF_REPLAN_BALL_DISTANCE) {
              recovery = planKickoffRecovery(conductor, gs.ball, settings)
              gs.kickoffRecovery = recovery
            }
          } else if (recovery.noProgressTime >= KICKOFF_STRIKE_RETRY_TIME) {
            recovery = planKickoffRecovery(conductor, gs.ball, settings)
            gs.kickoffRecovery = recovery
          }
        } else if (ballDisplacement >= KICKOFF_REPLAN_BALL_DISTANCE) {
          recovery = planKickoffRecovery(conductor, gs.ball, settings)
          gs.kickoffRecovery = recovery
        }

        const strikeTarget = {
          x: recovery.targetX,
          y: recovery.targetY,
          strikeAngle: recovery.strikeAngle,
          pieceRotation: recovery.pieceRotation,
        }
        conductorRoute = strikeTarget
        const repositionDistance = Math.hypot(
          strikeTarget.x - conductor.x,
          strikeTarget.y - conductor.y,
        )
        const conductorSpeed = Math.hypot(conductor.vx, conductor.vy)

        if (recovery.phase === "reposition") {
          if (
            repositionDistance <
            recovery.bestPieceDistance - KICKOFF_PROGRESS_DISTANCE
          ) {
            recovery.bestPieceDistance = repositionDistance
            recovery.noProgressTime = 0
          } else if (recovery.noProgressTime >= KICKOFF_REPOSITION_RETRY_TIME) {
            recovery = planKickoffRecovery(conductor, gs.ball, settings)
            gs.kickoffRecovery = recovery
          }
          if (
            repositionDistance <= KICKOFF_REPOSITION_ARRIVAL &&
            conductorSpeed <= 24
          ) {
            recovery.phase = "align"
            recovery.noProgressTime = 0
          } else {
            steerKickoffConductor(
              conductor,
              strikeTarget.x,
              strikeTarget.y,
              settings,
              subDt,
            )
          }
        }

        if (recovery.phase === "align") {
          if (repositionDistance > KICKOFF_REPOSITION_ARRIVAL * 1.5) {
            recovery.phase = "reposition"
            recovery.bestPieceDistance = repositionDistance
            recovery.noProgressTime = 0
          } else {
            steerKickoffConductor(
              conductor,
              strikeTarget.x,
              strikeTarget.y,
              settings,
              subDt,
            )
            const targetRotation = strikeTarget.pieceRotation
            const rotationDifference = Math.atan2(
              Math.sin(targetRotation - (conductor.rot ?? 0)),
              Math.cos(targetRotation - (conductor.rot ?? 0)),
            )
            if (conductorSpeed <= 18 && Math.abs(rotationDifference) <= 0.18) {
              recovery.phase = "strike"
              recovery.bestCenterDistance = centerDistance
              recovery.noProgressTime = 0
            }
          }
        }

        gs.kickoffConductorStriking = recovery.phase === "strike"
        if (recovery.phase === "strike") {
          steerKickoffConductor(
            conductor,
            strikeTarget.x,
            strikeTarget.y,
            settings,
            subDt,
            strikeTarget.strikeAngle,
          )
        }
      } else if (gs.kickoffCenterBraking) {
        gs.kickoffConductorStriking = false
        gs.kickoffConductorCarrying = false
      }

      for (const piece of gs.pieces) {
        if (piece.id === gs.kickoffConductorId && !gs.kickoffCarryComplete) {
          continue
        }
        const target = gs.kickoffTargets[piece.id]
        if (target) {
          const yieldTarget =
            conductor && conductorRoute && piece.id !== conductor.id
              ? getKickoffYieldTarget(
                  piece,
                  conductor,
                  conductorRoute.x,
                  conductorRoute.y,
                  gs.pieces,
                  gs.kickoffYieldSides[piece.id],
                )
              : null

          if (yieldTarget) {
            gs.kickoffYieldSides[piece.id] = yieldTarget.side
            steerPieceToTarget(
              piece,
              yieldTarget.x,
              yieldTarget.y,
              settings,
              subDt,
              gs.pieces,
            )
          } else {
            delete gs.kickoffYieldSides[piece.id]
            steerPieceToTarget(
              piece,
              target.x,
              target.y,
              settings,
              subDt,
              gs.pieces,
            )
          }
        }
      }
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

    const onWallImpact: ImpactCallback = (x, y, nx, ny, intensity) => {
      const isGoalLine = Math.abs(nx) > 0.9
      emitCollision(
        gs,
        isGoalLine ? "ball-goal-line" : "ball-wall",
        isGoalLine ? "goal-line" : "wall",
        intensity,
        x,
        y,
        nx,
        ny,
        isGoalLine ? "#ff3df2" : "#7df9ff",
        onSound,
      )
    }
    clampBallToWallWithPinchEscape(gs, null, onWallImpact)
    if (regrouping) clampBallInsideDuringRegroup(gs)

    for (let iter = 0; iter < 3; iter++) {
      let lastPieceHit: HitResult & { rebound: number } | null = null

      for (const p of gs.pieces) {
        if (!ballNearPieceAabb(p, gs.ball.x, gs.ball.y)) continue
        const hit = shapeBallHit(p, gs.ball.x, gs.ball.y)
        if (!hit) continue

        if (iter === 0) {
          const pvx = p.vx
          const pvy = p.vy
          const angularSpeed = angularSpeeds.get(p.id) ?? 0
          const contactX = gs.ball.x - hit.nx * BR - p.x
          const contactY = gs.ball.y - hit.ny * BR - p.y
          const surfaceVx = pvx - angularSpeed * contactY
          const surfaceVy = pvy + angularSpeed * contactX
          const relVn =
            (gs.ball.vx - surfaceVx) * hit.nx +
            (gs.ball.vy - surfaceVy) * hit.ny
          let normalImpulse = 0

          if (relVn < 0) {
            const baseRestitution = 0.4 + settings.attrs[p.type].rebound * 0.006
            const isKickoffConductor =
              regrouping &&
              gs.kickoffConductorStriking &&
              p.id === gs.kickoffConductorId
            const towardCenterX = VW / 2 - gs.ball.x
            const towardCenterY = VH / 2 - gs.ball.y
            const centerDistance = Math.hypot(towardCenterX, towardCenterY) || 1
            const strikeAlignment = isKickoffConductor
              ? Math.max(
                  0,
                  (hit.nx * towardCenterX + hit.ny * towardCenterY) /
                    centerDistance,
                )
              : 0
            const strikeBoost =
              strikeAlignment * (0.9 + settings.attrs[p.type].power / 300)
            const rest = Math.min(2.2, baseRestitution + strikeBoost)
            const pieceMass =
              PIECE_MASS_BASE * (0.8 + settings.attrs[p.type].power / 500)
            const impulse =
              -(1 + rest) * relVn * (pieceMass / (BALL_MASS + pieceMass))
            normalImpulse = impulse
            gs.ball.vx += impulse * hit.nx
            gs.ball.vy += impulse * hit.ny

            if (normalImpulse > 8) {
              emitCollision(
                gs,
                `ball-piece-${p.id}`,
                "ball-piece",
                normalImpulse / 140,
                gs.ball.x - hit.nx * BR,
                gs.ball.y - hit.ny * BR,
                hit.nx,
                hit.ny,
                settings.pieceColors[p.type],
                onSound,
              )
            }

            if (p.id === selId || gs.matchMode === "training") {
              p.vx -= impulse * hit.nx * (BALL_MASS / pieceMass) * 0.3
              p.vy -= impulse * hit.ny * (BALL_MASS / pieceMass) * 0.3
            }

            gs.ball.vx += pvx * 0.3
            gs.ball.vy += pvy * 0.3
          }

          if (p.role !== "GOL" && normalImpulse > 0 && angularSpeed !== 0) {
            const spinTransfer =
              normalImpulse *
              (settings.attrs[p.type].rebound / 100) *
              0.35 *
              Math.sign(angularSpeed)
            gs.ball.vx += -hit.ny * spinTransfer
            gs.ball.vy += hit.nx * spinTransfer
          }
        }

        gs.ball.x += hit.nx * (hit.pen + 0.02)
        gs.ball.y += hit.ny * (hit.pen + 0.02)
        lastPieceHit = { ...hit, rebound: settings.attrs[p.type].rebound }
      }

      clampBallToWallWithPinchEscape(gs, lastPieceHit, onWallImpact)
      if (regrouping) clampBallInsideDuringRegroup(gs)

      for (let i = 0; i < gs.pieces.length; i++) {
        for (let j = i + 1; j < gs.pieces.length; j++) {
          const p1 = gs.pieces[i]
          const p2 = gs.pieces[j]
          const hit = piecePieceHit(p1, p2)
          if (!hit) continue

          const m1 =
            PIECE_MASS_BASE * (0.8 + settings.attrs[p1.type].power / 500)
          const m2 =
            PIECE_MASS_BASE * (0.8 + settings.attrs[p2.type].power / 500)
          const total = m1 + m2

          if (iter === 0) {
            const v1x = p1.vx
            const v1y = p1.vy
            const v2x = p2.vx
            const v2y = p2.vy
            const relVn = (v1x - v2x) * hit.nx + (v1y - v2y) * hit.ny

            if (Math.abs(relVn) > 18) {
              emitCollision(
                gs,
                `pieces-${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`,
                "piece-piece",
                Math.abs(relVn) / 280,
                (p1.x + p2.x) / 2,
                (p1.y + p2.y) / 2,
                hit.nx,
                hit.ny,
                settings.pieceColors[p1.type],
                onSound,
              )
            }

            if (relVn < 0) {
              const impulse = (-(1 + 0.3) * relVn) / (1 / m1 + 1 / m2)
              p1.vx += (impulse / m1) * hit.nx
              p1.vy += (impulse / m1) * hit.ny
              p2.vx -= (impulse / m2) * hit.nx
              p2.vy -= (impulse / m2) * hit.ny
            }

            const spinningPiece =
              angularSpeeds.has(p1.id) && p1.role !== "GOL"
                ? p1
                : angularSpeeds.has(p2.id) && p2.role !== "GOL"
                  ? p2
                  : null
            if (spinningPiece) {
              const orientation = spinningPiece.id === p1.id ? 1 : -1
              const spinDirection = Math.sign(
                angularSpeeds.get(spinningPiece.id) ?? 0,
              )
              const power = settings.attrs[spinningPiece.type].power / 100
              const maxRotationSpeed =
                Math.PI * (0.5 + settings.attrs[spinningPiece.type].speed / 40)
              const rotationRatio = Math.min(
                1,
                Math.abs(angularSpeeds.get(spinningPiece.id) ?? 0) /
                  maxRotationSpeed,
              )
              const push = MOVE_SPD * 0.65 * power * rotationRatio * subDt
              const target = spinningPiece.id === p1.id ? p2 : p1
              target.vx += -hit.ny * orientation * spinDirection * push
              target.vy += hit.nx * orientation * spinDirection * push
            }
          }

          p1.x -= hit.nx * ((hit.pen / total) * m2)
          p1.y -= hit.ny * ((hit.pen / total) * m2)
          p2.x += hit.nx * ((hit.pen / total) * m1)
          p2.y += hit.ny * ((hit.pen / total) * m1)
        }
      }
    }

    for (const p of gs.pieces) {
      const res = clampPieceToField(p, 0, VW, 0, VH)
      if (res.hitX) p.vx = -p.vx * 0.4
      if (res.hitY) p.vy = -p.vy * 0.4
    }

    for (let iter = 0; iter < 3; iter++) {
      let lastPieceHit: HitResult & { rebound: number } | null = null

      for (const p of gs.pieces) {
        if (!ballNearPieceAabb(p, gs.ball.x, gs.ball.y)) continue
        const hit = shapeBallHit(p, gs.ball.x, gs.ball.y)
        if (!hit) continue
        gs.ball.x += hit.nx * (hit.pen + 0.1)
        gs.ball.y += hit.ny * (hit.pen + 0.1)
        lastPieceHit = { ...hit, rebound: settings.attrs[p.type].rebound }
      }

      clampBallToWallWithPinchEscape(gs, lastPieceHit, onWallImpact)
      if (regrouping) clampBallInsideDuringRegroup(gs)
    }

    clampBallToWallWithPinchEscape(gs, null, onWallImpact)
    if (regrouping) clampBallInsideDuringRegroup(gs)

    const sp = Math.hypot(gs.ball.vx, gs.ball.vy)
    if (sp > WALL_PINCH_VEL_CAP) {
      gs.ball.vx = (gs.ball.vx / sp) * WALL_PINCH_VEL_CAP
      gs.ball.vy = (gs.ball.vy / sp) * WALL_PINCH_VEL_CAP
    }

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

  if (!regrouping && gs.matchMode !== "training") updateStuckBallTelemetry(gs, dt)
  return gs
}
