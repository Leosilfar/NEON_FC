/**
 * Particle and visual-FX helpers.
 *
 * Extracted from simulation.ts so the main loop stays focused on physics
 * and match rules.  All functions mutate GS in place (same pattern as the
 * rest of the engine).
 */

import type { GS, MatchSound, PieceType } from "@/types"
import { roll } from "@/engine/rng"

const COLLISION_SOUND_COOLDOWN = 0.1 // seconds

/** Advance particles and shockwaves by one simulation step. */
export function updateFx(gs: GS, dt: number): void {
  const drag = Math.exp(-3.2 * dt)

  gs.particles = gs.particles.filter((p) => {
    p.life -= dt * 1000
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.vr * dt
    return p.life > 0
  })

  gs.shockwaves = gs.shockwaves.filter((w) => {
    w.life -= dt * 1000
    return w.life > 0
  })
}

/**
 * Emit collision particles and trigger a sound cue, once per cooldown window.
 *
 * @param gs        - match state (mutated)
 * @param key       - unique string identifying this collision pair, used to
 *                    debounce the sound (e.g. "ball-12", "pieces-3-7")
 * @param cue       - which sound to trigger
 * @param intensity - 0-1, scales particle count, speed, and sound volume
 * @param x / y     - world-space contact point
 * @param nx / ny   - contact normal (unit vector)
 * @param color     - particle colour (hex string)
 * @param onSound   - optional audio callback
 */
export function emitCollision(
  gs: GS,
  key: string,
  cue: MatchSound,
  intensity: number,
  x: number,
  y: number,
  nx: number,
  ny: number,
  color: string,
  onSound?: (cue: MatchSound, intensity?: number) => void,
): void {
  if ((gs.collisionCooldowns[key] ?? 0) > 0) return

  gs.collisionCooldowns[key] = COLLISION_SOUND_COOLDOWN
  onSound?.(cue, Math.min(1, 0.25 + intensity * 0.75))

  const shapes: PieceType[] = [
    "triangle",
    "square",
    "diamond",
    "pentagon",
    "line",
  ]
  const particleCount = 5 + Math.round(Math.min(2, intensity * 2))
  const baseAngle = Math.atan2(ny, nx)

  for (let i = 0; i < particleCount; i++) {
    const angle = baseAngle + (roll(gs) - 0.5) * 1.5
    const speed = 45 + roll(gs) * (65 + intensity * 70)
    const ttl = 240 + roll(gs) * 170

    gs.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: ttl,
      ttl,
      size: 1.5 + roll(gs) * 1.8,
      rot: roll(gs) * Math.PI * 2,
      vr: (roll(gs) - 0.5) * 12,
      type: shapes[Math.floor(roll(gs) * shapes.length)],
      color,
    })
  }

  // Hard cap to avoid unbounded growth during intense gameplay
  if (gs.particles.length > 150) {
    gs.particles.splice(0, gs.particles.length - 150)
  }
}
