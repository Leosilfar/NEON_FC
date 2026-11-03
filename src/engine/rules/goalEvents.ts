import type { GameSettings, GS, MatchSound, PieceType } from "@/types"
import { VH, VW, clamp } from "@/constants/physics"
import { roll } from "@/engine/rng"
export function beginGoal(
  gs: GS,
  settings: GameSettings,
  scorerA: boolean,
  goalX: number,
  goalY: number,
  ts: number,
  onSound?: (cue: MatchSound, intensity?: number) => void,
): void {
  const color = scorerA ? settings.teamA.color : settings.teamB.color
  const towardCenter = scorerA ? -1 : 1

  gs.ball = { x: clamp(goalX, 0, VW), y: clamp(goalY, 0, VH), vx: 0, vy: 0 }
  gs.ball.vx = towardCenter * 110
  gs.notification = "GOL!"
  gs.notifEnd = ts + 2000
  gs.goalCooldown = 1.8 // seconds — matches the engine's simulation-time unit
  gs.goalColor = color
  gs.pendingResetScorerA = scorerA
  gs.stuckBallDuration = 0
  gs.shakeUntil = ts + 300
  gs.flashUntil = ts + 1000
  gs.shockwaves.push({ x: gs.ball.x, y: gs.ball.y, life: 760, ttl: 760, color })
  onSound?.("goal")

  const shapes: PieceType[] = [
    "triangle",
    "square",
    "diamond",
    "pentagon",
    "line",
  ]
  const count = 24 + Math.floor(roll(gs) * 7)

  for (let i = 0; i < count; i++) {
    const spread = (roll(gs) - 0.5) * Math.PI * 0.95
    const angle = (towardCenter > 0 ? 0 : Math.PI) + spread
    const speed = 270 + roll(gs) * 620
    const ttl = 900 + roll(gs) * 520

    gs.particles.push({
      x: gs.ball.x,
      y: gs.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: ttl,
      ttl,
      size: 4 + roll(gs) * 5,
      rot: roll(gs) * Math.PI * 2,
      vr: (roll(gs) - 0.5) * 10,
      type: shapes[Math.floor(roll(gs) * shapes.length)],
      color,
    })
  }
}

// ─── Kickoff conductor helpers ───────────────────────────────────────────────

/**
 * Find the best rotation and striker offset for a piece to make contact with
 * the ball from a given strikeAngle.  Tries 72 evenly-spaced rotations and
 * scores them by: leading edge distance, face width, and rotation cost.
 */
