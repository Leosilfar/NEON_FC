import type { GameSettings, GS } from "@/types"
import { VH, VW } from "@/constants/physics"
import {
  KICKOFF_BALL_CONTACT_RADIUS,
  KICKOFF_PROGRESS_DISTANCE,
  KICKOFF_REPLAN_BALL_DISTANCE,
  KICKOFF_REPOSITION_ARRIVAL,
  KICKOFF_REPOSITION_RETRY_TIME,
  KICKOFF_STRIKE_RETRY_TIME,
  getKickoffYieldTarget,
  planKickoffRecovery,
  steerKickoffConductor,
  steerPieceToTarget,
} from "@/engine/rules/matchFlow"

export function updateKickoffRegroup(
  gs: GS,
  settings: GameSettings,
  subDt: number,
) {
  const conductor = gs.pieces.find(
    (piece) => piece.id === gs.kickoffConductorId,
  )

  let conductorRoute: Pick<GS["ball"], "x" | "y"> | null = null

  if (conductor && !gs.kickoffCarryComplete && !gs.kickoffCenterBraking) {
    const towardCenterX = VW / 2 - gs.ball.x

    const towardCenterY = VH / 2 - gs.ball.y

    gs.kickoffConductorCarrying =
      Math.hypot(conductor.x - gs.ball.x, conductor.y - gs.ball.y) <=
      KICKOFF_BALL_CONTACT_RADIUS

    let recovery =
      gs.kickoffRecovery ?? planKickoffRecovery(conductor, gs.ball, settings)

    gs.kickoffRecovery = recovery

    const ballDisplacement = Math.hypot(
      gs.ball.x - recovery.plannedBallX,

      gs.ball.y - recovery.plannedBallY,
    )

    const centerDistance = Math.hypot(towardCenterX, towardCenterY)

    recovery.noProgressTime += subDt

    if (recovery.phase === "strike") {
      if (
        centerDistance <
        recovery.bestCenterDistance - KICKOFF_PROGRESS_DISTANCE
      ) {
        recovery.bestCenterDistance = centerDistance

        recovery.noProgressTime = 0

        if (ballDisplacement >= KICKOFF_REPLAN_BALL_DISTANCE) {
          recovery = planKickoffRecovery(conductor, gs.ball, settings)

          gs.kickoffRecovery = recovery
        }
      } else if (recovery.noProgressTime >= KICKOFF_STRIKE_RETRY_TIME) {
        recovery = planKickoffRecovery(conductor, gs.ball, settings)

        gs.kickoffRecovery = recovery
      }
    } else if (ballDisplacement >= KICKOFF_REPLAN_BALL_DISTANCE) {
      recovery = planKickoffRecovery(conductor, gs.ball, settings)

      gs.kickoffRecovery = recovery
    }

    const strikeTarget = {
      x: recovery.targetX,

      y: recovery.targetY,

      strikeAngle: recovery.strikeAngle,

      pieceRotation: recovery.pieceRotation,
    }

    conductorRoute = strikeTarget

    const repositionDistance = Math.hypot(
      strikeTarget.x - conductor.x,

      strikeTarget.y - conductor.y,
    )

    const conductorSpeed = Math.hypot(conductor.vx, conductor.vy)

    if (recovery.phase === "reposition") {
      if (
        repositionDistance <
        recovery.bestPieceDistance - KICKOFF_PROGRESS_DISTANCE
      ) {
        recovery.bestPieceDistance = repositionDistance

        recovery.noProgressTime = 0
      } else if (recovery.noProgressTime >= KICKOFF_REPOSITION_RETRY_TIME) {
        recovery = planKickoffRecovery(conductor, gs.ball, settings)

        gs.kickoffRecovery = recovery
      }

      if (
        repositionDistance <= KICKOFF_REPOSITION_ARRIVAL &&
        conductorSpeed <= 24
      ) {
        recovery.phase = "align"

        recovery.noProgressTime = 0
      } else {
        steerKickoffConductor(
          conductor,

          strikeTarget.x,

          strikeTarget.y,

          settings,

          subDt,
        )
      }
    }

    if (recovery.phase === "align") {
      if (repositionDistance > KICKOFF_REPOSITION_ARRIVAL * 1.5) {
        recovery.phase = "reposition"

        recovery.bestPieceDistance = repositionDistance

        recovery.noProgressTime = 0
      } else {
        steerKickoffConductor(
          conductor,

          strikeTarget.x,

          strikeTarget.y,

          settings,

          subDt,
        )

        const targetRotation = strikeTarget.pieceRotation

        const rotationDifference = Math.atan2(
          Math.sin(targetRotation - (conductor.rot ?? 0)),

          Math.cos(targetRotation - (conductor.rot ?? 0)),
        )

        if (conductorSpeed <= 18 && Math.abs(rotationDifference) <= 0.18) {
          recovery.phase = "strike"

          recovery.bestCenterDistance = centerDistance

          recovery.noProgressTime = 0
        }
      }
    }

    gs.kickoffConductorStriking = recovery.phase === "strike"

    if (recovery.phase === "strike") {
      steerKickoffConductor(
        conductor,

        strikeTarget.x,

        strikeTarget.y,

        settings,

        subDt,

        strikeTarget.strikeAngle,
      )
    }
  } else if (gs.kickoffCenterBraking) {
    gs.kickoffConductorStriking = false

    gs.kickoffConductorCarrying = false
  }

  for (const piece of gs.pieces) {
    if (piece.id === gs.kickoffConductorId && !gs.kickoffCarryComplete) {
      continue
    }

    const target = gs.kickoffTargets[piece.id]

    if (target) {
      const yieldTarget =
        conductor && conductorRoute && piece.id !== conductor.id
          ? getKickoffYieldTarget(
              piece,

              conductor,

              conductorRoute.x,

              conductorRoute.y,

              gs.pieces,

              gs.kickoffYieldSides[piece.id],
            )
          : null

      if (yieldTarget) {
        gs.kickoffYieldSides[piece.id] = yieldTarget.side

        steerPieceToTarget(
          piece,

          yieldTarget.x,

          yieldTarget.y,

          settings,

          subDt,

          gs.pieces,

          gs.kickoffCarryComplete,
        )
      } else {
        delete gs.kickoffYieldSides[piece.id]

        steerPieceToTarget(
          piece,

          target.x,

          target.y,

          settings,

          subDt,

          gs.pieces,

          gs.kickoffCarryComplete,
        )
      }
    }
  }
}
