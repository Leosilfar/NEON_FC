import type {
  GPiece,
  GS,
  PieceMotionWatch,
  Role,
  Team,
} from "@/types"

import { BR, MOVE_SPD, PR, VH, VW, clamp, vdist } from "@/constants/physics"
import { getPieceKickNormal } from "@/engine/physics"
import {
  awayToCanvas,
  computeHomeNormalized,
  homeToCanvas,
} from "@/utils/tactics"
import type { GameSettings } from "@/types"
import { perceiveBall } from "@/engine/ai/perception"
import {
  avoidTeammateCrowding,
  chooseAction,
  coordinateTeam,
  makeStrategyContext,
} from "@/engine/ai/strategy"
import { getAiMaxSpeed, steerToTarget } from "@/engine/ai/steering"

export type TeamState = "OFENSIVO" | "DEFENSIVO" | "NEUTRO"

export interface TacticalContext {
  possessionTeam: Team | null
  states: Record<Team, TeamState>
  closestToBall: GPiece | null
  nearest: GPiece | null
  nearestByTeam: Record<Team, GPiece | null>
  distanceByTeam: Record<Team, number>
  candidatePossession: Team | null
  possessionConfidence: number
  predictedBall: Vec
}

interface Vec {
  x: number
  y: number
}

type TargetIntent = "formation" | "ball" | "drive" | "goal"

interface TacticalTarget extends Vec {
  intent: TargetIntent
  aimX?: number
  aimY?: number
}

function getKickApproachTarget(gs: GS, aimX: number, aimY: number): TacticalTarget {
  const dx = aimX - gs.ball.x
  const dy = aimY - gs.ball.y
  const length = Math.hypot(dx, dy) || 1
  const offset = PR + 8
  return clampFieldTarget({
    x: gs.ball.x - (dx / length) * offset,
    y: gs.ball.y - (dy / length) * offset,
    intent: "drive",
    aimX,
    aimY,
  })
}

const PENALTY_DEPTH = 170
const RISK_DEPTH = 260
const MID_X = VW / 2
const BALL_CONTROL_RADIUS = 74
const STATIONARY_REGION_RADIUS = PR * 1.6
const STATIONARY_TIME_LIMIT = 1.5
const UNSTUCK_DURATION = 0.65
interface AiDifficultyProfile {
  pressRadius: number
  spinRadius: number
  goalkeeperSpinRadius: number
  clearanceRadius: number
  goalShotDistance: number
  formationDiscipline: number
  separationStrength: number
  reactionDelay: number
}

const AI_DIFFICULTY: Record<
  NonNullable<GameSettings["difficulty"]>,
  AiDifficultyProfile
> = {
  easy: {
    pressRadius: 600,
    spinRadius: PR * 2.2,
    goalkeeperSpinRadius: 300,
    clearanceRadius: 260,
    goalShotDistance: 260,
    formationDiscipline: 0.3,
    separationStrength: 1,
    reactionDelay: 0.34,
  },
  medium: {
    pressRadius: 820,
    spinRadius: PR * 3,
    goalkeeperSpinRadius: 620,
    clearanceRadius: 390,
    goalShotDistance: 360,
    formationDiscipline: 0.18,
    separationStrength: 1.2,
    reactionDelay: 0.18,
  },
  hard: {
    pressRadius: 1020,
    spinRadius: PR * 4,
    goalkeeperSpinRadius: 1000,
    clearanceRadius: 540,
    goalShotDistance: 520,
    formationDiscipline: 0.06,
    separationStrength: 1.15,
    reactionDelay: 0.015,
  },
}

function getPlayerTeam(gs: GS): Team | null {
  return gs.pieces.find((piece) => piece.isPlayerControlled)?.team ?? null
}

function getPieceDifficulty(
  settings: GameSettings,
  team: Team,
  playerTeam: Team | null,
): NonNullable<GameSettings["difficulty"]> {
  return team === playerTeam ? "medium" : settings.difficulty ?? "medium"
}

function side(team: Team) {
  return team === "A" ? 1 : -1
}

function ownGoalX(team: Team) {
  return team === "A" ? 0 : VW
}

function opponentGoalX(team: Team) {
  return team === "A" ? VW : 0
}

function homeX(team: Team, fromOwnGoal: number) {
  return team === "A" ? fromOwnGoal : VW - fromOwnGoal
}

function clampFieldTarget<T extends Vec>(target: T): T {
  return {
    ...target,
    x: clamp(target.x, PR * 1.5, VW - PR * 1.5),
    y: clamp(target.y, PR * 1.5, VH - PR * 1.5),
  }
}

function mirrorYOffset(piece: GPiece) {
  const signY = piece.y < VH / 2 ? -1 : 1
  return signY || 1
}

function nearestPieceToBall(pieces: GPiece[], ball: GS["ball"]) {
  let best: GPiece | null = null
  let bestD = Infinity

  for (const piece of pieces) {
    const d = vdist(piece.x, piece.y, ball.x, ball.y)
    if (d < bestD) {
      best = piece
      bestD = d
    }
  }

  return { piece: best, distance: bestD }
}

function distanceToSegment(point: Vec, start: Vec, end: Vec) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq > 0
    ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1)
    : 0
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t))
}

function hasClearLane(gs: GS, team: Team, target: Vec) {
  return !gs.pieces.some((piece) => {
    if (piece.team === team) return false
    return distanceToSegment(piece, gs.ball, target) < PR * 2
  })
}

function chooseSpinTarget(
  piece: GPiece,
  gs: GS,
  profile: AiDifficultyProfile,
): Vec {
  const goal = { x: opponentGoalX(piece.team), y: VH / 2 }
  const goalDistance = Math.hypot(goal.x - gs.ball.x, goal.y - gs.ball.y)
  const goalLaneOpen = hasClearLane(gs, piece.team, goal)
  if (goalLaneOpen || goalDistance < profile.goalShotDistance) return goal

  const receiver = gs.pieces
    .filter((candidate) => {
      if (candidate.team !== piece.team || candidate.id === piece.id) return false
      const forward = piece.team === "A"
        ? candidate.x > piece.x + PR * 2
        : candidate.x < piece.x - PR * 2
      const distance = vdist(gs.ball.x, gs.ball.y, candidate.x, candidate.y)
      const closerToGoal = vdist(candidate.x, candidate.y, goal.x, goal.y) < goalDistance - 120
      return forward && distance < 520 && closerToGoal &&
        hasClearLane(gs, piece.team, candidate)
    })
    .sort(
      (a, b) =>
        vdist(a.x, a.y, goal.x, goal.y) -
        vdist(b.x, b.y, goal.x, goal.y),
    )[0]

  return receiver ?? goal
}

export function getTacticalAiSpinDirections(
  gs: GS,
  settings: GameSettings,
): Map<number, number> {
  const directions = new Map<number, number>()
  const playerTeam = getPlayerTeam(gs)
  const primaryChasers = findPrimaryChasers(gs, settings, playerTeam)

  for (const piece of gs.pieces) {
    if (piece.isPlayerControlled) continue
    const profile = AI_DIFFICULTY[getPieceDifficulty(settings, piece.team, playerTeam)]

    if (
      piece.role === "GOL" &&
      gs.aiDecisionStates[piece.id]?.action !== "PASS" &&
      gs.aiDecisionStates[piece.id]?.action !== "SHOOT"
    ) {
      const direction = side(piece.team)
      const guardingOwnHalf = piece.team === "A"
        ? gs.ball.x < MID_X + 120
        : gs.ball.x > MID_X - 120
      if (
        !guardingOwnHalf ||
        vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) >
          profile.goalkeeperSpinRadius
      ) continue

    const decision = gs.aiDecisionStates[piece.id]
    const tacticalKick = decision &&
      (decision.action === "PASS" || decision.action === "SHOOT")
    const target = tacticalKick
      ? { x: decision.kickTargetX, y: decision.kickTargetY }
      : (() => {
          const movingTowardGoal = gs.ball.vx * direction < -35
          if (!movingTowardGoal) return { x: gs.ball.x, y: gs.ball.y }
          const timeToGoal = clamp((ownGoalX(piece.team) - gs.ball.x) / gs.ball.vx, 0, 1.25)
          const rawY = gs.ball.y + gs.ball.vy * timeToGoal
          const span = VH - PR * 2
          const period = span * 2
          const folded = ((rawY - PR) % period + period) % period
          const interceptY = PR + (folded <= span ? folded : period - folded)
          return { x: ownGoalX(piece.team), y: interceptY }
        })()
    const targetAngle = Math.atan2(target.y - piece.y, target.x - piece.x)
      const currentAngle = piece.rot ?? (piece.team === "A" ? 0 : Math.PI)
      const angleDelta = Math.atan2(
        Math.sin(targetAngle - currentAngle),
        Math.cos(targetAngle - currentAngle),
      )

      if (Math.abs(angleDelta) > 0.25) {
        directions.set(piece.id, Math.sign(angleDelta))
      }
      continue
    }

    const decision = gs.aiDecisionStates[piece.id]
    const tacticalKick = decision &&
      (decision.action === "PASS" || decision.action === "SHOOT")
    if (!primaryChasers.has(piece.id) && !tacticalKick) continue
    if (vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) > (tacticalKick ? 220 : profile.spinRadius)) continue

    const target = tacticalKick
      ? { x: decision.kickTargetX, y: decision.kickTargetY }
      : chooseSpinTarget(piece, gs, profile)
    const aimAngle = Math.atan2(target.y - gs.ball.y, target.x - gs.ball.x)
    const desiredAngle = findKickFacingAngle(piece, gs.ball.x, gs.ball.y, aimAngle)
    const currentAngle = piece.rot ?? (piece.team === "A" ? 0 : Math.PI)
    const angleDelta = Math.atan2(
      Math.sin(desiredAngle - currentAngle),
      Math.cos(desiredAngle - currentAngle),
    )
    if (Math.abs(angleDelta) > 0.04) directions.set(piece.id, Math.sign(angleDelta))
  }

  return directions
}

function findKickFacingAngle(
  piece: GPiece,
  ballX: number,
  ballY: number,
  aimAngle: number,
) {
  const currentAngle = piece.rot ?? (piece.team === "A" ? 0 : Math.PI)
  const symmetry = piece.type === "triangle" ? 3 : piece.type === "pentagon" ? 5 : piece.type === "line" ? 2 : 4
  const base = piece.type === "circle" ? 0 : Math.PI / symmetry
  let bestAngle = currentAngle
  let bestScore = -Infinity
  const samples = piece.type === "circle" ? 1 : 64
  for (let index = 0; index < samples; index++) {
    const angle = base + (index / samples) * Math.PI * 2
    const candidate: GPiece = { ...piece, rot: angle }
    const normal = getPieceKickNormal(candidate, ballX, ballY)
    if (!normal || normal.dist > PR + 60) continue
    const alignment = normal.nx * Math.cos(aimAngle) + normal.ny * Math.sin(aimAngle)
    const turnCost = Math.abs(Math.atan2(Math.sin(angle - currentAngle), Math.cos(angle - currentAngle)))
    const score = alignment - turnCost * 0.012
    if (score > bestScore) {
      bestScore = score
      bestAngle = angle
    }
  }
  return bestAngle
}

function closestOpponentToBall(gs: GS, team: Team) {
  return nearestPieceToBall(
    gs.pieces.filter((piece) => piece.team !== team),
    gs.ball,
  ).piece
}

function isAttackingHalf(team: Team, x: number) {
  return team === "A" ? x > MID_X : x < MID_X
}

function goalVector(team: Team, gs: GS) {
  const gx = opponentGoalX(team)
  const gy = VH / 2
  const dx = gx - gs.ball.x
  const dy = gy - gs.ball.y
  const len = Math.hypot(dx, dy) || 1

  return { x: dx / len, y: dy / len }
}

function driveBehindBallTarget(piece: GPiece, gs: GS): TacticalTarget {
  const towardGoal = goalVector(piece.team, gs)

  return clampFieldTarget({
    x: gs.ball.x - towardGoal.x * (PR + 18),
    y: gs.ball.y - towardGoal.y * (PR + 18),
    intent: "drive",
  })
}

function defensiveClearanceTarget(
  piece: GPiece,
  gs: GS,
): TacticalTarget {
  const direction = side(piece.team)
  const targetY = clamp(
    gs.ball.y + (VH / 2 - gs.ball.y) * 0.45,
    VH * 0.2,
    VH * 0.8,
  )
  const aimX = gs.ball.x + direction * 420
  const aimY = targetY
  const dx = aimX - gs.ball.x
  const dy = aimY - gs.ball.y
  const distance = Math.hypot(dx, dy) || 1

  return clampFieldTarget({
    x: gs.ball.x - (dx / distance) * (PR + 18),
    y: gs.ball.y - (dy / distance) * (PR + 18),
    intent: "drive",
  })
}

function ballTarget(gs: GS): TacticalTarget {
  return { x: gs.ball.x, y: gs.ball.y, intent: "ball" }
}

function goalTarget(piece: GPiece): TacticalTarget {
  return {
    x: opponentGoalX(piece.team) - side(piece.team) * 26,
    y: VH / 2,
    intent: "goal",
  }
}

function findPrimaryChasers(
  gs: GS,
  settings: GameSettings,
  playerTeam: Team | null,
) {
  const chasers = new Set<number>()

  for (const team of ["A", "B"] as Team[]) {
    const pressRadius = AI_DIFFICULTY[
      getPieceDifficulty(settings, team, playerTeam)
    ].pressRadius
    const teamPieces = gs.pieces.filter(
      (piece) => piece.team === team && piece.role !== "GOL",
    )
    const nearest = nearestPieceToBall(
      teamPieces.filter((piece) => !piece.isPlayerControlled),
      gs.ball,
    )
    const nearestTeamPiece = nearestPieceToBall(teamPieces, gs.ball)

    if (
      nearest.piece &&
      nearest.distance < pressRadius &&
      (!nearestTeamPiece.piece?.isPlayerControlled ||
        nearest.distance < nearestTeamPiece.distance)
    ) {
      chasers.add(nearest.piece.id)
    }
  }

  return chasers
}

export function getTacticalContext(gs: GS, dt = 1 / 120): TacticalContext {
  const perception = perceiveBall(gs, dt)
  const context = makeStrategyContext(perception, gs)
  return { ...context, closestToBall: perception.nearest }
}
function goalkeeperTarget(piece: GPiece, gs: GS): TacticalTarget {
  const goalX = ownGoalX(piece.team)
  const direction = side(piece.team)
  const distanceFromGoal = Math.abs(gs.ball.x - goalX)
  const keeperDepth = clamp(distanceFromGoal * 0.22, PR * 1.5, PENALTY_DEPTH * 0.8)
  const keeperX = goalX + direction * keeperDepth
  const ballMovingTowardGoal = gs.ball.vx * direction < -35
  const timeToGoal = ballMovingTowardGoal
    ? clamp((goalX - gs.ball.x) / gs.ball.vx, 0, 1.25)
    : 0
  const rawY = gs.ball.y + gs.ball.vy * timeToGoal
  const span = VH - PR * 2
  const period = span * 2
  const folded = ((rawY - PR) % period + period) % period
  const predictedBallY = PR + (folded <= span ? folded : period - folded)
  const lineRatio = ballMovingTowardGoal
    ? 0.9
    : clamp(keeperDepth / Math.max(distanceFromGoal, keeperDepth), 0, 0.82)
  const targetY =
    VH / 2 + (predictedBallY - VH / 2) * lineRatio

  return {
    x: keeperX,
    y: clamp(targetY, VH * 0.38 + PR, VH * 0.62 - PR),
    intent: "formation",
  }
}

function defenderTarget(piece: GPiece, gs: GS, state: TeamState): TacticalTarget {
  const ownX = ownGoalX(piece.team)
  const deepDanger = piece.team === "A" ? gs.ball.x < RISK_DEPTH : gs.ball.x > VW - RISK_DEPTH
  const closeEnoughToClear = vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < 240

  if (deepDanger || (state === "NEUTRO" && closeEnoughToClear)) return ballTarget(gs)

  const betweenX = ownX + (gs.ball.x - ownX) * 0.42
  const stopLine = piece.team === "A" ? MID_X - PR * 2 : MID_X + PR * 2

  return {
    x: piece.team === "A" ? Math.min(betweenX, stopLine) : Math.max(betweenX, stopLine),
    y: clamp(gs.ball.y + mirrorYOffset(piece) * 42, VH * 0.18, VH * 0.82),
    intent: "formation",
  }
}

function fullbackTarget(piece: GPiece, gs: GS, state: TeamState): TacticalTarget {
  const laneY = piece.y < VH / 2 ? VH * 0.18 : VH * 0.82
  const attackingX = homeX(piece.team, clamp(gs.ball.x + side(piece.team) * 90, 360, VW - 220))
  const defensiveX = homeX(piece.team, 230)
  const looseNearby = state === "NEUTRO" && vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < 230

  if (looseNearby) return ballTarget(gs)
  return {
    x: state === "OFENSIVO" ? attackingX : defensiveX,
    y: clamp(laneY + (gs.ball.y - VH / 2) * 0.18, VH * 0.1, VH * 0.9),
    intent: "formation",
  }
}

function midfielderAnchorTarget(piece: GPiece, gs: GS, state: TeamState): TacticalTarget {
  const nearLooseBall = state !== "OFENSIVO" && vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < 260
  if (nearLooseBall) return ballTarget(gs)

  if (state === "DEFENSIVO") {
    return {
      x: homeX(piece.team, 300),
      y: clamp(VH / 2 + (gs.ball.y - VH / 2) * 0.45, VH * 0.25, VH * 0.75),
      intent: "formation",
    }
  }

  if (vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < BALL_CONTROL_RADIUS * 1.25) {
    return driveBehindBallTarget(piece, gs)
  }

  const desiredX = state === "OFENSIVO" ? homeX(piece.team, 470) : gs.ball.x - side(piece.team) * 70
  const ballLineX = piece.team === "A" ? Math.min(desiredX, gs.ball.x - 25) : Math.max(desiredX, gs.ball.x + 25)

  return { x: ballLineX, y: clamp(VH / 2 + (gs.ball.y - VH / 2) * 0.25, VH * 0.3, VH * 0.7), intent: "formation" }
}

function playmakerTarget(piece: GPiece, gs: GS, state: TeamState): TacticalTarget {
  const distanceToBall = vdist(piece.x, piece.y, gs.ball.x, gs.ball.y)

  if (distanceToBall < BALL_CONTROL_RADIUS * 1.5) {
    const opponentAhead = gs.pieces.some((opponent) => {
      if (opponent.team === piece.team) return false
      const ahead = piece.team === "A" ? opponent.x > piece.x : opponent.x < piece.x
      return ahead && vdist(piece.x, piece.y, opponent.x, opponent.y) < 180
    })

    return opponentAhead ? goalTarget(piece) : driveBehindBallTarget(piece, gs)
  }

  if (state === "DEFENSIVO") {
    return {
      x: (gs.ball.x + homeX(piece.team, 220)) / 2,
      y: (gs.ball.y + VH / 2) / 2,
      intent: "formation",
    }
  }

  const opponents = gs.pieces.filter((candidate) => candidate.team !== piece.team)
  const options: TacticalTarget[] = [
    { x: homeX(piece.team, 560), y: VH * 0.34 },
    { x: homeX(piece.team, 650), y: VH * 0.5 },
    { x: homeX(piece.team, 560), y: VH * 0.66 },
  ].map((target) => ({ ...target, intent: "formation" }))

  return options.reduce((best, option) => {
    const score = Math.min(...opponents.map((opponent) => vdist(option.x, option.y, opponent.x, opponent.y)))
    const bestScore = Math.min(...opponents.map((opponent) => vdist(best.x, best.y, opponent.x, opponent.y)))
    return score > bestScore ? option : best
  }, { ...options[0], intent: "formation" } as TacticalTarget)
}

function attackerTarget(piece: GPiece, gs: GS, state: TeamState): TacticalTarget {
  const distanceToBall = vdist(piece.x, piece.y, gs.ball.x, gs.ball.y)
  const ballInAttackingHalf = isAttackingHalf(piece.team, gs.ball.x)

  if (ballInAttackingHalf && (state !== "OFENSIVO" || distanceToBall < 360)) {
    return distanceToBall < BALL_CONTROL_RADIUS * 1.4 ? driveBehindBallTarget(piece, gs) : ballTarget(gs)
  }

  if (state === "OFENSIVO" && distanceToBall < 190) {
    return driveBehindBallTarget(piece, gs)
  }

  if (state === "DEFENSIVO") {
    const carrier = closestOpponentToBall(gs, piece.team)
    return carrier ? { x: carrier.x, y: carrier.y, intent: "ball" } : ballTarget(gs)
  }

  const goalX = opponentGoalX(piece.team)
  return {
    x: goalX - side(piece.team) * 82,
    y: clamp(VH / 2 + mirrorYOffset(piece) * 54 + (gs.ball.y - VH / 2) * 0.2, VH * 0.28, VH * 0.72),
    intent: "goal",
  }
}

export function getTacticalTarget(piece: GPiece, gs: GS, context: TacticalContext): TacticalTarget {
  const role = piece.role ?? "MEI"
  const state = context.states[piece.team]

  if (state === "NEUTRO" && vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < 260) {
    return ballTarget(gs)
  }

  const targetByRole: Record<Role, () => TacticalTarget> = {
    GOL: () => goalkeeperTarget(piece, gs),
    ZAG: () => defenderTarget(piece, gs, state),
    LAT: () => fullbackTarget(piece, gs, state),
    VOL: () => midfielderAnchorTarget(piece, gs, state),
    MEI: () => playmakerTarget(piece, gs, state),
    ATA: () => attackerTarget(piece, gs, state),
  }

  return clampFieldTarget(targetByRole[role]())
}

function applySeparation(piece: GPiece, pieces: GPiece[]): Vec {
  let sx = 0
  let sy = 0

  for (const other of pieces) {
    if (other.id === piece.id) continue
    const dx = piece.x - other.x
    const dy = piece.y - other.y
    const d = Math.hypot(dx, dy)
    const sameTeam = other.team === piece.team
    const radius = PR * (sameTeam ? 3.5 : 3)
    if (d <= 0.001 || d > radius) continue
    const strength = ((radius - d) / radius) * (sameTeam ? 1 : 0.65)
    sx += (dx / d) * strength
    sy += (dy / d) * strength
  }

  return { x: sx, y: sy }
}

function getMotionWatch(piece: GPiece, gs: GS, dt: number): Vec | null {
  let watch = gs.pieceMotionWatch[piece.id]
  if (!watch) {
    watch = {
      anchorX: piece.x,
      anchorY: piece.y,
      stillTime: 0,
      escapeX: 0,
      escapeY: 0,
      escapeTime: 0,
    }
    gs.pieceMotionWatch[piece.id] = watch
  }

  const distanceFromAnchor = vdist(
    piece.x,
    piece.y,
    watch.anchorX,
    watch.anchorY,
  )
  if (distanceFromAnchor > STATIONARY_REGION_RADIUS) {
    watch.anchorX = piece.x
    watch.anchorY = piece.y
    watch.stillTime = 0
    watch.escapeTime = 0
    return null
  }

  if (watch.escapeTime > 0) {
    watch.escapeTime = Math.max(0, watch.escapeTime - dt)
    return { x: watch.escapeX, y: watch.escapeY }
  }

  watch.stillTime += dt
  if (watch.stillTime < STATIONARY_TIME_LIMIT) return null

  const separation = applySeparation(piece, gs.pieces)
  let escapeX = separation.x
  let escapeY = separation.y
  let escapeLength = Math.hypot(escapeX, escapeY)

  if (escapeLength > 0.05) {
    escapeX /= escapeLength
    escapeY /= escapeLength
  } else if (piece.role === "GOL") {
    escapeX = 0
    escapeY =
      piece.y < VH * 0.42 || piece.y <= PR * 2
        ? 1
        : piece.y > VH * 0.58 || piece.y >= VH - PR * 2
          ? -1
          : piece.y < VH / 2
            ? -1
            : 1
  } else {
    escapeX = side(piece.team)
    escapeY = piece.y < VH / 2 ? 0.35 : -0.35
  }

  escapeLength = Math.hypot(escapeX, escapeY) || 1
  watch.anchorX = piece.x
  watch.anchorY = piece.y
  watch.stillTime = 0
  watch.escapeX = escapeX / escapeLength
  watch.escapeY = escapeY / escapeLength
  watch.escapeTime = UNSTUCK_DURATION

  return { x: watch.escapeX, y: watch.escapeY }
}

function formationTarget(
  piece: GPiece,
  gs: GS,
  context: TacticalContext,
): TacticalTarget {
  const teamPieces = gs.pieces.filter((candidate) => candidate.team === piece.team)
  const pieceIndex = teamPieces.findIndex((candidate) => candidate.id === piece.id)
  const positions = computeHomeNormalized(teamPieces.map((candidate) => candidate.role))
  const normalized = positions[pieceIndex] ?? { x: 0.5, y: 0.5 }
  const anchor = piece.team === "A"
    ? homeToCanvas(normalized)
    : awayToCanvas(normalized)
  const state = context.states[piece.team]
  const isGoalkeeper = piece.role === "GOL"
  const ballShiftX = isGoalkeeper
    ? (gs.ball.x - MID_X) * 0.04
    : (gs.ball.x - MID_X) * 0.14
  const tacticalShiftX = state === "OFENSIVO"
    ? side(piece.team) * (isGoalkeeper ? 0 : 48)
    : state === "DEFENSIVO"
      ? -side(piece.team) * (isGoalkeeper ? 0 : 24)
      : 0
  const ballShiftY = isGoalkeeper
    ? (gs.ball.y - VH / 2) * 0.12
    : (gs.ball.y - VH / 2) * 0.2

  return clampFieldTarget({
    x: anchor.x + ballShiftX + tacticalShiftX,
    y: anchor.y + ballShiftY,
    intent: "formation",
  })
}

export function applyTacticalAi(gs: GS, settings: GameSettings, dt: number) {
  const playerTeam = getPlayerTeam(gs)
  const context = getTacticalContext(gs, dt)
  const strategyContext = makeStrategyContext(context, gs)
  if (gs.aiPassTimer !== undefined && gs.aiPassTimer > 0) {
    gs.aiPassTimer = Math.max(0, gs.aiPassTimer - dt)
    const receiver = gs.aiPassReceiverId === null || gs.aiPassReceiverId === undefined
      ? null
      : gs.pieces.find((candidate) => candidate.id === gs.aiPassReceiverId)
    const received = receiver && gs.aiPassTeam === context.possessionTeam &&
      vdist(receiver.x, receiver.y, gs.ball.x, gs.ball.y) <= PR + BR + 35
    const intercepted = gs.aiPassTeam !== null && gs.aiPassTeam !== undefined &&
      context.possessionTeam !== null && context.possessionTeam !== gs.aiPassTeam
    const nearestTeammate = gs.aiPassTeam === null || gs.aiPassTeam === undefined
      ? null
      : context.nearestByTeam[gs.aiPassTeam]
    const redirected = receiver && nearestTeammate &&
      nearestTeammate.id !== receiver.id &&
      context.possessionTeam === gs.aiPassTeam &&
      Math.hypot(gs.ball.vx, gs.ball.vy) < 180 &&
      vdist(nearestTeammate.x, nearestTeammate.y, gs.ball.x, gs.ball.y) <= PR + BR + 28
    if (gs.aiPassTimer === 0 || received || intercepted || redirected) {
      gs.aiPassTimer = 0
      gs.aiPassReceiverId = null
      gs.aiPassTeam = null
    }
  }
  const assignments = coordinateTeam(gs, strategyContext, settings)
  const primaryChasers = findPrimaryChasers(gs, settings, playerTeam)

  for (const piece of gs.pieces) {
    const difficulty = getPieceDifficulty(settings, piece.team, playerTeam)
    const profile = AI_DIFFICULTY[difficulty]
    piece.isPrimaryChaser = primaryChasers.has(piece.id)
    if (piece.isPlayerControlled) {
      delete gs.aiDecisionStates[piece.id]
      continue
    }

    let decision = gs.aiDecisionStates[piece.id]
    if (!decision) {
      decision = {
        decisionTimer: 0,
        targetX: piece.x,
        targetY: piece.y,
        targetIntent: "formation",
        action: "HOLD",
        pendingAction: "HOLD",
        pendingX: piece.x,
        pendingY: piece.y,
        reactionTimer: 0,
        kickTargetX: opponentGoalX(piece.team),
        kickTargetY: VH / 2,
        kickCooldown: 0,
        kickIntentTimer: 0,
        targetLockTimer: 0,
      }
      gs.aiDecisionStates[piece.id] = decision
    }

    const decisionInterval = difficulty === "hard" ? 0.045 : 0.1
    decision.decisionTimer -= dt
    decision.reactionTimer = Math.max(0, decision.reactionTimer - dt)
    decision.kickCooldown = Math.max(0, decision.kickCooldown - dt)
    decision.kickIntentTimer = Math.max(0, decision.kickIntentTimer - dt)
    decision.targetLockTimer = Math.max(0, decision.targetLockTimer - dt)
    const shouldDecide = decision.decisionTimer <= 0
    if (shouldDecide) decision.decisionTimer += decisionInterval

    const ownGoalDistance = (gs.ball.x - ownGoalX(piece.team)) * side(piece.team)
    const isDefender = piece.role === "ZAG" || piece.role === "LAT" || piece.role === "VOL"
    const clearingOwnArea = piece.isPrimaryChaser && isDefender && ownGoalDistance >= 0 && ownGoalDistance < profile.clearanceRadius
    const goalkeeper = piece.role === "GOL"

    if (shouldDecide) {
      const formation = formationTarget(piece, gs, context)
      const goalkeeperHasBall = goalkeeper &&
        vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= 150
      let selected = goalkeeper && !goalkeeperHasBall && assignments[piece.id] !== "RECEIVE"
        ? {
            action: "HOLD" as const,
            target: goalkeeperTarget(piece, gs),
          }
        : chooseAction(
            piece,
            gs,
            strategyContext,
            settings,
            formation,
            assignments[piece.id],
          )
      const preparingKick =
        (!goalkeeper || goalkeeperHasBall) &&
        decision.kickIntentTimer > 0 &&
        (decision.action === "PASS" || decision.action === "SHOOT") &&
        vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) < 210
      if (preparingKick) {
        selected = {
          action: decision.action as "PASS" | "SHOOT",
          score: 0,
          target: getKickApproachTarget(
            gs,
            decision.kickTargetX,
            decision.kickTargetY,
          ),
        }
      }
      let target = { ...selected.target }
      if (piece.isPrimaryChaser && clearingOwnArea && selected.action === "PRESS") {
        target = defensiveClearanceTarget(piece, gs)
      }
      if (["RUN", "OUTLET", "WIDE", "COVER", "SUPPORT"].includes(selected.action)) {
        target = avoidTeammateCrowding(piece, gs, target)
      }
      const preciseKickApproach = selected.action === "PASS" || selected.action === "SHOOT"
      if (
        !goalkeeper &&
        !preciseKickApproach &&
        selected.action !== "PRESS" &&
        selected.action !== "INTERCEPT"
      ) {
        target = {
          ...target,
          x: target.x + (formation.x - target.x) * profile.formationDiscipline,
          y: target.y + (formation.y - target.y) * profile.formationDiscipline,
        }
      }
      const committedMovement = ["RUN", "OUTLET", "WIDE", "COVER", "SUPPORT"].includes(selected.action)
      if (selected.action === decision.action && committedMovement) {
        const targetDrift = vdist(target.x, target.y, decision.targetX, decision.targetY)
        if (decision.targetLockTimer > 0 && targetDrift < 180) {
          target = { ...target, x: decision.targetX, y: decision.targetY }
        } else {
          decision.targetLockTimer = selected.action === "RUN" ? 0.42 : selected.action === "WIDE" ? 0.52 : 0.32
        }
      }
      if (target.aimX !== undefined && target.aimY !== undefined && !preparingKick) {
        decision.kickTargetX = target.aimX
        decision.kickTargetY = target.aimY
        decision.kickReceiverId = "receiverId" in target
          ? target.receiverId ?? null
          : null
        if (selected.action === "PASS" || selected.action === "SHOOT") {
          decision.kickIntentTimer = 0.55
        }
      }

      const immediateAction = selected.action === "PASS" || selected.action === "SHOOT"
      if (selected.action === decision.action || immediateAction) {
        decision.action = selected.action
        decision.pendingAction = selected.action
        decision.reactionTimer = 0
        decision.targetX = target.x
        decision.targetY = target.y
        decision.targetIntent = target.intent
      } else {
        if (decision.pendingAction !== selected.action) {
          decision.pendingAction = selected.action
          decision.pendingX = target.x
          decision.pendingY = target.y
          decision.reactionTimer = profile.reactionDelay
        } else {
          decision.pendingX = target.x
          decision.pendingY = target.y
        }
        if (decision.reactionTimer <= 0) {
          decision.action = selected.action
          decision.targetX = decision.pendingX
          decision.targetY = decision.pendingY
          decision.targetIntent = target.intent
          decision.targetLockTimer = selected.action === "RUN" ? 0.42 : selected.action === "WIDE" ? 0.52 : committedMovement ? 0.32 : 0
        }
      }
    }

    const kickApproach = decision.action === "PASS" || decision.action === "SHOOT"
    const aggressive = piece.isPrimaryChaser || decision.action === "PRESS" || decision.action === "INTERCEPT" || decision.action === "RUN" || decision.action === "OUTLET" || decision.action === "WIDE" || decision.action === "RECEIVE" || kickApproach || decision.targetIntent === "ball" || decision.targetIntent === "drive" || decision.targetIntent === "goal"
    const speedAttr = settings.attrs[piece.type].speed
    const maxSpeed = getAiMaxSpeed(piece, aggressive, speedAttr) *
      (difficulty === "hard" ? 1.22 : difficulty === "medium" ? 1.08 : 1)
    const escape = getMotionWatch(piece, gs, dt)
    const escapeWeight = escape ? 0.7 : 0
    const targetX = decision.targetX * (1 - escapeWeight) + (piece.x + (escape?.x ?? 0) * 100) * escapeWeight
    const targetY = decision.targetY * (1 - escapeWeight) + (piece.y + (escape?.y ?? 0) * 100) * escapeWeight
    const acceleration = (aggressive ? 13 + speedAttr / 14 : 7.2 + speedAttr / 25) * (goalkeeper ? 1.5 : 1)
    steerToTarget(piece, {
      targetX,
      targetY,
      maxSpeed,
      acceleration,
      dt,
      pieces: gs.pieces,
      separationStrength: kickApproach
        ? profile.separationStrength * 0.18
        : profile.separationStrength,
    })
  }
}

export function getTacticalAiKickIntents(gs: GS) {
  return gs.pieces.flatMap((piece) => {
    const decision = gs.aiDecisionStates[piece.id]
    if (
      !decision ||
      piece.isPlayerControlled ||
      vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) > PR + BR + 10
    ) return []
    if (decision.action !== "PASS" && decision.action !== "SHOOT") return []
    if (decision.kickCooldown > 0) return []
    return [{
      piece,
      action: decision.action,
      x: decision.kickTargetX,
      y: decision.kickTargetY,
      receiverId: decision.kickReceiverId ?? null,
    }]
  })
}

export function selectClosestPlayerToBall(gs: GS, team: Team = "A") {
  const teamPieces = gs.pieces.filter((piece) => piece.team === team)
  const nearest = nearestPieceToBall(teamPieces, gs.ball).piece
  if (!nearest) return

  for (const piece of teamPieces) {
    piece.isPlayerControlled = piece.id === nearest.id
  }

  gs.selectedIdx = teamPieces.findIndex((piece) => piece.id === nearest.id)
  gs.pieceVx = nearest.vx
  gs.pieceVy = nearest.vy
}
