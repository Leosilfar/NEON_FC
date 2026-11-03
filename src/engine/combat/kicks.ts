import type { GameSettings, GS, MatchSound } from "@/types"
import { BR, PR } from "@/constants/physics"
import { getPieceKickNormal } from "@/engine/physics"
import { getTacticalAiKickIntents } from "@/engine/ai"
import { emitCollision } from "@/engine/fx/particles"
export function applyPlayerKick(
  gs: GS,
  settings: GameSettings,
  kickPressed: boolean,
  ts: number,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
  // ── KICK (Space) ────────────────────────────────────────────────────────────

  // Fires once per keydown (tracked via kickCooldown, not held-key detection).

  // Finds the piece face whose normal points closest to the ball, then applies

  // an impulse scaled by the piece's `power` attribute.

  if (
    !gs.finished &&
    gs.kickCooldown <= 0 &&
    gs.kickoffPhase === null &&
    kickPressed
  ) {
    const teamA = gs.pieces.filter((p) => p.team === "A")

    const kicker =
      teamA.find((p) => p.isPlayerControlled) ?? teamA[gs.selectedIdx ?? 0]

    if (kicker) {
      const kickResult = getPieceKickNormal(kicker, gs.ball.x, gs.ball.y)

      const KICK_REACH = PR + BR + 4 // contact distance: bola quase encostada na peça

      if (kickResult && kickResult.dist <= KICK_REACH) {
        // Base power from attribute (power 58-95 → multiplier 1.0-1.8)

        const powerAttr = settings.attrs[kicker.type].power

        const BASE_KICK_SPEED = 440 // pixels/s at power 58

        const kickSpeed = BASE_KICK_SPEED * (0.8 + powerAttr / 130)

        // Blend current ball velocity out (feel of a real kick, not a redirect)

        gs.ball.vx = gs.ball.vx * 0.15 + kickResult.nx * kickSpeed

        gs.ball.vy = gs.ball.vy * 0.15 + kickResult.ny * kickSpeed

        // Tiny kickback on the piece itself (mass ratio effect)

        kicker.vx -= kickResult.nx * kickSpeed * 0.06

        kicker.vy -= kickResult.ny * kickSpeed * 0.06

        // Separate ball from piece to avoid instant re-collision

        gs.ball.x += kickResult.nx * (BR + 2)

        gs.ball.y += kickResult.ny * (BR + 2)

        // Cooldown prevents kick-spam; short enough for rhythm play (~0.25s)

        gs.kickCooldown = 0.25

        // Visual flash on the kicker

        gs.kickFlashUntil = ts + 120 // ms

        // Spawn particles at contact point

        emitCollision(
          gs,

          `kick-${kicker.id}`,

          "ball-piece",

          0.6 + powerAttr / 200,

          gs.ball.x - kickResult.nx * BR,

          gs.ball.y - kickResult.ny * BR,

          kickResult.nx,

          kickResult.ny,

          settings.pieceColors[kicker.type],

          onSound,
        )
      }
    }
  }

  // ── END KICK ────────────────────────────────────────────────────────────────
}

export function applyAiKick(
  gs: GS,
  settings: GameSettings,
  regrouping: boolean,
  ts: number,
  onSound?: (cue: MatchSound, intensity?: number) => void,
) {
  if (!regrouping && gs.matchMode !== "training") {
    for (const intent of getTacticalAiKickIntents(gs)) {
      const kickResult = getPieceKickNormal(
        intent.piece,

        gs.ball.x,

        gs.ball.y,
      )

      if (!kickResult || kickResult.dist > PR + BR + 4) continue

      const aimX = intent.x - gs.ball.x

      const aimY = intent.y - gs.ball.y

      const aimDistance = Math.hypot(aimX, aimY) || 1

      const alignment =
        (kickResult.nx * aimX + kickResult.ny * aimY) / aimDistance

      let kickNx = kickResult.nx

      let kickNy = kickResult.ny

      if (alignment < 0.65) {
        if (intent.action !== "PASS") continue

        // A pass is a deliberate team action: if contact is legal but the shape

        // cannot align its face, guide the kick toward the chosen receiver.

        kickNx = aimX / aimDistance

        kickNy = aimY / aimDistance
      }

      const powerAttr = settings.attrs[intent.piece.type].power

      const kickSpeed =
        440 * (0.8 + powerAttr / 130) * (intent.action === "PASS" ? 0.72 : 1)

      gs.ball.vx = gs.ball.vx * 0.15 + kickNx * kickSpeed

      gs.ball.vy = gs.ball.vy * 0.15 + kickNy * kickSpeed

      intent.piece.vx -= kickNx * kickSpeed * 0.06

      intent.piece.vy -= kickNy * kickSpeed * 0.06

      gs.ball.x += kickNx * (BR + 2)

      gs.ball.y += kickNy * (BR + 2)

      const decision = gs.aiDecisionStates[intent.piece.id]

      if (decision) {
        decision.kickCooldown = 0.65

        decision.kickIntentTimer = 0

        decision.action = "ATTACK"

        decision.pendingAction = "ATTACK"

        decision.decisionTimer = 0
      }

      if (intent.action === "PASS") {
        gs.aiPassReceiverId = intent.receiverId

        gs.aiPassTeam = intent.piece.team

        gs.aiPassTimer = 2.2
      }

      gs.aiKickFlashUntil[intent.piece.id] = ts + 140

      gs.aiKickCount++

      if (intent.action === "PASS") gs.aiPassCount++
      else gs.aiShotCount++

      emitCollision(
        gs,

        `ai-kick-${intent.piece.id}`,

        "ball-piece",

        0.6 + powerAttr / 200,

        gs.ball.x - kickResult.nx * BR,

        gs.ball.y - kickResult.ny * BR,

        kickResult.nx,

        kickResult.ny,

        settings.pieceColors[intent.piece.type],

        onSound,
      )

      break
    }
  }
}
