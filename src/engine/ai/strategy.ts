import type { GameSettings, GPiece, GS, Team } from "@/types"
import type { BallPerception } from "@/engine/ai/perception"
import {
  BR,
  FIELD_FRICTION,
  GOAL_Y0,
  GOAL_Y1,
  PR,
  VW,
  VH,
  clamp,
  vdist,
} from "@/constants/physics"
import { awayToCanvas, computeHomeNormalized, homeToCanvas } from "@/utils/tactics"
import { getAiMaxSpeed } from "@/engine/ai/steering"

export type TeamState = "OFENSIVO" | "DEFENSIVO" | "NEUTRO"
export type TeamPlan = "PROTECT" | "BALANCED" | "CHASE"
export type AiAction =
  | "PRESS"
  | "INTERCEPT"
  | "COVER"
  | "SUPPORT"
  | "HOLD"
  | "ATTACK"
  | "RUN"
  | "OUTLET"
  | "WIDE"
  | "RECEIVE"
  | "PASS"
  | "SHOOT"
export type TargetIntent = "formation" | "ball" | "drive" | "goal"

export interface AiTarget {
  x: number
  y: number
  intent: TargetIntent
  aimX?: number
  aimY?: number
  receiverId?: number
}

export interface StrategyContext extends BallPerception {
  states: Record<Team, TeamState>
  plans: Record<Team, TeamPlan>
}

interface TeamRoleProfile {
  fieldPieces: GPiece[]
  attackShare: number
  defenseShare: number
  midfielders: number
  pressSlots: number
}

function getTeamRoleProfile(gs: GS, team: Team, plan: TeamPlan): TeamRoleProfile {
  const fieldPieces = gs.pieces.filter(
    (piece) => piece.team === team && piece.role !== "GOL",
  )
  const total = Math.max(1, fieldPieces.length)
  const count = (role: GPiece["role"]) =>
    fieldPieces.filter((piece) => piece.role === role).length
  const attackers = count("ATA")
  const midfielders = count("MEI") + count("VOL")
  const fullbacks = count("LAT")
  const attackShare =
    (attackers + count("MEI") * 0.65 + fullbacks * 0.35) / total
  const defenseShare =
    (count("ZAG") + count("VOL") * 0.35 + fullbacks * 0.3) / total
  let pressSlots = attackers >= total * 0.65
    ? 3
    : attackers >= 2 || fullbacks >= total * 0.5
      ? 2
      : 1

  if (plan === "CHASE") pressSlots += 1
  if (plan === "PROTECT") pressSlots -= 1

  return {
    fieldPieces,
    attackShare,
    defenseShare,
    midfielders,
    pressSlots: clamp(pressSlots, 1, 3),
  }
}

function estimateArrivalTime(
  piece: GPiece,
  target: { x: number; y: number },
  settings: GameSettings,
) {
  const dx = target.x - piece.x
  const dy = target.y - piece.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1) return 0

  const directionX = dx / distance
  const directionY = dy / distance
  const currentClosingSpeed = Math.max(
    0,
    piece.vx * directionX + piece.vy * directionY,
  )
  const runSpeed = getAiMaxSpeed(
    piece,
    true,
    settings.attrs[piece.type].speed,
  )
  const initialProgress = Math.min(distance, currentClosingSpeed * 0.25)
  return 0.25 + (distance - initialProgress) / Math.max(runSpeed, 1)
}

export function makeStrategyContext(
  perception: BallPerception,
  gs: Pick<GS, "scoreA" | "scoreB" | "timeLeft">,
): StrategyContext {
  const possessionTeam = perception.possessionTeam
  const planFor = (team: Team): TeamPlan => {
    const ownScore = team === "A" ? gs.scoreA : gs.scoreB
    const opponentScore = team === "A" ? gs.scoreB : gs.scoreA
    if (ownScore < opponentScore) return "CHASE"
    if (ownScore > opponentScore) return "PROTECT"
    return "BALANCED"
  }
  return {
    ...perception,
    plans: { A: planFor("A"), B: planFor("B") },
    states: {
      A:
        possessionTeam === null
          ? "NEUTRO"
          : possessionTeam === "A"
            ? "OFENSIVO"
            : "DEFENSIVO",
      B:
        possessionTeam === null
          ? "NEUTRO"
          : possessionTeam === "B"
            ? "OFENSIVO"
            : "DEFENSIVO",
    },
  }
}

function direction(team: Team) {
  return team === "A" ? 1 : -1
}

function ownGoalX(team: Team) {
  return team === "A" ? 0 : VW
}

function goalX(team: Team) {
  return team === "A" ? VW : 0
}
function clampTarget(target: AiTarget): AiTarget {
  return {
    ...target,
    x: clamp(target.x, PR * 1.5, VW - PR * 1.5),
    y: clamp(target.y, PR * 1.5, VH - PR * 1.5),
  }
}

function strikeApproachTarget(aim: { x: number; y: number }, gs: GS) {
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

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq > 0
    ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1)
    : 0
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t))
}

function hasOpenLane(gs: GS, team: Team, target: { x: number; y: number }) {
  return gs.pieces.every((piece) => piece.team === team ||
    distanceToSegment(piece, gs.ball, target) > PR * 2)
}

function bestPassTarget(piece: GPiece, gs: GS) {
  const goal = { x: goalX(piece.team), y: VH / 2 }
  const ballGoalDistance = vdist(gs.ball.x, gs.ball.y, goal.x, goal.y)
  let best: { target: GPiece; aimX: number; aimY: number; score: number } | null = null
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
    const nearestOpponent = Math.min(...gs.pieces
      .filter((candidate) => candidate.team !== piece.team)
      .map((opponent) => vdist(aimX, aimY, opponent.x, opponent.y)))
    const progress = clamp(forwardGain / Math.max(180, ballGoalDistance), 0, 1)
    const space = clamp(nearestOpponent / 240, 0, 1)
    const scoringThreat = clamp(
      1 - vdist(aimX, aimY, goal.x, goal.y) / 700,
      0,
      1,
    )
    const keeperSafetyBonus = teammate.role === "GOL" ? 0.08 : 0
    const score = progress * 0.4 + space * 0.5 + scoringThreat * 0.25 -
      distance / 1800 - (laneBlocked ? 0.38 : 0) + keeperSafetyBonus
    if (!best || score > best.score) best = { target: teammate, aimX, aimY, score }
  }
  return best
}

function bestShotTarget(gs: GS, team: Team) {
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

function passReceiveTarget(piece: GPiece, gs: GS, settings: GameSettings): AiTarget {
  const runSpeed = Math.max(1, getAiMaxSpeed(
    piece,
    true,
    settings.attrs[piece.type].speed,
  ))
  let interceptTime = 0.18

  // Re-estimate the meeting point as the receiver approaches the moving ball.
  // The drag integral matches the simulation's exponential ball slowdown.
  for (let iteration = 0; iteration < 4; iteration++) {
    const travelTime = (1 - Math.exp(-FIELD_FRICTION * interceptTime)) /
      FIELD_FRICTION
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

  const travelTime = (1 - Math.exp(-FIELD_FRICTION * interceptTime)) /
    FIELD_FRICTION
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
    [-170, 0], [170, 0], [0, -170], [0, 170],
    [-120, -120], [-120, 120], [120, -120], [120, 120],
  ] as const
  const teammates = gs.pieces.filter((candidate) =>
    candidate.team === piece.team && candidate.id !== piece.id && candidate.role !== "GOL"
  )
  const opponents = gs.pieces.filter((candidate) => candidate.team !== piece.team)
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
    const score = teammateDensity * 0.9 + opponentPressure * 0.1 +
      displacement / 360 + laneDisplacement / 600

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
function bestRunTarget(
  piece: GPiece,
  gs: GS,
  context: StrategyContext,
  settings: GameSettings,
) {
  if (piece.role === "GOL" || context.possessionTeam !== piece.team) return null

  const attackDirection = direction(piece.team)
  const goal = { x: goalX(piece.team), y: VH / 2 }
  const carrier = gs.pieces
    .filter((candidate) => candidate.team === piece.team && candidate.id !== piece.id)
    .sort((a, b) => vdist(a.x, a.y, gs.ball.x, gs.ball.y) - vdist(b.x, b.y, gs.ball.x, gs.ball.y))[0]
  const origin = carrier && vdist(carrier.x, carrier.y, gs.ball.x, gs.ball.y) < 190
    ? carrier
    : gs.ball
  const opponents = gs.pieces.filter((candidate) => candidate.team !== piece.team)
  const teammates = gs.pieces.filter((candidate) => candidate.team === piece.team && candidate.id !== piece.id && candidate.role !== "GOL")
    .sort((a, b) => a.id - b.id)
  const teamFieldPieces = gs.pieces
    .filter((candidate) => candidate.team === piece.team && candidate.role !== "GOL")
    .sort((a, b) => a.id - b.id)
  const teammateIndex = teamFieldPieces.findIndex((candidate) => candidate.id === piece.id)
  const normalizedSlot = computeHomeNormalized(teamFieldPieces.map((teammate) => teammate.role))[teammateIndex] ?? { x: 0.5, y: 0.5 }
  const formationLaneY = piece.team === "A"
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
      const nearestOpponent = Math.min(Infinity, ...opponents.map((opponent) => vdist(target.x, target.y, opponent.x, opponent.y)))
      const ourArrival = estimateArrivalTime(piece, target, settings)
      const opponentArrival = Math.min(Infinity, ...opponents.map((opponent) => estimateArrivalTime(opponent, target, settings)))
      const laneClearance = Math.min(Infinity, ...opponents.map((opponent) => distanceToSegment(opponent, origin, target)))
      const nearestTeammate = Math.min(Infinity, ...teammates.map((teammate) => vdist(target.x, target.y, teammate.x, teammate.y)))
      const runDistance = vdist(piece.x, piece.y, target.x, target.y)
      const progressScore = clamp(goalwardProgress / 360, 0, 1)
      const centralityScore = clamp(1 - Math.abs(target.y - VH / 2) / (VH * 0.58), 0, 1)
      const spaceScore = clamp(nearestOpponent / 260, 0, 1)
      const laneScore = clamp(laneClearance / 150, 0, 1)
      const separationScore = clamp((nearestTeammate - PR * 3.5) / 250, 0, 1)
      const goalThreat = clamp(1 - distanceToGoal / 620, 0, 1)
      const travelCost = clamp(runDistance / 620, 0, 1)
      const laneAssignment = clamp(1 - Math.abs(lateral - preferredLateral) / 300, 0, 1)
      const arrivalAdvantage = clamp((opponentArrival - ourArrival + 0.35) / 1.1, 0, 1)
      const behindBallPenalty = goalwardProgress < 70 ? 0.45 : 0
      const score = progressScore * 0.22 + centralityScore * 0.08 +
        spaceScore * 0.2 + laneScore * 0.18 + separationScore * 0.12 +
        goalThreat * 0.16 + laneAssignment * 0.08 + arrivalAdvantage * 0.12 -
        clamp((PR * 4.5 - nearestTeammate) / 240, 0, 1) * 0.14 -
        travelCost * 0.16 - behindBallPenalty

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

/** Gives each non-keeper a complementary team task instead of a shared ball target. */
export function coordinateTeam(
  gs: GS,
  context: StrategyContext,
  settings: GameSettings,
) {
  const assignments: Partial<Record<number, AiAction>> = {}
  for (const team of ["A", "B"] as const) {
    const plan = context.plans[team]
    const roleProfile = getTeamRoleProfile(gs, team, plan)
    const fieldPlayers = roleProfile.fieldPieces
    const players = gs.pieces.filter((piece) =>
      piece.team === team && piece.role !== "GOL" && !piece.isPlayerControlled
    )
    const passReceiverId = gs.aiPassTimer && gs.aiPassTimer > 0 && gs.aiPassTeam === team
      ? gs.aiPassReceiverId
      : null
    const passReceiver = passReceiverId === null || passReceiverId === undefined
      ? null
      : gs.pieces.find((piece) => piece.id === passReceiverId && !piece.isPlayerControlled) ?? null
    if (passReceiver) assignments[passReceiver.id] = "RECEIVE"
    if (players.length === 0) continue
    const pressBias: Record<NonNullable<GPiece["role"]>, number> = {
      GOL: -200,
      ZAG: 0,
      LAT: 45,
      VOL: 25,
      MEI: 45,
      ATA: 85,
    }
    const byBall = [...players].sort((a, b) => {
      const effectiveDistance = (piece: GPiece) =>
        estimateArrivalTime(piece, context.predictedBall, settings) -
        pressBias[piece.role ?? "MEI"] / 300 +
        (piece.role === "LAT" && Math.abs(piece.y - context.predictedBall.y) > VH * 0.24 ? 0.25 : 0)
      return effectiveDistance(a) - effectiveDistance(b)
    })
    const actualCarrier = fieldPlayers
      .filter((piece) => vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= 150)
      .sort((a, b) => vdist(a.x, a.y, gs.ball.x, gs.ball.y) - vdist(b.x, b.y, gs.ball.x, gs.ball.y))[0]
    const closest = byBall[0]
    if (context.possessionTeam === team) {
      if (actualCarrier && !actualCarrier.isPlayerControlled) {
        assignments[actualCarrier.id] = "ATTACK"
      }
      const offBallPlayers = players.filter((player) =>
        player.id !== actualCarrier?.id && !assignments[player.id]
      )
      const runCandidates = offBallPlayers
        .map((player) => ({ player, run: bestRunTarget(player, gs, context, settings) }))
        .filter((candidate) => candidate.run !== null)
        .sort((a, b) => (b.run?.score ?? 0) - (a.run?.score ?? 0))
      const primaryRunner = runCandidates[0]
      if (primaryRunner?.run) assignments[primaryRunner.player.id] = "RUN"

      const remaining = offBallPlayers.filter((player) => !assignments[player.id])
      const widePlayer = remaining.length > 1 ? remaining
        .filter((player) => player.role === "LAT")
        .sort((a, b) => Math.abs(a.y - VH / 2) - Math.abs(b.y - VH / 2))[0] : undefined
      if (widePlayer) assignments[widePlayer.id] = "WIDE"

      const availableForOutlet = remaining.filter((player) => !assignments[player.id])
      const outlet = availableForOutlet.length > 1
        ? availableForOutlet.sort((a, b) => {
          const outletScore = (player: GPiece) => {
            const nearestPressure = Math.min(Infinity, ...gs.pieces
              .filter((opponent) => opponent.team !== team)
              .map((opponent) => vdist(player.x, player.y, opponent.x, opponent.y)))
            const laneClearance = Math.min(Infinity, ...gs.pieces
              .filter((opponent) => opponent.team !== team)
              .map((opponent) => distanceToSegment(opponent, gs.ball, player)))
            const accessible = clamp(1 - vdist(gs.ball.x, gs.ball.y, player.x, player.y) / 680, 0, 1)
            const roleBonus = player.role === "MEI" ? 0.16 : player.role === "VOL" ? 0.12 : 0
            return clamp(nearestPressure / 300, 0, 1) * 0.38 +
              clamp(laneClearance / 180, 0, 1) * 0.24 + accessible * 0.2 +
              roleBonus - estimateArrivalTime(player, gs.ball, settings) * 0.025
          }
          return outletScore(b) - outletScore(a)
        })[0]
        : undefined
      if (outlet) assignments[outlet.id] = "OUTLET"

      for (const player of remaining) {
        if (!assignments[player.id]) assignments[player.id] = "COVER"
      }
      continue
    }

    const pressLimit = clamp(
      820 + roleProfile.attackShare * 220 - roleProfile.defenseShare * 100 +
        (plan === "CHASE" ? 140 : plan === "PROTECT" ? -220 : 0),
      420,
      1180,
    )
    const pressureDistance = closest
      ? vdist(closest.x, closest.y, context.predictedBall.x, context.predictedBall.y)
      : Infinity
    const closestArrival = closest
      ? estimateArrivalTime(closest, context.predictedBall, settings)
      : Infinity
    const humanDistance = Math.min(...fieldPlayers
      .filter((piece) => piece.isPlayerControlled)
      .map((piece) => vdist(piece.x, piece.y, context.predictedBall.x, context.predictedBall.y)))
    const humanArrival = Math.min(...fieldPlayers
      .filter((piece) => piece.isPlayerControlled)
      .map((piece) => estimateArrivalTime(piece, context.predictedBall, settings)))
    const humanIsAlreadyPressing = humanDistance <= Math.min(pressLimit, 260) &&
      humanArrival <= closestArrival

    const nearSideline = context.predictedBall.y < VH * 0.18 ||
      context.predictedBall.y > VH * 0.82
    const localPlayerCount = fieldPlayers.filter((piece) =>
      vdist(piece.x, piece.y, context.predictedBall.x, context.predictedBall.y) < PR * 4.2
    ).length
    const crowdedZone = nearSideline || localPlayerCount >= 3
    const ownGoalX = team === "A" ? 0 : VW
    const ownGoalDistance = vdist(
      context.predictedBall.x,
      context.predictedBall.y,
      ownGoalX,
      VH / 2,
    )
    const pressSlotLimit = crowdedZone
      ? ownGoalDistance < 310 ? 2 : 1
      : roleProfile.pressSlots

    const aiPressSlots = Math.max(
      0,
      pressSlotLimit - (humanIsAlreadyPressing ? 1 : 0),
    )
    const eligiblePressers = byBall.filter((piece) =>
      vdist(piece.x, piece.y, context.predictedBall.x, context.predictedBall.y) < pressLimit
    )
    const pressured = new Set<number>(passReceiver ? [passReceiver.id] : [])
    for (const player of eligiblePressers
      .filter((candidate) => candidate.id !== passReceiver?.id)
      .slice(0, aiPressSlots)) {
      assignments[player.id] = "PRESS"
      pressured.add(player.id)
    }
    const interceptBias: Record<NonNullable<GPiece["role"]>, number> = {
      GOL: -200,
      ZAG: 45,
      LAT: 20,
      VOL: 115,
      MEI: 130,
      ATA: 0,
    }
    const interceptor = byBall
      .filter((piece) => !pressured.has(piece.id))
      .sort((a, b) => {
        const effectiveDistance = (piece: GPiece) =>
          estimateArrivalTime(piece, context.predictedBall, settings) -
          interceptBias[piece.role ?? "MEI"] / 300
        return effectiveDistance(a) - effectiveDistance(b)
      })[0]
    if (
      interceptor &&
      roleProfile.midfielders > 0 &&
      (eligiblePressers.length > 0 || humanIsAlreadyPressing) &&
      (!crowdedZone || ownGoalDistance < 310)
    ) {
      assignments[interceptor.id] = "INTERCEPT"
    }
    for (const player of players) {
      if (!assignments[player.id]) assignments[player.id] = "COVER"
    }
  }
  return assignments
}

function formationTarget(
  piece: GPiece,
  gs: GS,
  context: StrategyContext,
): AiTarget {
  const state = context.states[piece.team]
  const plan = context.plans[piece.team]
  const ownGoal = piece.team === "A" ? 0 : VW
  const isKeeper = piece.role === "GOL"
  const baseX = piece.team === "A" ? VW * 0.28 : VW * 0.72
  const baseY =
    piece.role === "ATA" ? VH * 0.34 : piece.role === "GOL" ? VH / 2 : VH * 0.5
  const advance =
    state === "OFENSIVO"
      ? direction(piece.team) * (plan === "PROTECT" ? 18 : plan === "CHASE" ? 88 : 48)
      : state === "DEFENSIVO"
        ? -direction(piece.team) * 24
        : 0
  const anchorX = isKeeper
    ? ownGoal +
      direction(piece.team) *
        clamp(Math.abs(gs.ball.x - ownGoal) * 0.22, PR * 1.5, 135)
    : baseX + advance
  const shiftY = (context.predictedBall.y - VH / 2) * (isKeeper ? 0.12 : 0.2)
  return clampTarget({
    x: anchorX + (context.predictedBall.x - VW / 2) * (isKeeper ? 0.04 : 0.14),
    y: baseY + shiftY,
    intent: "formation",
  })
}

function utilityActions(
  piece: GPiece,
  gs: GS,
  context: StrategyContext,
  formation: AiTarget,
  settings: GameSettings,
  assignedAction?: AiAction,
) {
  const opponentsNearest = context.nearestByTeam[piece.team === "A" ? "B" : "A"]
  const predictedDistance = vdist(
    piece.x,
    piece.y,
    context.predictedBall.x,
    context.predictedBall.y,
  )
  const teamDistance = vdist(
    piece.x,
    piece.y,
    context.predictedBall.x,
    context.predictedBall.y,
  )
  const opponentDistance = opponentsNearest
    ? vdist(
        opponentsNearest.x,
        opponentsNearest.y,
        context.predictedBall.x,
        context.predictedBall.y,
      )
    : Infinity
  const state = context.states[piece.team]
  const plan = context.plans[piece.team]
  const roleProfile = getTeamRoleProfile(gs, piece.team, plan)
  const ballControlDistance = vdist(piece.x, piece.y, gs.ball.x, gs.ball.y)
  const danger =
    piece.team === "A" ? gs.ball.x < VW * 0.34 : gs.ball.x > VW * 0.66
  const isDefender =
    piece.role === "GOL" || piece.role === "ZAG" || piece.role === "LAT"
  const isAttacker = piece.role === "ATA" || piece.role === "MEI"
  const forwardSign = direction(piece.team)
  const teammates = gs.pieces
    .filter((candidate) => candidate.team === piece.team && candidate.role !== "GOL")
    .sort((a, b) => a.id - b.id)
  const supportIndex = teammates.findIndex((candidate) => candidate.id === piece.id)
  const supportLane = supportIndex - (teammates.length - 1) / 2
  const homeSlots = computeHomeNormalized(teammates.map((teammate) => teammate.role))
  const normalizedSlot = homeSlots[supportIndex] ?? { x: 0.5, y: 0.5 }
  const formationPosition = piece.team === "A"
    ? homeToCanvas(normalizedSlot)
    : awayToCanvas(normalizedSlot)
  const role = piece.role ?? "MEI"
  const loneFullback = role === "LAT" &&
    teammates.filter((teammate) => teammate.role === "LAT").length === 1
  const laneY = loneFullback
    ? (piece.id % 2 === 0 ? VH * 0.18 : VH * 0.82)
    : formationPosition.y
  const roleDepth: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: -260,
    ZAG: -125,
    LAT: 105,
    VOL: -45,
    MEI: 125,
    ATA: 225,
  }
  const formationAttackBias = roleProfile.attackShare - roleProfile.defenseShare * 0.55
  const rawSupportDepth = roleDepth[role] + formationAttackBias * 130
  const planScale = rawSupportDepth >= 0
    ? plan === "CHASE" ? 1.3 : plan === "PROTECT" ? 0.62 : 1
    : plan === "CHASE" ? 0.45 : plan === "PROTECT" ? 1.15 : 1
  const supportDepth = rawSupportDepth * planScale
  const laneFollow: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: 0.08,
    ZAG: 0.18,
    LAT: 0.2,
    VOL: 0.48,
    MEI: 0.62,
    ATA: 0.44,
  }
  const supportY = laneY * (1 - laneFollow[role]) + context.predictedBall.y * laneFollow[role]
  const coverY = laneY * 0.72 + context.predictedBall.y * 0.28
  const defensiveTracking: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: 0.12,
    ZAG: 0.3,
    LAT: 0.48,
    VOL: 0.52,
    MEI: 0.58,
    ATA: 0.38,
  }
  const trackingScale = plan === "CHASE" ? 1.18 : plan === "PROTECT" ? 0.82 : 1
  const coverTracking = Math.min(0.8, defensiveTracking[role] * trackingScale)
  const ownFormationX = ownGoalX(piece.team) +
    (formationPosition.x - ownGoalX(piece.team)) * 0.8
  const interceptTarget = clampTarget({
    x: context.predictedBall.x - forwardSign * 88,
    y: laneY * 0.55 + context.predictedBall.y * 0.45,
    intent: "formation",
  })
  const supportTarget = clampTarget({
    x: context.predictedBall.x + forwardSign * (supportDepth + supportLane * 16),
    y: supportY,
    intent: role === "ZAG" || role === "VOL" ? "formation" : "goal",
  })
  const runTarget = bestRunTarget(piece, gs, context, settings)?.target
  const movementTarget = runTarget ?? supportTarget
  const wideTarget = clampTarget({
    x: context.predictedBall.x + forwardSign * 115,
    y: laneY < VH / 2 ? VH * 0.12 : VH * 0.88,
    intent: "goal",
  })
  const coverTarget = clampTarget({
    x: ownFormationX + (context.predictedBall.x - ownFormationX) * coverTracking + supportLane * 12,
    y: coverY,
    intent: "formation",
  })
  const pass = bestPassTarget(piece, gs)
  const shotTarget = bestShotTarget(gs, piece.team)
  const goal = { x: shotTarget.x, y: shotTarget.y }
  const goalDistance = vdist(gs.ball.x, gs.ball.y, goal.x, goal.y)
  const shootingRange = plan === "CHASE" ? 850 : plan === "PROTECT" ? 510 : 680
  const shotQuality = clamp(1 - goalDistance / shootingRange, 0, 1)
  const shotLaneQuality = clamp(shotTarget.clearance / (PR * 5), 0, 1)
  const shotPlanBonus = plan === "CHASE" ? 0.15 : plan === "PROTECT" ? -0.15 : 0
  const shotScore = 1.55 + shotQuality * 0.65 + shotLaneQuality * 0.7 +
    (goalDistance < 320 ? 0.35 : 0) + shotPlanBonus
  const isNearestTeammateToBall = context.nearestByTeam[piece.team]?.id === piece.id
  const canApproachForKick = isNearestTeammateToBall &&
    context.possessionTeam === piece.team && ballControlDistance <= 150
  const canStrikeLooseBall = isNearestTeammateToBall &&
    ballControlDistance <= PR + BR + 4
  const inKickRange = canApproachForKick || canStrikeLooseBall
  const canShoot = inKickRange
  const canPass = inKickRange && Boolean(pass && pass.score > 0.12)
  const options: Array<{
    action: AiAction
    score: number
    target: AiTarget
  }> = [
    {
      action: "PRESS",
      score:
        clamp(1 - predictedDistance / 650, 0, 1) *
        (piece.isPrimaryChaser ? 1 : 0.12),
      target: { x: gs.ball.x, y: gs.ball.y, intent: "ball" },
    },
    {
      action: "INTERCEPT",
      score:
        clamp(1 - teamDistance / 720, 0, 1) *
        (state === "DEFENSIVO" || state === "NEUTRO" ? 0.9 : 0.35) *
        clamp(0.5 + (opponentDistance - teamDistance) / 500, 0.2, 1),
      target: interceptTarget,
    },
    {
      action: "COVER",
      score:
        (state === "DEFENSIVO" ? 0.65 : 0.18) *
        (isDefender && danger ? 1 : 0.7),
      target: coverTarget,
    },
    {
      action: "SUPPORT",
      score:
        state === "OFENSIVO"
          ? isAttacker
            ? clamp(1 - predictedDistance / 850, 0.25, 0.85)
            : 0.58
          : 0.2,
      target: movementTarget,
    },
    {
      action: "RUN",
      score: runTarget ? 1.05 : 0,
      target: runTarget ?? supportTarget,
    },
    {
      action: "OUTLET",
      score: state === "OFENSIVO" ? 0.72 : 0.1,
      target: supportTarget,
    },
    {
      action: "WIDE",
      score: state === "OFENSIVO" ? 0.68 : 0.1,
      target: wideTarget,
    },
    {
      action: "RECEIVE",
      score: 1.1,
      target: passReceiveTarget(piece, gs, settings),
    },
    {
      action: "HOLD",
      score: piece.role === "GOL" ? 0.78 : 0.25,
      target: formation,
    },
    {
      action: "ATTACK",
      score:
        inKickRange
          ? 0.1
          : plan === "CHASE"
            ? 0.95
            : state === "OFENSIVO" && isAttacker
          ? clamp(
              1 - vdist(piece.x, piece.y, goalX(piece.team), VH / 2) / VW,
              0.35,
              0.9,
            )
          : 0.12,
      target: {
        x: gs.ball.x - forwardSign * 42,
        y: gs.ball.y,
        intent: "drive",
      },
    },
    {
      action: "PASS",
      score: canPass ? 1.65 + (pass?.score ?? 0) * 0.85 : 0,
      target: pass
        ? {
            ...strikeApproachTarget({ x: pass.aimX, y: pass.aimY }, gs),
            aimX: pass.aimX,
            aimY: pass.aimY,
            receiverId: pass.target.id,
          }
        : formation,
    },
    {
      action: "SHOOT",
      score: canShoot ? shotScore : 0,
      target: {
        ...strikeApproachTarget(shotTarget, gs),
        aimX: goal.x,
        aimY: goal.y,
      },
    },
  ]
  return options
}

/** Utility AI: scores tactical actions, then returns the winning intent and target. */
export function chooseAction(
  piece: GPiece,
  gs: GS,
  context: StrategyContext,
  settings: GameSettings,
  formation = formationTarget(piece, gs, context),
  assignedAction?: AiAction,
) {
  const options = utilityActions(piece, gs, context, formation, settings, assignedAction)
  if (assignedAction) {
    const assigned = options.find((option) => option.action === assignedAction)
    const kick = options
      .filter((option) => option.action === "PASS" || option.action === "SHOOT")
      .reduce((best, option) => option.score > best.score ? option : best)
    if (assigned) return kick.score > assigned.score ? kick : assigned
  }
  return options.reduce((best, option) =>
    option.score > best.score ? option : best,
  )
}
