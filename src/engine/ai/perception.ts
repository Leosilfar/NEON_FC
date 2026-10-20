import type { GPiece, GS, Team } from "@/types"
import { PR, VH, clamp, vdist } from "@/constants/physics"

export interface BallPerception {
  nearest: GPiece | null
  nearestByTeam: Record<Team, GPiece | null>
  distanceByTeam: Record<Team, number>
  predictedBall: { x: number; y: number }
  candidatePossession: Team | null
  possessionTeam: Team | null
  possessionConfidence: number
}

function nearestToBall(pieces: GPiece[], ballX: number, ballY: number) {
  let nearest: GPiece | null = null
  let distance = Infinity
  for (const piece of pieces) {
    const candidateDistance = vdist(piece.x, piece.y, ballX, ballY)
    if (candidateDistance < distance) {
      nearest = piece
      distance = candidateDistance
    }
  }
  return { nearest, distance }
}

/** Refreshes possession with a distance hysteresis and short persistence window. */
export function perceiveBall(gs: GS, dt: number): BallPerception {
  const nearest = nearestToBall(gs.pieces, gs.ball.x, gs.ball.y)
  const nearestA = nearestToBall(
    gs.pieces.filter((piece) => piece.team === "A"),
    gs.ball.x,
    gs.ball.y,
  )
  const nearestB = nearestToBall(
    gs.pieces.filter((piece) => piece.team === "B"),
    gs.ball.x,
    gs.ball.y,
  )
  const candidate =
    nearest.distance < 290 ? (nearest.nearest?.team ?? null) : null
  const current = gs.aiPossessionTeam
  const currentDistance =
    current === "A"
      ? nearestA.distance
      : current === "B"
        ? nearestB.distance
        : Infinity

  if (candidate === current) {
    gs.aiPossessionCandidate = null
    gs.aiPossessionCandidateTime = 0
  } else if (candidate === null) {
    gs.aiPossessionCandidate = null
    if (currentDistance > 340) {
      gs.aiPossessionCandidate = null
      gs.aiPossessionCandidateTime += dt
      if (gs.aiPossessionCandidateTime >= 0.18) {
        gs.aiPossessionTeam = null
        gs.aiPossessionCandidateTime = 0
      }
    } else {
      gs.aiPossessionCandidateTime = 0
    }
  } else {
    const candidateDistance =
      candidate === "A" ? nearestA.distance : nearestB.distance
    const clearAdvantage =
      current === null || candidateDistance + 20 < currentDistance
    if (!clearAdvantage) {
      gs.aiPossessionCandidate = null
      gs.aiPossessionCandidateTime = 0
    } else {
      if (gs.aiPossessionCandidate !== candidate) {
        gs.aiPossessionCandidate = candidate
        gs.aiPossessionCandidateTime = 0
      }
      gs.aiPossessionCandidateTime += dt
      const threshold = current === null ? 0.06 : 0.1
      if (gs.aiPossessionCandidateTime >= threshold) {
        gs.aiPossessionTeam = candidate
        gs.aiPossessionCandidate = null
        gs.aiPossessionCandidateTime = 0
      }
    }
  }

  const possessionTeam = gs.aiPossessionTeam
  return {
    nearest: nearest.nearest,
    nearestByTeam: { A: nearestA.nearest, B: nearestB.nearest },
    distanceByTeam: { A: nearestA.distance, B: nearestB.distance },
    predictedBall: {
      x: gs.ball.x + gs.ball.vx * 0.24,
      y: clamp(gs.ball.y + gs.ball.vy * 0.24, PR, VH - PR),
    },
    candidatePossession: candidate,
    possessionTeam,
    possessionConfidence:
      candidate === possessionTeam ? 1 : candidate === null ? 0 : 0.5,
  }
}
