import type { GameSettings, GS, PieceType, SlotPiece } from "@/types"

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
  type HitResult,
  piecePieceHit,
  shapeBallHit,
} from "@/engine/physics"

import { applyTacticalAi, getTacticalAiSpinDirections } from "@/engine/ai"
import { makeGS } from "@/engine/state"

export interface MatchInputState {
  keys: ReadonlySet<string>
}

const BALL_STUCK_RADIUS = 2.5 * PR
const BALL_STUCK_DURATION = 1.5
const BALL_RELEASE_IMPULSE = MOVE_SPD * 1.4

function updateFx(gs: GS, dt: number) {
  const drag = Math.exp(-3.2 * dt)

  gs.particles = gs.particles.filter((p) => {
    p.life -= dt * 1000
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.vr * dt
    return p.life > 0
  })

  gs.shockwaves = gs.shockwaves.filter((w) => {
    w.life -= dt * 1000
    return w.life > 0
  })
}

export function resetKickoff(gs: GS, playerSlots: SlotPiece[]) {
  const fresh = makeGS(playerSlots, gs.opponentSlots, gs.matchMode)
  const freshA = fresh.pieces.filter((p) => p.team === "A")
  const freshB = fresh.pieces.filter((p) => p.team === "B")

  gs.ball = { x: VW / 2, y: VH / 2, vx: 0, vy: 0 }

  gs.pieces
    .filter((p) => p.team === "A")
    .forEach((p, i) => {
      if (!freshA[i]) return
      p.x = freshA[i].x
      p.y = freshA[i].y
      p.vx = 0
      p.vy = 0
      p.rot = freshA[i].rot
      p.type = freshA[i].type
      p.role = freshA[i].role
      p.isPlayerControlled = i === gs.selectedIdx
    })

  gs.pieces
    .filter((p) => p.team === "B")
    .forEach((p, i) => {
      if (!freshB[i]) return
      p.x = freshB[i].x
      p.y = freshB[i].y
      p.vx = 0
      p.vy = 0
      p.rot = freshB[i].rot
      p.type = freshB[i].type
      p.role = freshB[i].role
      p.isPlayerControlled = false
    })

  gs.notification = null
  gs.goalCooldown = 0
  gs.finished = false
  gs.pieceVx = 0
  gs.pieceVy = 0
  gs.goalColor = null
  gs.pendingResetScorerA = null
  gs.stuckBallX = VW / 2
  gs.stuckBallY = VH / 2
  gs.stuckBallDuration = 0
  gs.pieceMotionWatch = {}
  gs.aiDecisionStates = {}
}

function beginGoal(
  gs: GS,
  settings: GameSettings,
  scorerA: boolean,
  goalX: number,
  goalY: number,
  ts: number,
) {
  const color = scorerA ? settings.teamA.color : settings.teamB.color
  const towardCenter = scorerA ? -1 : 1

  gs.ball = { x: clamp(goalX, 0, VW), y: clamp(goalY, 0, VH), vx: 0, vy: 0 }
  gs.notification = "GOL!"
  gs.notifEnd = ts + 2000
  gs.goalCooldown = 2000
  gs.goalColor = color
  gs.pendingResetScorerA = scorerA
  gs.stuckBallDuration = 0
  gs.shakeUntil = ts + 300
  gs.flashUntil = ts + 1000
  gs.shockwaves.push({ x: gs.ball.x, y: gs.ball.y, life: 760, ttl: 760, color })

  const shapes: PieceType[] = ["triangle", "square", "diamond", "pentagon", "line"]
  const count = 24 + Math.floor(Math.random() * 7)

  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * Math.PI * 0.95
    const angle = (towardCenter > 0 ? 0 : Math.PI) + spread
    const speed = 270 + Math.random() * 620
    const ttl = 900 + Math.random() * 520

    gs.particles.push({
      x: gs.ball.x,
      y: gs.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: ttl,
      ttl,
      size: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 10,
      type: shapes[Math.floor(Math.random() * shapes.length)],
      color,
    })
  }
}

function clampBallToWallWithPinchEscape(
  gs: GS,
  pieceHit: (HitResult & { rebound: number }) | null,
) {
  const wall = ballRoundedWall(gs.ball.x, gs.ball.y, GOAL_Y0, GOAL_Y1)
  if (!wall.collided) return false

  gs.ball.x = wall.x
  gs.ball.y = wall.y

  const wallVn = gs.ball.vx * wall.nx + gs.ball.vy * wall.ny
  if (wallVn > 0) {
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

function releaseStuckBall(gs: GS, dt: number) {
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
  if (gs.stuckBallDuration < BALL_STUCK_DURATION) return

  let dx = VW / 2 - gs.ball.x
  let dy = VH / 2 - gs.ball.y
  let distanceToCenter = Math.hypot(dx, dy)
  if (distanceToCenter < 0.001) {
    dx = 1
    dy = 0
    distanceToCenter = 1
  }

  gs.ball.vx += (dx / distanceToCenter) * BALL_RELEASE_IMPULSE
  gs.ball.vy += (dy / distanceToCenter) * BALL_RELEASE_IMPULSE
  gs.stuckBallX = gs.ball.x
  gs.stuckBallY = gs.ball.y
  gs.stuckBallDuration = 0
}

export function stepMatchSimulation({
  gs,
  settings,
  input,
  playerSlots,
  dt,
  ts,
}: {
  gs: GS
  settings: GameSettings
  input: MatchInputState
  playerSlots: SlotPiece[]
  dt: number
  ts: number
}): GS {
  if (gs.paused || gs.finished) return gs

  updateFx(gs, dt)

  if (gs.goalCooldown > 0) {
    gs.goalCooldown -= dt * 1000
    if (gs.goalCooldown <= 0 || ts > gs.notifEnd) resetKickoff(gs, playerSlots)
    return gs
  }

  gs.notification = null
  if (gs.matchMode === "normal") {
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
    if (gs.matchMode !== "training") {
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
      const rotationDirection = piece.id === selId
        ? (input.keys.has("e") ? 1 : 0) - (input.keys.has("q") ? 1 : 0)
        : (aiSpinDirections.get(piece.id) ?? 0)
      if (rotationDirection === 0) continue

      const maxRotationSpeed =
        Math.PI * (0.5 + settings.attrs[piece.type].speed / 40)
      const angularSpeed = rotationDirection * maxRotationSpeed
      piece.rot = (piece.rot ?? 0) + angularSpeed * subDt
      angularSpeeds.set(piece.id, angularSpeed)
    }

    if (sel) {
      const speedAttr = settings.attrs[sel.type].speed
      let dx = 0
      let dy = 0
      if (input.keys.has("w") || input.keys.has("ArrowUp")) dy -= 1
      if (input.keys.has("s") || input.keys.has("ArrowDown")) dy += 1
      if (input.keys.has("a") || input.keys.has("ArrowLeft")) dx -= 1
      if (input.keys.has("d") || input.keys.has("ArrowRight")) dx += 1

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
      if (gs.matchMode === "training" && p.id !== selId) {
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

    if (gs.ball.x - BR <= 0 && gs.ball.y >= GOAL_Y0 && gs.ball.y <= GOAL_Y1) {
      gs.scoreB++
      beginGoal(gs, settings, false, 0, gs.ball.y, ts)
      return gs
    }

    if (gs.ball.x + BR >= VW && gs.ball.y >= GOAL_Y0 && gs.ball.y <= GOAL_Y1) {
      gs.scoreA++
      beginGoal(gs, settings, true, VW, gs.ball.y, ts)
      return gs
    }

    clampBallToWallWithPinchEscape(gs, null)

    for (let iter = 0; iter < 3; iter++) {
      let lastPieceHit: (HitResult & { rebound: number }) | null = null

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
            const rest = 0.4 + settings.attrs[p.type].rebound * 0.006
            const pieceMass =
              PIECE_MASS_BASE * (0.8 + settings.attrs[p.type].power / 500)
            const impulse = -(1 + rest) * relVn * (pieceMass / (BALL_MASS + pieceMass))
            normalImpulse = impulse
            gs.ball.vx += impulse * hit.nx
            gs.ball.vy += impulse * hit.ny

            if (p.id === selId || gs.matchMode === "training") {
              p.vx -= impulse * hit.nx * (BALL_MASS / pieceMass) * 0.3
              p.vy -= impulse * hit.ny * (BALL_MASS / pieceMass) * 0.3
            }

            gs.ball.vx += pvx * 0.3
            gs.ball.vy += pvy * 0.3
          }

          if (
            p.role !== "GOL" &&
            normalImpulse > 0 &&
            angularSpeed !== 0
          ) {
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

      clampBallToWallWithPinchEscape(gs, lastPieceHit)

      for (let i = 0; i < gs.pieces.length; i++) {
        for (let j = i + 1; j < gs.pieces.length; j++) {
          const p1 = gs.pieces[i]
          const p2 = gs.pieces[j]
          const hit = piecePieceHit(p1, p2)
          if (!hit) continue

          const m1 = PIECE_MASS_BASE * (0.8 + settings.attrs[p1.type].power / 500)
          const m2 = PIECE_MASS_BASE * (0.8 + settings.attrs[p2.type].power / 500)
          const total = m1 + m2

          if (iter === 0) {
            const v1x = p1.vx
            const v1y = p1.vy
            const v2x = p2.vx
            const v2y = p2.vy
            const relVn = (v1x - v2x) * hit.nx + (v1y - v2y) * hit.ny

            if (relVn < 0) {
              const impulse = -(1 + 0.3) * relVn / (1 / m1 + 1 / m2)
              p1.vx += (impulse / m1) * hit.nx
              p1.vy += (impulse / m1) * hit.ny
              p2.vx -= (impulse / m2) * hit.nx
              p2.vy -= (impulse / m2) * hit.ny
            }

            const spinningPiece = angularSpeeds.has(p1.id) && p1.role !== "GOL"
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
              target.vx +=
                -hit.ny * orientation * spinDirection * push
              target.vy +=
                hit.nx * orientation * spinDirection * push
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
      let lastPieceHit: (HitResult & { rebound: number }) | null = null

      for (const p of gs.pieces) {
        if (!ballNearPieceAabb(p, gs.ball.x, gs.ball.y)) continue
        const hit = shapeBallHit(p, gs.ball.x, gs.ball.y)
        if (!hit) continue
        gs.ball.x += hit.nx * (hit.pen + 0.1)
        gs.ball.y += hit.ny * (hit.pen + 0.1)
        lastPieceHit = { ...hit, rebound: settings.attrs[p.type].rebound }
      }

      clampBallToWallWithPinchEscape(gs, lastPieceHit)
    }

    clampBallToWallWithPinchEscape(gs, null)

    const sp = Math.hypot(gs.ball.vx, gs.ball.vy)
    if (sp > WALL_PINCH_VEL_CAP) {
      gs.ball.vx = (gs.ball.vx / sp) * WALL_PINCH_VEL_CAP
      gs.ball.vy = (gs.ball.vy / sp) * WALL_PINCH_VEL_CAP
    }
  }

  releaseStuckBall(gs, dt)
  return gs
}
