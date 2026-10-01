import type { GPiece, GS, Role, Team } from "@/types"

import { MOVE_SPD, PR, VH, VW, clamp, vdist } from "@/constants/physics"
import type { GameSettings } from "@/types"

export type TeamState = "OFENSIVO" | "DEFENSIVO" | "NEUTRO"

export interface TacticalContext {
  possessionTeam: Team | null
  states: Record<Team, TeamState>
  closestToBall: GPiece | null
}

interface Vec {
  x: number
  y: number
}

type TargetIntent = "formation" | "ball" | "drive" | "goal"

interface TacticalTarget extends Vec {
  intent: TargetIntent
}

const PENALTY_DEPTH = 170
const RISK_DEPTH = 260
const MID_X = VW / 2
const BALL_CONTROL_RADIUS = 74
const ACTIVE_CHASE_RADIUS = 900

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

function findPrimaryChasers(gs: GS) {
  const chasers = new Set<number>()

  for (const team of ["A", "B"] as Team[]) {
    const candidates = gs.pieces.filter((piece) => piece.team === team && !piece.isPlayerControlled)
    const nearest = nearestPieceToBall(candidates, gs.ball)
    if (nearest.piece && nearest.distance < ACTIVE_CHASE_RADIUS) {
      chasers.add(nearest.piece.id)
    }
  }

  return chasers
}

export function getTacticalContext(gs: GS): TacticalContext {
  const nearest = nearestPieceToBall(gs.pieces, gs.ball)
  const possessionTeam = nearest.distance < 210 ? nearest.piece?.team ?? null : null

  return {
    possessionTeam,
    closestToBall: nearest.piece,
    states: {
      A: possessionTeam === null ? "NEUTRO" : possessionTeam === "A" ? "OFENSIVO" : "DEFENSIVO",
      B: possessionTeam === null ? "NEUTRO" : possessionTeam === "B" ? "OFENSIVO" : "DEFENSIVO",
    },
  }
}

function goalkeeperTarget(piece: GPiece, gs: GS): TacticalTarget {
  const goalX = ownGoalX(piece.team)
  const areaX = piece.team === "A"
    ? clamp(gs.ball.x * 0.12, PR * 2, PENALTY_DEPTH)
    : clamp(VW - (VW - gs.ball.x) * 0.12, VW - PENALTY_DEPTH, VW - PR * 2)
  const ballToGoalY = VH / 2 + (gs.ball.y - VH / 2) * 0.45

  return {
    x: goalX === 0 ? Math.max(areaX, PR * 2) : Math.min(areaX, VW - PR * 2),
    y: clamp(ballToGoalY, VH * 0.32, VH * 0.68),
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
  const options = [
    { x: homeX(piece.team, 560), y: VH * 0.34 },
    { x: homeX(piece.team, 650), y: VH * 0.5 },
    { x: homeX(piece.team, 560), y: VH * 0.66 },
  ]

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

  const targetByRole: Record<Role, () => Vec> = {
    GOL: () => goalkeeperTarget(piece, gs),
    ZAG: () => defenderTarget(piece, gs, state),
    LAT: () => fullbackTarget(piece, gs, state),
    VOL: () => midfielderAnchorTarget(piece, gs, state),
    MEI: () => playmakerTarget(piece, gs, state),
    ATA: () => attackerTarget(piece, gs, state),
  }

  return clampFieldTarget(targetByRole[role]())
}

function applySeparation(piece: GPiece, allies: GPiece[]): Vec {
  let sx = 0
  let sy = 0

  for (const ally of allies) {
    if (ally.id === piece.id) continue
    const dx = piece.x - ally.x
    const dy = piece.y - ally.y
    const d = Math.hypot(dx, dy)
    if (d <= 0.001 || d > PR * 4.2) continue
    const strength = (PR * 4.2 - d) / (PR * 4.2)
    sx += (dx / d) * strength
    sy += (dy / d) * strength
  }

  return { x: sx, y: sy }
}

export function applyTacticalAi(gs: GS, settings: GameSettings, dt: number) {
  const context = getTacticalContext(gs)
  const primaryChasers = findPrimaryChasers(gs)

  for (const piece of gs.pieces) {
    piece.isPrimaryChaser = primaryChasers.has(piece.id)
    if (piece.isPlayerControlled) continue

    const target = piece.isPrimaryChaser ? ballTarget(gs) : getTacticalTarget(piece, gs, context)
    const dx = target.x - piece.x
    const dy = target.y - piece.y
    const distance = Math.hypot(dx, dy)
    const speedAttr = settings.attrs[piece.type].speed
    const aggressive = piece.isPrimaryChaser || target.intent === "ball" || target.intent === "drive" || target.intent === "goal"
    const maxSpeed = MOVE_SPD * (aggressive ? 0.56 + speedAttr / 170 : 0.28 + speedAttr / 260)
    const arrival = aggressive ? 1 : clamp(distance / 115, 0.12, 1)
    const desiredSpeed = maxSpeed * arrival
    const sep = applySeparation(piece, gs.pieces.filter((ally) => ally.team === piece.team))
    const nx = distance > 0.001 ? dx / distance : 0
    const ny = distance > 0.001 ? dy / distance : 0
    const separationWeight = aggressive ? 36 : 80
    const desiredVx = nx * desiredSpeed + sep.x * separationWeight
    const desiredVy = ny * desiredSpeed + sep.y * separationWeight
    const accel = aggressive ? 13 + speedAttr / 14 : 7.2 + speedAttr / 25
    const t = Math.min(1, accel * dt)

    piece.vx += (desiredVx - piece.vx) * t
    piece.vy += (desiredVy - piece.vy) * t

    const speed = Math.hypot(piece.vx, piece.vy)
    if (speed > maxSpeed) {
      piece.vx = (piece.vx / speed) * maxSpeed
      piece.vy = (piece.vy / speed) * maxSpeed
    }
  }
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
