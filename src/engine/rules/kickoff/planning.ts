import type { GameSettings, GS, KickoffRecoveryState } from "@/types"
import { BR, MOVE_SPD, PR, VH, VW, clamp } from "@/constants/physics"
import { getPieceVerts } from "@/engine/physics"
import {
  KICKOFF_AIM_ADJUSTMENTS,
  REGROUP_SPEED_FACTOR,
  KICKOFF_PURSUIT_SPEED_FACTOR,
  REGROUP_BALL_X_MIN,
  REGROUP_BALL_X_MAX,
} from "./constants"
function getKickoffStrikePose(
  piece: GS["pieces"][number],
  strikeAngle: number,
  currentRotation = piece.rot ?? 0,
) {
  if (piece.type === "circle") {
    return { rotation: currentRotation, offset: BR + PR + 4 }
  }

  let bestPose = {
    rotation: currentRotation,
    offset: BR + PR + 4,
  }
  let bestScore = Infinity
  for (let step = 0; step < 72; step++) {
    const rotation = (step * Math.PI) / 36
    const projections = getPieceVerts(piece.type, 0, 0, PR, rotation)
      .map(([x, y]) => x * Math.cos(strikeAngle) + y * Math.sin(strikeAngle))
      .sort((a, b) => b - a)
    const supportDistance = projections[0] ?? PR
    const faceGap = supportDistance - (projections[1] ?? supportDistance)
    const rotationDifference = Math.atan2(
      Math.sin(rotation - currentRotation),
      Math.cos(rotation - currentRotation),
    )
    const score =
      supportDistance * 0.15 + faceGap * 3 + Math.abs(rotationDifference) * 4
    if (score < bestScore) {
      bestScore = score
      bestPose = {
        rotation,
        offset: BR + supportDistance + 4,
      }
    }
  }
  return bestPose
}

/** Kinematic estimate of travel time under constant acceleration to max speed. */
function estimateTravelTime(
  distance: number,
  maxSpeed: number,
  acceleration: number,
) {
  if (distance <= 0) return 0
  const accelerationDistance = (maxSpeed * maxSpeed) / (2 * acceleration)
  if (distance <= accelerationDistance * 2) {
    return 2 * Math.sqrt(distance / acceleration)
  }
  return distance / maxSpeed + maxSpeed / acceleration
}

/**
 * Estimate how long it will take a conductor piece to reach the strike position,
 * align to the required rotation, and then deliver the ball to the centre.
 */
export function estimateKickoffCompletionTime(
  conductor: GS["pieces"][number],
  ball: GS["ball"],
  target: Pick<GS["ball"], "x" | "y"> & {
    strikeAngle: number
    pieceRotation: number
  },
  settings: GameSettings,
  deliveryDistance = Math.hypot(VW / 2 - ball.x, VH / 2 - ball.y),
  deliverySpeedFactor = 0.85,
) {
  const attrs = settings.attrs[conductor.type]
  const maxSpeed =
    MOVE_SPD *
    (0.5 + attrs.speed / 200) *
    REGROUP_SPEED_FACTOR *
    KICKOFF_PURSUIT_SPEED_FACTOR
  const acceleration = maxSpeed * 10
  const travelTime = estimateTravelTime(
    Math.hypot(target.x - conductor.x, target.y - conductor.y),
    maxSpeed,
    acceleration,
  )
  const rotationDifference = Math.atan2(
    Math.sin(target.pieceRotation - (conductor.rot ?? 0)),
    Math.cos(target.pieceRotation - (conductor.rot ?? 0)),
  )
  const rotationSpeed = Math.PI * (0.5 + attrs.speed / 40)
  const centerAngle = Math.atan2(VH / 2 - ball.y, VW / 2 - ball.x)
  const directionAlignment = Math.cos(target.strikeAngle - centerAngle)
  const deliverySpeed = Math.max(
    80,
    maxSpeed * deliverySpeedFactor * directionAlignment,
  )

  return (
    travelTime +
    Math.abs(rotationDifference) / rotationSpeed +
    deliveryDistance / deliverySpeed
  )
}

/**
 * Find the best angle-adjusted strike target for a conductor to kick the ball
 * toward the centre.  Also checks wall-bounce paths for balls near the edges.
 */
export function getKickoffStrikeTarget(
  conductor: GS["pieces"][number],
  ball: GS["ball"],
  settings: GameSettings,
) {
  const centerX = VW / 2 - ball.x
  const centerY = VH / 2 - ball.y
  const centerAngle = Math.atan2(centerY, centerX)
  let bestTarget: Pick<GS["ball"], "x" | "y"> & {
    strikeAngle: number
    pieceRotation: number
  } | null = null
  let bestTime = Infinity

  for (const adjustment of KICKOFF_AIM_ADJUSTMENTS) {
    const strikeAngle = centerAngle + adjustment
    const directionX = Math.cos(strikeAngle)
    const directionY = Math.sin(strikeAngle)
    const pose = getKickoffStrikePose(conductor, strikeAngle)
    const strikeOffset = pose.offset
    const targetX = ball.x - directionX * strikeOffset
    const targetY = ball.y - directionY * strikeOffset
    if (
      targetX < PR ||
      targetX > VW - PR ||
      targetY < PR ||
      targetY > VH - PR
    ) {
      continue
    }

    const completionTime = estimateKickoffCompletionTime(
      conductor,
      ball,
      { x: targetX, y: targetY, strikeAngle, pieceRotation: pose.rotation },
      settings,
    )
    if (completionTime < bestTime) {
      bestTime = completionTime
      bestTarget = {
        x: targetX,
        y: targetY,
        strikeAngle,
        pieceRotation: pose.rotation,
      }
    }
  }

  // Wall-bounce paths for balls stuck near the edges
  const walls = [
    {
      x: 2 * REGROUP_BALL_X_MIN - VW / 2,
      y: VH / 2,
      near: ball.x - REGROUP_BALL_X_MIN,
    },
    {
      x: 2 * REGROUP_BALL_X_MAX - VW / 2,
      y: VH / 2,
      near: REGROUP_BALL_X_MAX - ball.x,
    },
    { x: VW / 2, y: -VH / 2, near: ball.y - BR },
    { x: VW / 2, y: 2 * (VH - BR) - VH / 2, near: VH - BR - ball.y },
  ]
  for (const wall of walls) {
    const strikeAngle = Math.atan2(wall.y - ball.y, wall.x - ball.x)
    const pose = getKickoffStrikePose(conductor, strikeAngle)
    const strikeOffset = pose.offset
    if (wall.near > strikeOffset * 1.5) continue
    const directionX = wall.x - ball.x
    const directionY = wall.y - ball.y
    const directionLength = Math.hypot(directionX, directionY)
    if (directionLength < 0.001) continue
    const targetX = ball.x - (directionX / directionLength) * strikeOffset
    const targetY = ball.y - (directionY / directionLength) * strikeOffset
    if (
      targetX < PR ||
      targetX > VW - PR ||
      targetY < PR ||
      targetY > VH - PR
    ) {
      continue
    }

    const wallDistance = Math.hypot(ball.x - wall.x, ball.y - wall.y)
    const reflectedDeliveryDistance =
      wallDistance + Math.hypot(VW / 2 - wall.x, VH / 2 - wall.y)
    const completionTime = estimateKickoffCompletionTime(
      conductor,
      ball,
      { x: targetX, y: targetY, strikeAngle, pieceRotation: pose.rotation },
      settings,
      reflectedDeliveryDistance,
      0.65,
    )
    if (completionTime < bestTime) {
      bestTime = completionTime
      bestTarget = {
        x: targetX,
        y: targetY,
        strikeAngle,
        pieceRotation: pose.rotation,
      }
    }
  }

  if (bestTarget) return bestTarget
  const pose = getKickoffStrikePose(conductor, centerAngle)
  return {
    x: clamp(ball.x - Math.cos(centerAngle) * pose.offset, PR, VW - PR),
    y: clamp(ball.y - Math.sin(centerAngle) * pose.offset, PR, VH - PR),
    strikeAngle: centerAngle,
    pieceRotation: pose.rotation,
  }
}

/** Build a fresh KickoffRecoveryState for a conductor aiming at the current ball. */
export function planKickoffRecovery(
  conductor: GS["pieces"][number],
  ball: GS["ball"],
  settings: GameSettings,
): KickoffRecoveryState {
  const target = getKickoffStrikeTarget(conductor, ball, settings)
  return {
    phase: "reposition",
    targetX: target.x,
    targetY: target.y,
    strikeAngle: target.strikeAngle,
    pieceRotation: target.pieceRotation,
    plannedBallX: ball.x,
    plannedBallY: ball.y,
    bestCenterDistance: Math.hypot(VW / 2 - ball.x, VH / 2 - ball.y),
    bestPieceDistance: Math.hypot(
      target.x - conductor.x,
      target.y - conductor.y,
    ),
    noProgressTime: 0,
  }
}

/** Return the target rotation for the conductor during the regroup phase. */
export function getKickoffFacingRotation(
  piece: GS["pieces"][number],
  ball: GS["ball"],
  recovery: KickoffRecoveryState | null,
  settings: GameSettings,
) {
  const angle =
    recovery?.phase === "reposition"
      ? Math.atan2(ball.y - piece.y, ball.x - piece.x)
      : (recovery?.strikeAngle ??
        getKickoffStrikeTarget(piece, ball, settings).strikeAngle)
  return recovery?.phase === "reposition"
    ? angle
    : (recovery?.pieceRotation ?? getKickoffStrikePose(piece, angle).rotation)
}

/** Accelerate the conductor toward a target, optionally in strike direction. */
