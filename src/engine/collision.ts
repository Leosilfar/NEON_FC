import type { GameSettings, GS, MatchSound } from "@/types"
import {
  BALL_MASS,
  BR,
  GOAL_Y0,
  GOAL_Y1,
  MOVE_SPD,
  WALL_PINCH_VEL_CAP,
  PIECE_MASS_BASE,
  VH,
  VW,
} from "@/constants/physics"
import {
  ballNearPieceAabb,
  ballRoundedWall,
  piecePieceHit,
  shapeBallHit,
  type HitResult,
} from "@/engine/physics"
import { emitCollision } from "@/engine/fx/particles"
import {
  REGROUP_BALL_X_MAX,
  REGROUP_BALL_X_MIN,
} from "@/engine/rules/kickoff/constants"
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

export function clampBallInsideDuringRegroup(gs: GS) {
  if (gs.ball.x < REGROUP_BALL_X_MIN) {
    gs.ball.x = REGROUP_BALL_X_MIN

    gs.ball.vx = Math.max(0, gs.ball.vx)
  } else if (gs.ball.x > REGROUP_BALL_X_MAX) {
    gs.ball.x = REGROUP_BALL_X_MAX

    gs.ball.vx = Math.min(0, gs.ball.vx)
  }
}

export function resolveMatchCollisions(
  gs: GS,
  settings: GameSettings,
  angularSpeeds: Map<number, number>,
  selId: number,
  subDt: number,
  regrouping: boolean,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
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
          (gs.ball.vx - surfaceVx) * hit.nx + (gs.ball.vy - surfaceVy) * hit.ny

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

    const piecesMayBlockRegroup = !(regrouping && gs.kickoffCarryComplete)

    if (piecesMayBlockRegroup) for (let i = 0; i < gs.pieces.length; i++) {
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
}

export function correctResidualBallOverlaps(
  gs: GS,
  settings: GameSettings,
  regrouping: boolean,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
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
}
