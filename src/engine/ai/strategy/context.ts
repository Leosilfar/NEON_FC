import type { GameSettings, GPiece, GS, Team } from "@/types"
import type { BallPerception } from "@/engine/ai/perception"
import { clamp } from "@/constants/physics"
import { getAiMaxSpeed } from "@/engine/ai/steering"
export type TeamState = "OFENSIVO" | "DEFENSIVO" | "NEUTRO"
export type TeamPlan = "PROTECT" | "BALANCED" | "CHASE"
export type AiAction = "PRESS" | "INTERCEPT" | "COVER" | "SUPPORT" | "HOLD" | "ATTACK" | "RUN" | "OUTLET" | "WIDE" | "RECEIVE" | "PASS" | "SHOOT"
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

export function getTeamRoleProfile(
  gs: GS,
  team: Team,
  plan: TeamPlan,
): TeamRoleProfile {
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
  let pressSlots =
    attackers >= total * 0.65
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

export function estimateArrivalTime(
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
  const runSpeed = getAiMaxSpeed(piece, true, settings.attrs[piece.type].speed)
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
