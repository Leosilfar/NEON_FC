import type { GPiece } from "@/types"
import { MOVE_SPD, PR } from "@/constants/physics"

interface SteeringInput {
  targetX: number
  targetY: number
  maxSpeed: number
  acceleration: number
  dt: number
  pieces: GPiece[]
  separationStrength: number
}

/** Continuous movement layer: arrival and separation run every physics step. */
export function steerToTarget(piece: GPiece, input: SteeringInput) {
  const dx = input.targetX - piece.x
  const dy = input.targetY - piece.y
  const distance = Math.hypot(dx, dy)
  const arrival = Math.min(1, Math.max(0.12, distance / 115))
  let separationX = 0
  let separationY = 0

  for (const other of input.pieces) {
    if (other.id === piece.id) continue
    const awayX = piece.x - other.x
    const awayY = piece.y - other.y
    const awayDistance = Math.hypot(awayX, awayY)
    const radius = PR * (other.team === piece.team ? 5 : 3)
    if (awayDistance <= 0.001 || awayDistance >= radius) continue
    const weight =
      ((radius - awayDistance) / radius) *
      (other.team === piece.team ? 1 : 0.65)
    separationX += (awayX / awayDistance) * weight
    separationY += (awayY / awayDistance) * weight
  }

  const desiredVx =
    (distance > 0.001 ? (dx / distance) * input.maxSpeed * arrival : 0) +
    separationX * 125 * input.separationStrength
  const desiredVy =
    (distance > 0.001 ? (dy / distance) * input.maxSpeed * arrival : 0) +
    separationY * 125 * input.separationStrength
  const blend = Math.min(1, input.acceleration * input.dt)
  piece.vx += (desiredVx - piece.vx) * blend
  piece.vy += (desiredVy - piece.vy) * blend

  const speed = Math.hypot(piece.vx, piece.vy)
  if (speed > input.maxSpeed) {
    piece.vx = (piece.vx / speed) * input.maxSpeed
    piece.vy = (piece.vy / speed) * input.maxSpeed
  }
}

export function getAiMaxSpeed(
  piece: GPiece,
  aggressive: boolean,
  speedAttribute: number,
) {
  return (
    MOVE_SPD *
    (aggressive ? 0.56 + speedAttribute / 170 : 0.28 + speedAttribute / 260) *
    (piece.role === "GOL" ? 1.35 : 1)
  )
}
