import type { GameSettings, GPiece, GS, Team } from "@/types"
import { PR, TACTICAL_DISTANCE_SCALE, vdist } from "@/constants/physics"

export interface AiDifficultyProfile {
  pressRadius: number
  spinRadius: number
  goalkeeperSpinRadius: number
  clearanceRadius: number
  goalShotDistance: number
  formationDiscipline: number
  separationStrength: number
  reactionDelay: number
}

export const AI_DIFFICULTY: Record<
  NonNullable<GameSettings["difficulty"]>,
  AiDifficultyProfile
> = {
  easy: {
    pressRadius: 600 * TACTICAL_DISTANCE_SCALE,
    spinRadius: PR * 2.2,
    goalkeeperSpinRadius: 300 * TACTICAL_DISTANCE_SCALE,
    clearanceRadius: 260 * TACTICAL_DISTANCE_SCALE,
    goalShotDistance: 260 * TACTICAL_DISTANCE_SCALE,
    formationDiscipline: 0.3,
    separationStrength: 1,
    reactionDelay: 0.34,
  },
  medium: {
    pressRadius: 820 * TACTICAL_DISTANCE_SCALE,
    spinRadius: PR * 3,
    goalkeeperSpinRadius: 620 * TACTICAL_DISTANCE_SCALE,
    clearanceRadius: 390 * TACTICAL_DISTANCE_SCALE,
    goalShotDistance: 360 * TACTICAL_DISTANCE_SCALE,
    formationDiscipline: 0.18,
    separationStrength: 1.2,
    reactionDelay: 0.18,
  },
  hard: {
    pressRadius: 1020 * TACTICAL_DISTANCE_SCALE,
    spinRadius: PR * 4,
    goalkeeperSpinRadius: 1000 * TACTICAL_DISTANCE_SCALE,
    clearanceRadius: 540 * TACTICAL_DISTANCE_SCALE,
    goalShotDistance: 520 * TACTICAL_DISTANCE_SCALE,
    formationDiscipline: 0.06,
    separationStrength: 1.15,
    reactionDelay: 0.015,
  },
}

export function getPlayerTeam(gs: GS): Team | null {
  return gs.pieces.find((piece) => piece.isPlayerControlled)?.team ?? null
}

export function getPieceDifficulty(
  settings: GameSettings,
  team: Team,
  playerTeam: Team | null,
): NonNullable<GameSettings["difficulty"]> {
  return team === playerTeam ? "medium" : settings.difficulty ?? "medium"
}

function nearestPieceToBall(pieces: GPiece[], gs: GS) {
  let best: GPiece | null = null
  let bestDistance = Infinity

  for (const piece of pieces) {
    const distance = vdist(piece.x, piece.y, gs.ball.x, gs.ball.y)
    if (distance < bestDistance) {
      best = piece
      bestDistance = distance
    }
  }

  return { piece: best, distance: bestDistance }
}

/** Marks at most one AI challenger for each team, using that team's effective difficulty. */
export function findPrimaryChasers(
  gs: GS,
  settings: GameSettings,
  playerTeam: Team | null,
) {
  const chasers = new Set<number>()

  for (const team of ["A", "B"] as const) {
    const pressRadius = AI_DIFFICULTY[
      getPieceDifficulty(settings, team, playerTeam)
    ].pressRadius
    const teamPieces = gs.pieces.filter(
      (piece) => piece.team === team && piece.role !== "GOL",
    )
    const nearest = nearestPieceToBall(
      teamPieces.filter((piece) => !piece.isPlayerControlled),
      gs,
    )
    const nearestTeamPiece = nearestPieceToBall(teamPieces, gs)

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
