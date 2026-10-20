/**
 * Match flow — state transitions that change the score or restart play.
 *
 * Owns:
 *   • beginGoal()           — triggered when ball crosses a goal line
 *   • beginKickoffRegroup() — triggered after a goal or match start
 *   • All kickoff conductor helpers (strike pose, steering, yield, recovery)
 *
 * Design intent — FSM states:
 *   INTRO  ──►  LIVE  ──►  GOAL_SCORED  ──►  REGROUP  ──►  COUNTDOWN  ──►  LIVE
 *
 * The live GS.kickoffPhase encodes this:
 *   null      = LIVE
 *   "regroup" = REGROUP (conductor carries ball to centre)
 *   "intro"   = COUNTDOWN (lights-on sequence before whistle)
 *
 * All functions mutate GS in place (same convention as the rest of the engine).
 */

import type {
  GameSettings,
  GS,
  KickoffRecoveryState,
  MatchSound,
  PieceType,
  SlotPiece,
  Team,
} from "@/types"
import { BR, MOVE_SPD, PR, VH, VW, clamp } from "@/constants/physics"
import { getPieceVerts } from "@/engine/physics"
import { makeGS } from "@/engine/state"
import { roll } from "@/engine/rng"

// ─── Kickoff constants ──────────────────────────────────────────────────────
// Exported so stepMatchSimulation can reference them inside the substep loop.

export const REGROUP_SPEED_FACTOR = 0.95
export const REGROUP_ARRIVAL_DISTANCE = 8
export const CENTER_CIRCLE_RADIUS = VH * 0.18

const RESET_KICKOFF_DURATION = 2.2    // unused currently, reserved for intro
const STEERING_LOOKAHEAD = 0.65
const STEERING_SAFE_DISTANCE = PR * 2 + 6
const KICKOFF_YIELD_DISTANCE = PR * 6
const KICKOFF_YIELD_LATERAL_LIMIT = PR * 2.2
const KICKOFF_YIELD_OFFSET = PR * 2.6
export const KICKOFF_BALL_CONTACT_RADIUS = PR + BR + 5
export const KICKOFF_PURSUIT_SPEED_FACTOR = 1.6
export const KICKOFF_REPOSITION_ARRIVAL = 8
export const KICKOFF_REPLAN_BALL_DISTANCE = 20
export const KICKOFF_PROGRESS_DISTANCE = 5
export const KICKOFF_STRIKE_RETRY_TIME = 0.4
export const KICKOFF_REPOSITION_RETRY_TIME = 0.65
const KICKOFF_AIM_ADJUSTMENTS = [-0.24, -0.12, 0, 0.12, 0.24]
export const REGROUP_BALL_X_MIN = PR + BR + 2
export const REGROUP_BALL_X_MAX = VW - PR - BR - 2

// Suppress TS "declared but never read" on reserved constant
void RESET_KICKOFF_DURATION

// ─── Goal event ─────────────────────────────────────────────────────────────

/**
 * Trigger a goal: freeze the ball, emit particles + shockwave, set the
 * notification, and arm the goal-cooldown that holds play still until the
 * regroup animation begins.
 *
 * Caller is responsible for incrementing the score before calling this.
 *
 * @param ts - current wall-clock timestamp in ms (for notifEnd / shakeUntil)
 */
export function beginGoal(
  gs: GS,
  settings: GameSettings,
  scorerA: boolean,
  goalX: number,
  goalY: number,
  ts: number,
  onSound?: (cue: MatchSound, intensity?: number) => void,
): void {
  const color = scorerA ? settings.teamA.color : settings.teamB.color
  const towardCenter = scorerA ? -1 : 1

  gs.ball = { x: clamp(goalX, 0, VW), y: clamp(goalY, 0, VH), vx: 0, vy: 0 }
  gs.ball.vx = towardCenter * 110
  gs.notification = "GOL!"
  gs.notifEnd = ts + 2000
  gs.goalCooldown = 1.8   // seconds — matches the engine's simulation-time unit
  gs.goalColor = color
  gs.pendingResetScorerA = scorerA
  gs.stuckBallDuration = 0
  gs.shakeUntil = ts + 300
  gs.flashUntil = ts + 1000
  gs.shockwaves.push({ x: gs.ball.x, y: gs.ball.y, life: 760, ttl: 760, color })
  onSound?.("goal")

  const shapes: PieceType[] = [
    "triangle",
    "square",
    "diamond",
    "pentagon",
    "line",
  ]
  const count = 24 + Math.floor(roll(gs) * 7)

  for (let i = 0; i < count; i++) {
    const spread = (roll(gs) - 0.5) * Math.PI * 0.95
    const angle = (towardCenter > 0 ? 0 : Math.PI) + spread
    const speed = 270 + roll(gs) * 620
    const ttl = 900 + roll(gs) * 520

    gs.particles.push({
      x: gs.ball.x,
      y: gs.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: ttl,
      ttl,
      size: 4 + roll(gs) * 5,
      rot: roll(gs) * Math.PI * 2,
      vr: (roll(gs) - 0.5) * 10,
      type: shapes[Math.floor(roll(gs) * shapes.length)],
      color,
    })
  }
}

// ─── Kickoff conductor helpers ───────────────────────────────────────────────

/**
 * Find the best rotation and striker offset for a piece to make contact with
 * the ball from a given strikeAngle.  Tries 72 evenly-spaced rotations and
 * scores them by: leading edge distance, face width, and rotation cost.
 */
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
function estimateKickoffCompletionTime(
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
function getKickoffStrikeTarget(
  conductor: GS["pieces"][number],
  ball: GS["ball"],
  settings: GameSettings,
) {
  const centerX = VW / 2 - ball.x
  const centerY = VH / 2 - ball.y
  const centerAngle = Math.atan2(centerY, centerX)
  const maxSpeed =
    MOVE_SPD *
    (0.5 + settings.attrs[conductor.type].speed / 200) *
    REGROUP_SPEED_FACTOR *
    KICKOFF_PURSUIT_SPEED_FACTOR
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
export function getKickoffYieldTarget(
  piece: GS["pieces"][number],
  conductor: GS["pieces"][number],
  routeX: number,
  routeY: number,
  pieces: GS["pieces"],
  preferredSide?: -1 | 1,
) {
  const routeXFromConductor = routeX - conductor.x
  const routeYFromConductor = routeY - conductor.y
  const routeDistance = Math.hypot(routeXFromConductor, routeYFromConductor)
  if (routeDistance < 0.001) return null

  const directionX = routeXFromConductor / routeDistance
  const directionY = routeYFromConductor / routeDistance
  const offsetX = piece.x - conductor.x
  const offsetY = piece.y - conductor.y
  const alongRoute = offsetX * directionX + offsetY * directionY
  const lateralDistance = Math.abs(offsetX * -directionY + offsetY * directionX)

  if (
    alongRoute < (preferredSide ? -KICKOFF_YIELD_OFFSET : 0) ||
    alongRoute >
      Math.min(routeDistance, KICKOFF_YIELD_DISTANCE) +
        (preferredSide ? KICKOFF_YIELD_OFFSET : 0) ||
    lateralDistance >
      KICKOFF_YIELD_LATERAL_LIMIT + (preferredSide ? KICKOFF_YIELD_OFFSET : 0)
  ) {
    return null
  }

  let bestTarget: Pick<GS["ball"], "x" | "y"> & { side: -1 | 1 } | null = null
  let bestClearance = Number.NEGATIVE_INFINITY

  const sides: (-1 | 1)[] = preferredSide ? [preferredSide] : [-1, 1]
  for (const side of sides) {
    const targetX = clamp(
      piece.x - directionY * side * KICKOFF_YIELD_OFFSET,
      PR,
      VW - PR,
    )
    const targetY = clamp(
      piece.y + directionX * side * KICKOFF_YIELD_OFFSET,
      PR,
      VH - PR,
    )
    let clearance = Infinity

    for (const other of pieces) {
      if (other.id === piece.id || other.id === conductor.id) continue
      clearance = Math.min(
        clearance,
        Math.hypot(targetX - other.x, targetY - other.y),
      )
    }

    if (clearance > bestClearance) {
      bestClearance = clearance
      bestTarget = { x: targetX, y: targetY, side }
    }
  }

  return bestTarget
}

// ─── Regroup trigger ─────────────────────────────────────────────────────────

/**
 * Transition to the regroup/kickoff phase after a goal or match start.
 * Computes target positions for every piece, selects the best conductor, and
 * arms the kickoff-recovery state machine.
 */
export function beginKickoffRegroup(
  gs: GS,
  playerSlots: SlotPiece[],
  settings: GameSettings,
): void {
  const receivingTeam: Team | null =
    gs.pendingResetScorerA === null ? null : gs.pendingResetScorerA ? "B" : "A"
  const fresh = makeGS(playerSlots, gs.opponentSlots, gs.matchMode)
  const freshTeamA = fresh.pieces.filter((piece) => piece.team === "A")
  const freshTeamB = fresh.pieces.filter((piece) => piece.team === "B")
  const currentTeamA = gs.pieces.filter((piece) => piece.team === "A")
  const currentTeamB = gs.pieces.filter((piece) => piece.team === "B")

  gs.kickoffTargets = {}
  gs.kickoffYieldSides = {}
  currentTeamA.forEach((piece, index) => {
    const target = freshTeamA[index]
    if (target) gs.kickoffTargets[piece.id] = { x: target.x, y: target.y }
  })
  currentTeamB.forEach((piece, index) => {
    const target = freshTeamB[index]
    if (target) gs.kickoffTargets[piece.id] = { x: target.x, y: target.y }
  })
  for (const piece of gs.pieces) {
    piece.isPlayerControlled =
      piece.team === "A" && piece === currentTeamA[gs.selectedIdx]
  }

  gs.ball.x = clamp(gs.ball.x, REGROUP_BALL_X_MIN, REGROUP_BALL_X_MAX)
  gs.ball.vx = 0
  gs.ball.vy = 0

  gs.notification = null
  gs.goalCooldown = 0
  gs.kickoffCountdown = 0
  gs.kickoffDuration = 0
  gs.kickoffPhase = "regroup"
  gs.kickoffTeam = receivingTeam
  gs.kickoffConductorId = null
  gs.kickoffConductorCarrying = false
  gs.kickoffConductorStriking = false
  gs.kickoffCenterBraking = false
  gs.kickoffRecovery = null
  gs.kickoffCarryComplete = false
  gs.collisionCooldowns = {}
  gs.finished = false
  const selectedPiece = currentTeamA[gs.selectedIdx]
  if (selectedPiece) {
    gs.pieceVx = selectedPiece.vx
    gs.pieceVy = selectedPiece.vy
  }
  gs.goalColor = null
  gs.pendingResetScorerA = null
  gs.stuckBallX = VW / 2
  gs.stuckBallY = VH / 2
  gs.stuckBallDuration = 0
  gs.pieceMotionWatch = {}
  gs.aiDecisionStates = {}
  gs.aiPassReceiverId = null
  gs.aiPassTeam = null
  gs.aiPassTimer = 0
  gs.aiKickFlashUntil = {}
  gs.aiPossessionTeam = null
  gs.aiPossessionCandidateTime = 0
  gs.aiPossessionCandidate = null

  let conductor: GS["pieces"][number] | null = null
  let bestConductorScore = Infinity
  for (const piece of gs.pieces) {
    const target = getKickoffStrikeTarget(piece, gs.ball, settings)
    const score = estimateKickoffCompletionTime(
      piece,
      gs.ball,
      target,
      settings,
    )
    if (score < bestConductorScore) {
      conductor = piece
      bestConductorScore = score
    }
  }
  if (conductor) {
    gs.kickoffConductorId = conductor.id
    gs.kickoffRecovery = planKickoffRecovery(conductor, gs.ball, settings)
  }
}
