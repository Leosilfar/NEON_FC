import type { GPiece, GS } from "@/types"
import { PR, VH, clamp } from "@/constants/physics"
import type { AiTarget } from "./strategy/context"
import { direction as getDirection, ownGoalX } from "./strategy/targets"

const PENALTY_DEPTH = 170

export function getGoalkeeperTarget(piece: GPiece, gs: GS): AiTarget {
  const goalX = ownGoalX(piece.team)
  const direction = getDirection(piece.team)
  const distanceFromGoal = Math.abs(gs.ball.x - goalX)
  const keeperDepth = clamp(
    distanceFromGoal * 0.22,
    PR * 1.5,
    PENALTY_DEPTH * 0.8,
  )
  const keeperX = goalX + direction * keeperDepth
  const ballMovingTowardGoal = gs.ball.vx * direction < -35
  const timeToGoal = ballMovingTowardGoal
    ? clamp((goalX - gs.ball.x) / gs.ball.vx, 0, 1.25)
    : 0
  const rawY = gs.ball.y + gs.ball.vy * timeToGoal
  const span = VH - PR * 2
  const period = span * 2
  const folded = (((rawY - PR) % period) + period) % period
  const predictedBallY = PR + (folded <= span ? folded : period - folded)
  const lineRatio = ballMovingTowardGoal
    ? 0.9
    : clamp(keeperDepth / Math.max(distanceFromGoal, keeperDepth), 0, 0.82)
  const targetY = VH / 2 + (predictedBallY - VH / 2) * lineRatio

  return {
    x: keeperX,
    y: clamp(targetY, VH * 0.38 + PR, VH * 0.62 - PR),
    intent: "formation",
  }
}
