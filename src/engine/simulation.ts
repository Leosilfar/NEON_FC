import type {
  GameSettings,
  GS,
  KickoffRecoveryState,
  MatchSound,
  PieceType,
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
const RESET_KICKOFF_DURATION = 2.2
const COLLISION_SOUND_COOLDOWN = 0.1
const KICKOFF_LIGHTS_SOUND_AT = 2.88
const REGROUP_SPEED_FACTOR = 0.95
const REGROUP_ARRIVAL_DISTANCE = 8
const CENTER_CIRCLE_RADIUS = VH * 0.18
const STEERING_LOOKAHEAD = 0.65
const STEERING_SAFE_DISTANCE = PR * 2 + 6
const KICKOFF_YIELD_DISTANCE = PR * 6
const KICKOFF_YIELD_LATERAL_LIMIT = PR * 2.2
const KICKOFF_YIELD_OFFSET = PR * 2.6
const KICKOFF_BALL_CONTACT_RADIUS = PR + BR + 5
const KICKOFF_PURSUIT_SPEED_FACTOR = 1.6
const KICKOFF_REPOSITION_ARRIVAL = 8
const KICKOFF_REPLAN_BALL_DISTANCE = 20
const KICKOFF_PROGRESS_DISTANCE = 5
const KICKOFF_STRIKE_RETRY_TIME = 0.4
const KICKOFF_REPOSITION_RETRY_TIME = 0.65
const KICKOFF_AIM_ADJUSTMENTS = [-0.24, -0.12, 0, 0.12, 0.24]
const REGROUP_BALL_X_MIN = PR + BR + 2
const REGROUP_BALL_X_MAX = VW - PR - BR - 2

type ImpactCallback = (
  x: number,
  y: number,
  nx: number,
  ny: number,
  intensity: number,
) => void

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

function planKickoffRecovery(
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

function getKickoffFacingRotation(
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

function steerKickoffConductor(
  conductor: GS["pieces"][number],
  targetX: number,
  targetY: number,
  settings: GameSettings,
  dt: number,
  strikeAngle?: number,
) {
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

function steerPieceToTarget(
  piece: GS["pieces"][number],
  targetX: number,
  targetY: number,
  settings: GameSettings,
  dt: number,
  obstacles: GS["pieces"] = [],
  prioritizeProgress = false,
) {
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

function getKickoffYieldTarget(
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

function beginKickoffRegroup(
  gs: GS,
  playerSlots: SlotPiece[],
  settings: GameSettings,
) {
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

function beginGoal(
  gs: GS,
  settings: GameSettings,
  scorerA: boolean,
  goalX: number,
  goalY: number,
  ts: number,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
  const color = scorerA ? settings.teamA.color : settings.teamB.color
  const towardCenter = scorerA ? -1 : 1

  gs.ball = { x: clamp(goalX, 0, VW), y: clamp(goalY, 0, VH), vx: 0, vy: 0 }
  gs.ball.vx = towardCenter * 110
  gs.notification = "GOL!"
  gs.notifEnd = ts + 2000
  gs.goalCooldown = 1800
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

function emitCollision(
  gs: GS,
  key: string,
  cue: MatchSound,
  intensity: number,
  x: number,
  y: number,
  nx: number,
  ny: number,
  color: string,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
  if ((gs.collisionCooldowns[key] ?? 0) > 0) return

  gs.collisionCooldowns[key] = COLLISION_SOUND_COOLDOWN
  onSound?.(cue, Math.min(1, 0.25 + intensity * 0.75))

  const shapes: PieceType[] = [
    "triangle",
    "square",
    "diamond",
    "pentagon",
    "line",
  ]
  const particleCount = 3 + Math.round(Math.min(2, intensity * 2))
  const baseAngle = Math.atan2(ny, nx)

  for (let i = 0; i < particleCount; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * 1.5
    const speed = 45 + Math.random() * (65 + intensity * 70)
    const ttl = 240 + Math.random() * 170

    gs.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: ttl,
      ttl,
      size: 1.5 + Math.random() * 1.8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 12,
      type: shapes[Math.floor(Math.random() * shapes.length)],
      color,
    })
  }

  if (gs.particles.length > 150) {
    gs.particles.splice(0, gs.particles.length - 150)
  }
}

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

  if (gs.goalCooldown > 0) {
    gs.goalCooldown -= dt * 1000
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

  if (!regrouping && gs.matchMode !== "training") releaseStuckBall(gs, dt)
  return gs
}
