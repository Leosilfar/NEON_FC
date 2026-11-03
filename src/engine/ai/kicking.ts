import type { GameSettings, GPiece, GS, Team } from "@/types"
import { BR, PR, VH, VW, clamp, vdist } from "@/constants/physics"
import { getPieceKickNormal } from "@/engine/physics"
import {
  AI_DIFFICULTY,
  findPrimaryChasers,
  getPieceDifficulty,
  getPlayerTeam,
  type AiDifficultyProfile,
} from "@/engine/ai/difficulty"

interface Vec {
  x: number
  y: number
}

function side(team: Team) {
  return team === "A" ? 1 : -1
}

function opponentGoalX(team: Team) {
  return team === "A" ? VW : 0
}

function ownGoalX(team: Team) {
  return team === "A" ? 0 : VW
}

const MID_X = VW / 2

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
            const timeToGoal = clamp(
              (ownGoalX(piece.team) - gs.ball.x) / gs.ball.vx,
              0,
              1.25,
            )
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
