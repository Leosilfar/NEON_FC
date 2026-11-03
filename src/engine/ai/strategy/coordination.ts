import type { GameSettings, GPiece, GS } from "@/types"
import { PR, VH, VW, clamp, vdist } from "@/constants/physics"
import type { AiAction, StrategyContext } from "./context"
import { estimateArrivalTime, getTeamRoleProfile } from "./context"
import { bestRunTarget, distanceToSegment } from "./targets"
/** Gives each non-keeper a complementary team task instead of a shared ball target. */
export function coordinateTeam(
  gs: GS,
  context: StrategyContext,
  settings: GameSettings,
) {
  const assignments: Partial<Record<number, AiAction>> = {}
  for (const team of ["A", "B"] as const) {
    const plan = context.plans[team]
    const roleProfile = getTeamRoleProfile(gs, team, plan)
    const fieldPlayers = roleProfile.fieldPieces
    const players = gs.pieces.filter(
      (piece) =>
        piece.team === team &&
        piece.role !== "GOL" &&
        !piece.isPlayerControlled,
    )
    const passReceiverId =
      gs.aiPassTimer && gs.aiPassTimer > 0 && gs.aiPassTeam === team
        ? gs.aiPassReceiverId
        : null
    const passReceiver =
      passReceiverId === null || passReceiverId === undefined
        ? null
        : (gs.pieces.find(
            (piece) => piece.id === passReceiverId && !piece.isPlayerControlled,
          ) ?? null)
    if (passReceiver) assignments[passReceiver.id] = "RECEIVE"
    if (players.length === 0) continue
    const pressBias: Record<NonNullable<GPiece["role"]>, number> = {
      GOL: -200,
      ZAG: 0,
      LAT: 45,
      VOL: 25,
      MEI: 45,
      ATA: 85,
    }
    const byBall = [...players].sort((a, b) => {
      const effectiveDistance = (piece: GPiece) =>
        estimateArrivalTime(piece, context.predictedBall, settings) -
        pressBias[piece.role ?? "MEI"] / 300 +
        (piece.role === "LAT" &&
        Math.abs(piece.y - context.predictedBall.y) > VH * 0.24
          ? 0.25
          : 0)
      return effectiveDistance(a) - effectiveDistance(b)
    })
    const actualCarrier = fieldPlayers
      .filter((piece) => vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= 150)
      .sort(
        (a, b) =>
          vdist(a.x, a.y, gs.ball.x, gs.ball.y) -
          vdist(b.x, b.y, gs.ball.x, gs.ball.y),
      )[0]
    const closest = byBall[0]
    if (context.possessionTeam === team) {
      if (actualCarrier && !actualCarrier.isPlayerControlled) {
        assignments[actualCarrier.id] = "ATTACK"
      }
      const offBallPlayers = players.filter(
        (player) => player.id !== actualCarrier?.id && !assignments[player.id],
      )
      const runCandidates = offBallPlayers
        .map((player) => ({
          player,
          run: bestRunTarget(player, gs, context, settings),
        }))
        .filter((candidate) => candidate.run !== null)
        .sort((a, b) => (b.run?.score ?? 0) - (a.run?.score ?? 0))
      const primaryRunner = runCandidates[0]
      if (primaryRunner?.run) assignments[primaryRunner.player.id] = "RUN"

      const remaining = offBallPlayers.filter(
        (player) => !assignments[player.id],
      )
      const widePlayer =
        remaining.length > 1
          ? remaining
              .filter((player) => player.role === "LAT")
              .sort(
                (a, b) => Math.abs(a.y - VH / 2) - Math.abs(b.y - VH / 2),
              )[0]
          : undefined
      if (widePlayer) assignments[widePlayer.id] = "WIDE"

      const availableForOutlet = remaining.filter(
        (player) => !assignments[player.id],
      )
      const outlet =
        availableForOutlet.length > 1
          ? availableForOutlet.sort((a, b) => {
              const outletScore = (player: GPiece) => {
                const nearestPressure = Math.min(
                  Infinity,
                  ...gs.pieces
                    .filter((opponent) => opponent.team !== team)
                    .map((opponent) =>
                      vdist(player.x, player.y, opponent.x, opponent.y),
                    ),
                )
                const laneClearance = Math.min(
                  Infinity,
                  ...gs.pieces
                    .filter((opponent) => opponent.team !== team)
                    .map((opponent) =>
                      distanceToSegment(opponent, gs.ball, player),
                    ),
                )
                const accessible = clamp(
                  1 - vdist(gs.ball.x, gs.ball.y, player.x, player.y) / 680,
                  0,
                  1,
                )
                const roleBonus =
                  player.role === "MEI"
                    ? 0.16
                    : player.role === "VOL"
                      ? 0.12
                      : 0
                return (
                  clamp(nearestPressure / 300, 0, 1) * 0.38 +
                  clamp(laneClearance / 180, 0, 1) * 0.24 +
                  accessible * 0.2 +
                  roleBonus -
                  estimateArrivalTime(player, gs.ball, settings) * 0.025
                )
              }
              return outletScore(b) - outletScore(a)
            })[0]
          : undefined
      if (outlet) assignments[outlet.id] = "OUTLET"

      for (const player of remaining) {
        if (!assignments[player.id]) assignments[player.id] = "COVER"
      }
      continue
    }

    const pressLimit = clamp(
      820 +
        roleProfile.attackShare * 220 -
        roleProfile.defenseShare * 100 +
        (plan === "CHASE" ? 140 : plan === "PROTECT" ? -220 : 0),
      420,
      1180,
    )
    const closestArrival = closest
      ? estimateArrivalTime(closest, context.predictedBall, settings)
      : Infinity
    const humanDistance = Math.min(
      ...fieldPlayers
        .filter((piece) => piece.isPlayerControlled)
        .map((piece) =>
          vdist(
            piece.x,
            piece.y,
            context.predictedBall.x,
            context.predictedBall.y,
          ),
        ),
    )
    const humanArrival = Math.min(
      ...fieldPlayers
        .filter((piece) => piece.isPlayerControlled)
        .map((piece) =>
          estimateArrivalTime(piece, context.predictedBall, settings),
        ),
    )
    const humanIsAlreadyPressing =
      humanDistance <= Math.min(pressLimit, 260) &&
      humanArrival <= closestArrival

    const nearSideline =
      context.predictedBall.y < VH * 0.18 || context.predictedBall.y > VH * 0.82
    const localPlayerCount = fieldPlayers.filter(
      (piece) =>
        vdist(
          piece.x,
          piece.y,
          context.predictedBall.x,
          context.predictedBall.y,
        ) <
        PR * 4.2,
    ).length
    const crowdedZone = nearSideline || localPlayerCount >= 3
    const ownGoalX = team === "A" ? 0 : VW
    const ownGoalDistance = vdist(
      context.predictedBall.x,
      context.predictedBall.y,
      ownGoalX,
      VH / 2,
    )
    const pressSlotLimit = crowdedZone
      ? ownGoalDistance < 310
        ? 2
        : 1
      : roleProfile.pressSlots

    const aiPressSlots = Math.max(
      0,
      pressSlotLimit - (humanIsAlreadyPressing ? 1 : 0),
    )
    const eligiblePressers = byBall.filter(
      (piece) =>
        vdist(
          piece.x,
          piece.y,
          context.predictedBall.x,
          context.predictedBall.y,
        ) < pressLimit,
    )
    const pressured = new Set<number>(passReceiver ? [passReceiver.id] : [])
    for (const player of eligiblePressers
      .filter((candidate) => candidate.id !== passReceiver?.id)
      .slice(0, aiPressSlots)) {
      assignments[player.id] = "PRESS"
      pressured.add(player.id)
    }
    const interceptBias: Record<NonNullable<GPiece["role"]>, number> = {
      GOL: -200,
      ZAG: 45,
      LAT: 20,
      VOL: 115,
      MEI: 130,
      ATA: 0,
    }
    const interceptor = byBall
      .filter((piece) => !pressured.has(piece.id))
      .sort((a, b) => {
        const effectiveDistance = (piece: GPiece) =>
          estimateArrivalTime(piece, context.predictedBall, settings) -
          interceptBias[piece.role ?? "MEI"] / 300
        return effectiveDistance(a) - effectiveDistance(b)
      })[0]
    if (
      interceptor &&
      roleProfile.midfielders > 0 &&
      (eligiblePressers.length > 0 || humanIsAlreadyPressing) &&
      (!crowdedZone || ownGoalDistance < 310)
    ) {
      assignments[interceptor.id] = "INTERCEPT"
    }
    for (const player of players) {
      if (!assignments[player.id]) assignments[player.id] = "COVER"
    }
  }
  return assignments
}
