import type { GameSettings, GS } from "@/types"
import { MOVE_SPD, PR, VH, VW, clamp } from "@/constants/physics"
import {
  KICKOFF_PURSUIT_SPEED_FACTOR,
  REGROUP_SPEED_FACTOR,
  STEERING_LOOKAHEAD,
  STEERING_SAFE_DISTANCE,
} from "./constants"
export function steerKickoffConductor(
  conductor: GS["pieces"][number],
  targetX: number,
  targetY: number,
  settings: GameSettings,
  dt: number,
  strikeAngle?: number,
): void {
  const deltaX = targetX - conductor.x
  const deltaY = targetY - conductor.y
  const distance = Math.hypot(deltaX, deltaY)
  const maxSpeed =
    MOVE_SPD *
    (0.5 + settings.attrs[conductor.type].speed / 200) *
    REGROUP_SPEED_FACTOR *
    KICKOFF_PURSUIT_SPEED_FACTOR
  const acceleration = maxSpeed * 10
  const isStriking = strikeAngle !== undefined
  const desiredSpeed = isStriking
    ? maxSpeed
    : Math.min(maxSpeed, Math.sqrt(1.25 * acceleration * distance))
  const desiredVx = isStriking
    ? Math.cos(strikeAngle) * desiredSpeed
    : distance > 0.001
      ? (deltaX / distance) * desiredSpeed
      : 0
  const desiredVy = isStriking
    ? Math.sin(strikeAngle) * desiredSpeed
    : distance > 0.001
      ? (deltaY / distance) * desiredSpeed
      : 0
  const changeX = desiredVx - conductor.vx
  const changeY = desiredVy - conductor.vy
  const changeLength = Math.hypot(changeX, changeY)
  const maxChange = acceleration * dt
  const scale = changeLength > maxChange ? maxChange / changeLength : 1

  conductor.vx += changeX * scale
  conductor.vy += changeY * scale
}

/**
 * Steer any regroup piece toward a target while avoiding obstacles.
 * Uses a discretised direction search (23 candidates at 15° increments).
 */
export function steerPieceToTarget(
  piece: GS["pieces"][number],
  targetX: number,
  targetY: number,
  settings: GameSettings,
  dt: number,
  obstacles: GS["pieces"] = [],
  prioritizeProgress = false,
): void {
  const targetDx = targetX - piece.x
  const targetDy = targetY - piece.y
  let dx = targetDx
  let dy = targetDy
  const distance = Math.hypot(dx, dy)
  if (distance > 0.001) {
    dx /= distance
    dy /= distance
  }

  const maxSpeed =
    MOVE_SPD *
    (0.5 + settings.attrs[piece.type].speed / 200) *
    REGROUP_SPEED_FACTOR *
    (prioritizeProgress ? KICKOFF_PURSUIT_SPEED_FACTOR : 1)
  let bestScore = Number.NEGATIVE_INFINITY
  const bestDirection = { x: dx, y: dy }
  const currentSpeed = Math.hypot(piece.vx, piece.vy)
  const currentDirectionX = currentSpeed > 1 ? piece.vx / currentSpeed : dx
  const currentDirectionY = currentSpeed > 1 ? piece.vy / currentSpeed : dy

  for (let angle = -165; angle <= 165; angle += 15) {
    const radians = (angle * Math.PI) / 180
    const candidateX = dx * Math.cos(radians) - dy * Math.sin(radians)
    const candidateY = dx * Math.sin(radians) + dy * Math.cos(radians)
    let score =
      (candidateX * dx + candidateY * dy) * (prioritizeProgress ? 78 : 45) +
      (candidateX * currentDirectionX + candidateY * currentDirectionY) *
        (prioritizeProgress ? 3 : 6)
    const travelX = candidateX * maxSpeed
    const travelY = candidateY * maxSpeed

    for (const obstacle of obstacles) {
      if (obstacle.id === piece.id) continue

      const offsetX = obstacle.x - piece.x
      const offsetY = obstacle.y - piece.y
      const relativeVx = obstacle.vx - travelX
      const relativeVy = obstacle.vy - travelY
      const relativeSpeedSquared = relativeVx ** 2 + relativeVy ** 2
      const closestTime =
        relativeSpeedSquared > 0.001
          ? clamp(
              -(offsetX * relativeVx + offsetY * relativeVy) /
                relativeSpeedSquared,
              0,
              STEERING_LOOKAHEAD,
            )
          : 0
      const closestX = offsetX + relativeVx * closestTime
      const closestY = offsetY + relativeVy * closestTime
      const closestDistance = Math.hypot(closestX, closestY)
      const collisionRisk = clamp(
        (STEERING_SAFE_DISTANCE - closestDistance) / STEERING_SAFE_DISTANCE,
        0,
        1,
      )
      score -= collisionRisk ** 2 * (prioritizeProgress ? 48 : 110)

      const currentDistance = Math.hypot(offsetX, offsetY)
      if (currentDistance < STEERING_SAFE_DISTANCE) {
        const escapeTime = 0.2
        const escapedX = offsetX + relativeVx * escapeTime
        const escapedY = offsetY + relativeVy * escapeTime
        score +=
          clamp(
            Math.hypot(escapedX, escapedY) - currentDistance,
            -STEERING_SAFE_DISTANCE,
            STEERING_SAFE_DISTANCE,
          ) * 0.8
      }
    }

    const predictedX = piece.x + travelX * STEERING_LOOKAHEAD
    const predictedY = piece.y + travelY * STEERING_LOOKAHEAD
    const outsideDistance =
      Math.max(PR - predictedX, 0) +
      Math.max(predictedX - (VW - PR), 0) +
      Math.max(PR - predictedY, 0) +
      Math.max(predictedY - (VH - PR), 0)
    score -= outsideDistance * 3

    if (score > bestScore) {
      bestScore = score
      bestDirection.x = candidateX
      bestDirection.y = candidateY
    }
  }

  dx = bestDirection.x
  dy = bestDirection.y
  const targetAlignment =
    dx * (distance > 0.001 ? targetDx / distance : 0) +
    dy * (distance > 0.001 ? targetDy / distance : 0)
  const movementSpeed = maxSpeed
  const desiredSpeed = prioritizeProgress
    ? distance > 8
      ? movementSpeed
      : (movementSpeed * distance) / 8
    : targetAlignment < 0.9
      ? movementSpeed * 0.75
      : Math.min(movementSpeed, distance * 3.5)
  const targetVx = distance > 0.001 ? dx * desiredSpeed : 0
  const targetVy = distance > 0.001 ? dy * desiredSpeed : 0
  const acceleration = movementSpeed * (prioritizeProgress ? 18 : 8)

  piece.vx += (targetVx - piece.vx) * Math.min(1, acceleration * dt)
  piece.vy += (targetVy - piece.vy) * Math.min(1, acceleration * dt)
}

/**
 * Find a safe lateral yield target for a non-conductor piece that is blocking
 * the conductor's path to the ball.
 */
