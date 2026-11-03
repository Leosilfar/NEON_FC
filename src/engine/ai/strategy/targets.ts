import type { GameSettings, GPiece, GS, Team } from "@/types"
import {
  BR,
  FIELD_FRICTION,
  GOAL_Y0,
  GOAL_Y1,
  PR,
  VH,
  VW,
  clamp,
  vdist,
} from "@/constants/physics"
import {
  awayToCanvas,
  computeHomeNormalized,
  homeToCanvas,
} from "@/utils/tactics"
import { getAiMaxSpeed } from "@/engine/ai/steering"
import type { AiTarget, StrategyContext } from "./context"
import { estimateArrivalTime } from "./context"
export function direction(team: Team) {
  return team === "A" ? 1 : -1
}

export function ownGoalX(team: Team) {
  return team === "A" ? 0 : VW
}

export function goalX(team: Team) {
  return team === "A" ? VW : 0
}
export function clampTarget(target: AiTarget): AiTarget {
  return {
    ...target,
    x: clamp(target.x, PR * 1.5, VW - PR * 1.5),
    y: clamp(target.y, PR * 1.5, VH - PR * 1.5),
  }
}

export function strikeApproachTarget(aim: { x: number; y: number }, gs: GS) {
  const dx = aim.x - gs.ball.x
  const dy = aim.y - gs.ball.y
  const length = Math.hypot(dx, dy) || 1
  const offset = PR + 8
  return clampTarget({
    x: gs.ball.x - (dx / length) * offset,
    y: gs.ball.y - (dy / length) * offset,
    intent: "drive",
  })
}

export function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq > 0
      ? clamp(
          ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq,
          0,
          1,
        )
      : 0
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t))
}

function hasOpenLane(gs: GS, team: Team, target: { x: number; y: number }) {
  return gs.pieces.every(
    (piece) =>
      piece.team === team || distanceToSegment(piece, gs.ball, target) > PR * 2,
  )
}

export function bestPassTarget(piece: GPiece, gs: GS) {
  const goal = { x: goalX(piece.team), y: VH / 2 }
  const ballGoalDistance = vdist(gs.ball.x, gs.ball.y, goal.x, goal.y)
  let best: {
    target: GPiece
    aimX: number
    aimY: number
    score: number
  } | null = null
  for (const teammate of gs.pieces) {
    if (teammate.team !== piece.team || teammate.id === piece.id) continue
    const distance = vdist(gs.ball.x, gs.ball.y, teammate.x, teammate.y)
    if (distance > 680) continue
    const receiveTime = clamp(distance / 460, 0.15, 0.8)
    const aimX = clamp(teammate.x + teammate.vx * receiveTime, PR, VW - PR)
    const aimY = clamp(teammate.y + teammate.vy * receiveTime, PR, VH - PR)
    const forwardGain = piece.team === "A" ? aimX - gs.ball.x : gs.ball.x - aimX
    if (teammate.role !== "GOL" && forwardGain < -80) continue
    const laneBlocked = !hasOpenLane(gs, piece.team, { x: aimX, y: aimY })
    const nearestOpponent = Math.min(
      ...gs.pieces
        .filter((candidate) => candidate.team !== piece.team)
        .map((opponent) => vdist(aimX, aimY, opponent.x, opponent.y)),
    )
    const progress = clamp(forwardGain / Math.max(180, ballGoalDistance), 0, 1)
    const space = clamp(nearestOpponent / 240, 0, 1)
    const scoringThreat = clamp(
      1 - vdist(aimX, aimY, goal.x, goal.y) / 700,
      0,
      1,
    )
    const keeperSafetyBonus = teammate.role === "GOL" ? 0.08 : 0
    const score =
      progress * 0.4 +
      space * 0.5 +
      scoringThreat * 0.25 -
      distance / 1800 -
      (laneBlocked ? 0.38 : 0) +
      keeperSafetyBonus
    if (!best || score > best.score)
      best = { target: teammate, aimX, aimY, score }
  }
  return best
}

export function bestShotTarget(gs: GS, team: Team) {
  const x = goalX(team)
  const candidates = [GOAL_Y0 + BR, VH / 2, GOAL_Y1 - BR]
  let best = { x, y: VH / 2, clearance: 0 }
  let bestScore = -Infinity

  for (const y of candidates) {
    const clearance = Math.min(
      Infinity,
      ...gs.pieces
        .filter((piece) => piece.team !== team)
        .map((piece) => distanceToSegment(piece, gs.ball, { x, y })),
    )
    const centerPreference = Math.abs(y - VH / 2) * 0.12
    const score = clearance - centerPreference
    if (score > bestScore) {
      best = { x, y, clearance }
      bestScore = score
    }
  }
  return best
}

export function passReceiveTarget(
  piece: GPiece,
  gs: GS,
  settings: GameSettings,
): AiTarget {
  const runSpeed = Math.max(
    1,
    getAiMaxSpeed(piece, true, settings.attrs[piece.type].speed),
  )
  let interceptTime = 0.18

  // Re-estimate the meeting point as the receiver approaches the moving ball.
  // The drag integral matches the simulation's exponential ball slowdown.
  for (let iteration = 0; iteration < 4; iteration++) {
    const travelTime =
      (1 - Math.exp(-FIELD_FRICTION * interceptTime)) / FIELD_FRICTION
    const targetX = clamp(gs.ball.x + gs.ball.vx * travelTime, PR, VW - PR)
    const targetY = clamp(gs.ball.y + gs.ball.vy * travelTime, PR, VH - PR)
    const receiverX = piece.x + piece.vx * Math.min(interceptTime, 0.18)
    const receiverY = piece.y + piece.vy * Math.min(interceptTime, 0.18)
    interceptTime = clamp(
      Math.hypot(targetX - receiverX, targetY - receiverY) / runSpeed,
      0.12,
      0.85,
    )
  }

  const travelTime =
    (1 - Math.exp(-FIELD_FRICTION * interceptTime)) / FIELD_FRICTION
  return clampTarget({
    x: gs.ball.x + gs.ball.vx * travelTime,
    y: gs.ball.y + gs.ball.vy * travelTime,
    intent: "ball",
  })
}

/** Shift off-ball targets toward open lanes when several teammates occupy the same zone. */
export function avoidTeammateCrowding(
  piece: GPiece,
  gs: GS,
  target: AiTarget,
): AiTarget {
  const offsets = [
    [0, 0],
    [-170, 0],
    [170, 0],
    [0, -170],
    [0, 170],
    [-120, -120],
    [-120, 120],
    [120, -120],
    [120, 120],
  ] as const
  const teammates = gs.pieces.filter(
    (candidate) =>
      candidate.team === piece.team &&
      candidate.id !== piece.id &&
      candidate.role !== "GOL",
  )
  const opponents = gs.pieces.filter(
    (candidate) => candidate.team !== piece.team,
  )
  let bestTarget = target
  let bestScore = Infinity

  for (const [offsetX, offsetY] of offsets) {
    const candidate = clampTarget({
      ...target,
      x: target.x + offsetX,
      y: target.y + offsetY,
    })
    const teammateDensity = teammates.reduce((density, teammate) => {
      const distance = vdist(candidate.x, candidate.y, teammate.x, teammate.y)
      return density + clamp(1 - distance / 210, 0, 1)
    }, 0)
    const opponentPressure = opponents.reduce((pressure, opponent) => {
      const distance = vdist(candidate.x, candidate.y, opponent.x, opponent.y)
      return pressure + clamp(1 - distance / (PR * 4), 0, 1)
    }, 0)
    const displacement = vdist(candidate.x, candidate.y, target.x, target.y)
    const laneDisplacement = Math.abs(candidate.y - target.y)
    const score =
      teammateDensity * 0.9 +
      opponentPressure * 0.1 +
      displacement / 360 +
      laneDisplacement / 600

    if (score < bestScore) {
      bestScore = score
      bestTarget = {
        ...candidate,
        aimX: target.aimX,
        aimY: target.aimY,
        receiverId: target.receiverId,
      }
    }
  }

  return bestTarget
}

/** Finds a useful off-ball run lane, while reserving nearby space for teammates. */
export function bestRunTarget(
  piece: GPiece,
  gs: GS,
  context: StrategyContext,
  settings: GameSettings,
) {
  if (piece.role === "GOL" || context.possessionTeam !== piece.team) return null

  const attackDirection = direction(piece.team)
  const goal = { x: goalX(piece.team), y: VH / 2 }
  const carrier = gs.pieces
    .filter(
      (candidate) => candidate.team === piece.team && candidate.id !== piece.id,
    )
    .sort(
      (a, b) =>
        vdist(a.x, a.y, gs.ball.x, gs.ball.y) -
        vdist(b.x, b.y, gs.ball.x, gs.ball.y),
    )[0]
  const origin =
    carrier && vdist(carrier.x, carrier.y, gs.ball.x, gs.ball.y) < 190
      ? carrier
      : gs.ball
  const opponents = gs.pieces.filter(
    (candidate) => candidate.team !== piece.team,
  )
  const teammates = gs.pieces
    .filter(
      (candidate) =>
        candidate.team === piece.team &&
        candidate.id !== piece.id &&
        candidate.role !== "GOL",
    )
    .sort((a, b) => a.id - b.id)
  const teamFieldPieces = gs.pieces
    .filter(
      (candidate) => candidate.team === piece.team && candidate.role !== "GOL",
    )
    .sort((a, b) => a.id - b.id)
  const teammateIndex = teamFieldPieces.findIndex(
    (candidate) => candidate.id === piece.id,
  )
  const normalizedSlot = computeHomeNormalized(
    teamFieldPieces.map((teammate) => teammate.role),
  )[teammateIndex] ?? { x: 0.5, y: 0.5 }
  const formationLaneY =
    piece.team === "A"
      ? homeToCanvas(normalizedSlot).y
      : awayToCanvas(normalizedSlot).y
  const preferredLateral = clamp(formationLaneY - origin.y, -150, 150)
  const role = piece.role ?? "MEI"
  const roleEagerness: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: 0.42,
    ZAG: 0.7,
    LAT: 0.94,
    VOL: 0.88,
    MEI: 1,
    ATA: 1,
  }
  const progressDistances = [105, 205, 305]
  const lateralOffsets = [-150, -65, 25, 115]
  let best: { target: AiTarget; score: number } | null = null

  for (const progress of progressDistances) {
    for (const lateral of lateralOffsets) {
      const target = clampTarget({
        x: origin.x + attackDirection * progress,
        y: origin.y + lateral,
        intent: "goal" as const,
      })
      const goalwardProgress = (target.x - origin.x) * attackDirection
      const distanceToGoal = vdist(target.x, target.y, goal.x, goal.y)
      const nearestOpponent = Math.min(
        Infinity,
        ...opponents.map((opponent) =>
          vdist(target.x, target.y, opponent.x, opponent.y),
        ),
      )
      const ourArrival = estimateArrivalTime(piece, target, settings)
      const opponentArrival = Math.min(
        Infinity,
        ...opponents.map((opponent) =>
          estimateArrivalTime(opponent, target, settings),
        ),
      )
      const laneClearance = Math.min(
        Infinity,
        ...opponents.map((opponent) =>
          distanceToSegment(opponent, origin, target),
        ),
      )
      const nearestTeammate = Math.min(
        Infinity,
        ...teammates.map((teammate) =>
          vdist(target.x, target.y, teammate.x, teammate.y),
        ),
      )
      const runDistance = vdist(piece.x, piece.y, target.x, target.y)
      const progressScore = clamp(goalwardProgress / 360, 0, 1)
      const centralityScore = clamp(
        1 - Math.abs(target.y - VH / 2) / (VH * 0.58),
        0,
        1,
      )
      const spaceScore = clamp(nearestOpponent / 260, 0, 1)
      const laneScore = clamp(laneClearance / 150, 0, 1)
      const separationScore = clamp((nearestTeammate - PR * 3.5) / 250, 0, 1)
      const goalThreat = clamp(1 - distanceToGoal / 620, 0, 1)
      const travelCost = clamp(runDistance / 620, 0, 1)
      const laneAssignment = clamp(
        1 - Math.abs(lateral - preferredLateral) / 300,
        0,
        1,
      )
      const arrivalAdvantage = clamp(
        (opponentArrival - ourArrival + 0.35) / 1.1,
        0,
        1,
      )
      const behindBallPenalty = goalwardProgress < 70 ? 0.45 : 0
      const score =
        progressScore * 0.22 +
        centralityScore * 0.08 +
        spaceScore * 0.2 +
        laneScore * 0.18 +
        separationScore * 0.12 +
        goalThreat * 0.16 +
        laneAssignment * 0.08 +
        arrivalAdvantage * 0.12 -
        clamp((PR * 4.5 - nearestTeammate) / 240, 0, 1) * 0.14 -
        travelCost * 0.16 -
        behindBallPenalty

      // Require a worthwhile gap and a plausible route; defenders need a clearer opening.
      const threshold = 0.48 + (1 - roleEagerness[role]) * 0.18
      if (nearestOpponent < PR * 2.3 || laneClearance < PR * 1.5) continue
      if (score >= threshold && (!best || score > best.score)) {
        best = { target, score }
      }
    }
  }

  return best
}
