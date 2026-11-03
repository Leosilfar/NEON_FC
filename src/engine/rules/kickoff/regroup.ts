import type { GameSettings, GS, SlotPiece, Team } from "@/types"
import { VH, VW, clamp } from "@/constants/physics"
import { makeGS } from "@/engine/state"
import {
  estimateKickoffCompletionTime,
  getKickoffStrikeTarget,
  planKickoffRecovery,
} from "./planning"
import { REGROUP_BALL_X_MAX, REGROUP_BALL_X_MIN } from "./constants"
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
