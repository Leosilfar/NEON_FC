import type { GameSettings, GPiece, GS } from "@/types"
import { BR, PR, VH, VW, clamp, vdist } from "@/constants/physics"
import {
  awayToCanvas,
  computeHomeNormalized,
  homeToCanvas,
} from "@/utils/tactics"
import type { AiAction, AiTarget, StrategyContext } from "./context"
import { getTeamRoleProfile } from "./context"
import {
  bestPassTarget,
  bestRunTarget,
  bestShotTarget,
  clampTarget,
  direction,
  goalX,
  ownGoalX,
  passReceiveTarget,
  strikeApproachTarget,
} from "./targets"
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
      ? direction(piece.team) *
        (plan === "PROTECT" ? 18 : plan === "CHASE" ? 88 : 48)
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
    .filter(
      (candidate) => candidate.team === piece.team && candidate.role !== "GOL",
    )
    .sort((a, b) => a.id - b.id)
  const supportIndex = teammates.findIndex(
    (candidate) => candidate.id === piece.id,
  )
  const supportLane = supportIndex - (teammates.length - 1) / 2
  const homeSlots = computeHomeNormalized(
    teammates.map((teammate) => teammate.role),
  )
  const normalizedSlot = homeSlots[supportIndex] ?? { x: 0.5, y: 0.5 }
  const formationPosition =
    piece.team === "A"
      ? homeToCanvas(normalizedSlot)
      : awayToCanvas(normalizedSlot)
  const role = piece.role ?? "MEI"
  const loneFullback =
    role === "LAT" &&
    teammates.filter((teammate) => teammate.role === "LAT").length === 1
  const laneY = loneFullback
    ? piece.id % 2 === 0
      ? VH * 0.18
      : VH * 0.82
    : formationPosition.y
  const roleDepth: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: -260,
    ZAG: -125,
    LAT: 105,
    VOL: -45,
    MEI: 125,
    ATA: 225,
  }
  const formationAttackBias =
    roleProfile.attackShare - roleProfile.defenseShare * 0.55
  const rawSupportDepth = roleDepth[role] + formationAttackBias * 130
  const planScale =
    rawSupportDepth >= 0
      ? plan === "CHASE"
        ? 1.3
        : plan === "PROTECT"
          ? 0.62
          : 1
      : plan === "CHASE"
        ? 0.45
        : plan === "PROTECT"
          ? 1.15
          : 1
  const supportDepth = rawSupportDepth * planScale
  const laneFollow: Record<NonNullable<GPiece["role"]>, number> = {
    GOL: 0.08,
    ZAG: 0.18,
    LAT: 0.2,
    VOL: 0.48,
    MEI: 0.62,
    ATA: 0.44,
  }
  const supportY =
    laneY * (1 - laneFollow[role]) + context.predictedBall.y * laneFollow[role]
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
  const ownFormationX =
    ownGoalX(piece.team) + (formationPosition.x - ownGoalX(piece.team)) * 0.8
  const interceptTarget = clampTarget({
    x: context.predictedBall.x - forwardSign * 88,
    y: laneY * 0.55 + context.predictedBall.y * 0.45,
    intent: "formation",
  })
  const supportTarget = clampTarget({
    x:
      context.predictedBall.x + forwardSign * (supportDepth + supportLane * 16),
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
    x:
      ownFormationX +
      (context.predictedBall.x - ownFormationX) * coverTracking +
      supportLane * 12,
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
  const shotScore =
    1.55 +
    shotQuality * 0.65 +
    shotLaneQuality * 0.7 +
    (goalDistance < 320 ? 0.35 : 0) +
    shotPlanBonus
  const isNearestTeammateToBall =
    context.nearestByTeam[piece.team]?.id === piece.id
  const canApproachForKick =
    isNearestTeammateToBall &&
    context.possessionTeam === piece.team &&
    ballControlDistance <= 150
  const canStrikeLooseBall =
    isNearestTeammateToBall && ballControlDistance <= PR + BR + 4
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
      score: inKickRange
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
  const options = utilityActions(piece, gs, context, formation, settings)
  if (assignedAction) {
    const assigned = options.find((option) => option.action === assignedAction)
    const kick = options
      .filter((option) => option.action === "PASS" || option.action === "SHOOT")
      .reduce((best, option) => (option.score > best.score ? option : best))
    if (assigned) return kick.score > assigned.score ? kick : assigned
  }
  return options.reduce((best, option) =>
    option.score > best.score ? option : best,
  )
}
