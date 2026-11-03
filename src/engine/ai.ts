import type { GPiece, GS, Team } from "@/types"

import { BR, PR, VH, VW, clamp, vdist } from "@/constants/physics"
import {} from "@/utils/tactics"
import type { GameSettings } from "@/types"
import { perceiveBall } from "@/engine/ai/perception"
import {
  AI_DIFFICULTY,
  findPrimaryChasers,
  getPieceDifficulty,
  getPlayerTeam,
} from "@/engine/ai/difficulty"
import {
  avoidTeammateCrowding,
  chooseAction,
  coordinateTeam,
  makeStrategyContext,
  type TeamState,
} from "@/engine/ai/strategy"
import { getAiMaxSpeed, steerToTarget } from "@/engine/ai/steering"

import { getGoalkeeperTarget } from "@/engine/ai/goalkeeper"

import { getFormationTarget } from "@/engine/ai/positioning"
export {
  getTacticalAiKickIntents,
  getTacticalAiSpinDirections,
  selectClosestPlayerToBall,
} from "@/engine/ai/kicking"

export type { TeamState } from "@/engine/ai/strategy"

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

function getKickApproachTarget(
  gs: GS,
  aimX: number,
  aimY: number,
): TacticalTarget {
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

const STATIONARY_REGION_RADIUS = PR * 1.6
const STATIONARY_TIME_LIMIT = 1.5
const UNSTUCK_DURATION = 0.65
function side(team: Team) {
  return team === "A" ? 1 : -1
}

function ownGoalX(team: Team) {
  return team === "A" ? 0 : VW
}

function opponentGoalX(team: Team) {
  return team === "A" ? VW : 0
}

function clampFieldTarget<T extends Vec>(target: T): T {
  return {
    ...target,
    x: clamp(target.x, PR * 1.5, VW - PR * 1.5),
    y: clamp(target.y, PR * 1.5, VH - PR * 1.5),
  }
}

function defensiveClearanceTarget(piece: GPiece, gs: GS): TacticalTarget {
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

export function getTacticalContext(gs: GS, dt = 1 / 120): TacticalContext {
  const perception = perceiveBall(gs, dt)
  const context = makeStrategyContext(perception, gs)
  return { ...context, closestToBall: perception.nearest }
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

export function applyTacticalAi(gs: GS, settings: GameSettings, dt: number) {
  const playerTeam = getPlayerTeam(gs)
  const context = getTacticalContext(gs, dt)
  const strategyContext = makeStrategyContext(context, gs)
  if (gs.aiPassTimer !== undefined && gs.aiPassTimer > 0) {
    gs.aiPassTimer = Math.max(0, gs.aiPassTimer - dt)
    const receiver =
      gs.aiPassReceiverId === null || gs.aiPassReceiverId === undefined
        ? null
        : gs.pieces.find((candidate) => candidate.id === gs.aiPassReceiverId)
    const received =
      receiver &&
      gs.aiPassTeam === context.possessionTeam &&
      vdist(receiver.x, receiver.y, gs.ball.x, gs.ball.y) <= PR + BR + 35
    const intercepted =
      gs.aiPassTeam !== null &&
      gs.aiPassTeam !== undefined &&
      context.possessionTeam !== null &&
      context.possessionTeam !== gs.aiPassTeam
    const nearestTeammate =
      gs.aiPassTeam === null || gs.aiPassTeam === undefined
        ? null
        : context.nearestByTeam[gs.aiPassTeam]
    const redirected =
      receiver &&
      nearestTeammate &&
      nearestTeammate.id !== receiver.id &&
      context.possessionTeam === gs.aiPassTeam &&
      Math.hypot(gs.ball.vx, gs.ball.vy) < 180 &&
      vdist(nearestTeammate.x, nearestTeammate.y, gs.ball.x, gs.ball.y) <=
        PR + BR + 28
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

    const ownGoalDistance =
      (gs.ball.x - ownGoalX(piece.team)) * side(piece.team)
    const isDefender =
      piece.role === "ZAG" || piece.role === "LAT" || piece.role === "VOL"
    const clearingOwnArea =
      piece.isPrimaryChaser &&
      isDefender &&
      ownGoalDistance >= 0 &&
      ownGoalDistance < profile.clearanceRadius
    const goalkeeper = piece.role === "GOL"

    if (shouldDecide) {
      const formation = getFormationTarget(piece, gs, context)
      const goalkeeperHasBall =
        goalkeeper && vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= 150
      let selected =
        goalkeeper && !goalkeeperHasBall && assignments[piece.id] !== "RECEIVE"
          ? {
              action: "HOLD" as const,
              target: getGoalkeeperTarget(piece, gs),
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
      if (
        piece.isPrimaryChaser &&
        clearingOwnArea &&
        selected.action === "PRESS"
      ) {
        target = defensiveClearanceTarget(piece, gs)
      }
      if (
        ["RUN", "OUTLET", "WIDE", "COVER", "SUPPORT"].includes(selected.action)
      ) {
        target = avoidTeammateCrowding(piece, gs, target)
      }
      const preciseKickApproach =
        selected.action === "PASS" || selected.action === "SHOOT"
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
      const committedMovement = [
        "RUN",
        "OUTLET",
        "WIDE",
        "COVER",
        "SUPPORT",
      ].includes(selected.action)
      if (selected.action === decision.action && committedMovement) {
        const targetDrift = vdist(
          target.x,
          target.y,
          decision.targetX,
          decision.targetY,
        )
        if (decision.targetLockTimer > 0 && targetDrift < 180) {
          target = { ...target, x: decision.targetX, y: decision.targetY }
        } else {
          decision.targetLockTimer =
            selected.action === "RUN"
              ? 0.42
              : selected.action === "WIDE"
                ? 0.52
                : 0.32
        }
      }
      if (
        target.aimX !== undefined &&
        target.aimY !== undefined &&
        !preparingKick
      ) {
        decision.kickTargetX = target.aimX
        decision.kickTargetY = target.aimY
        decision.kickReceiverId =
          "receiverId" in target ? (target.receiverId ?? null) : null
        if (selected.action === "PASS" || selected.action === "SHOOT") {
          decision.kickIntentTimer = 0.55
        }
      }

      const immediateAction =
        selected.action === "PASS" || selected.action === "SHOOT"
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
          decision.targetLockTimer =
            selected.action === "RUN"
              ? 0.42
              : selected.action === "WIDE"
                ? 0.52
                : committedMovement
                  ? 0.32
                  : 0
        }
      }
    }

    const kickApproach =
      decision.action === "PASS" || decision.action === "SHOOT"
    const aggressive =
      piece.isPrimaryChaser ||
      decision.action === "PRESS" ||
      decision.action === "INTERCEPT" ||
      decision.action === "RUN" ||
      decision.action === "OUTLET" ||
      decision.action === "WIDE" ||
      decision.action === "RECEIVE" ||
      kickApproach ||
      decision.targetIntent === "ball" ||
      decision.targetIntent === "drive" ||
      decision.targetIntent === "goal"
    const speedAttr = settings.attrs[piece.type].speed
    const maxSpeed =
      getAiMaxSpeed(piece, aggressive, speedAttr) *
      (difficulty === "hard" ? 1.22 : difficulty === "medium" ? 1.08 : 1)
    const escape = getMotionWatch(piece, gs, dt)
    const escapeWeight = escape ? 0.7 : 0
    const targetX =
      decision.targetX * (1 - escapeWeight) +
      (piece.x + (escape?.x ?? 0) * 100) * escapeWeight
    const targetY =
      decision.targetY * (1 - escapeWeight) +
      (piece.y + (escape?.y ?? 0) * 100) * escapeWeight
    const acceleration =
      (aggressive ? 13 + speedAttr / 14 : 7.2 + speedAttr / 25) *
      (goalkeeper ? 1.5 : 1)
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
