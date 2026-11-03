import type { GPiece, GS, Team } from "@/types"
import { PR, VH, VW, clamp } from "@/constants/physics"
import {
  awayToCanvas,
  computeHomeNormalized,
  homeToCanvas,
} from "@/utils/tactics"
import type { AiTarget, TeamState } from "./strategy/context"

interface PositioningContext {
  states: Record<Team, TeamState>
}

function side(team: Team) {
  return team === "A" ? 1 : -1
}

function clampFieldTarget(target: AiTarget): AiTarget {
  return {
    ...target,
    x: clamp(target.x, PR * 1.5, VW - PR * 1.5),
    y: clamp(target.y, PR * 1.5, VH - PR * 1.5),
  }
}

const MID_X = VW / 2
export function getFormationTarget(
  piece: GPiece,
  gs: GS,
  context: PositioningContext,
): AiTarget {
  const teamPieces = gs.pieces.filter(
    (candidate) => candidate.team === piece.team,
  )
  const pieceIndex = teamPieces.findIndex(
    (candidate) => candidate.id === piece.id,
  )
  const positions = computeHomeNormalized(
    teamPieces.map((candidate) => candidate.role),
  )
  const normalized = positions[pieceIndex] ?? { x: 0.5, y: 0.5 }
  const anchor =
    piece.team === "A" ? homeToCanvas(normalized) : awayToCanvas(normalized)
  const state = context.states[piece.team]
  const isGoalkeeper = piece.role === "GOL"
  const ballShiftX = isGoalkeeper
    ? (gs.ball.x - MID_X) * 0.04
    : (gs.ball.x - MID_X) * 0.14
  const tacticalShiftX =
    state === "OFENSIVO"
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
