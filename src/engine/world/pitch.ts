/**
 * Pitch — field dimensions and geometry.
 *
 * Previously these values were hard-coded as global constants (VW, VH, etc.)
 * imported everywhere.  By passing a Pitch object through the engine we
 * decouple field size from compiled constants, which enables:
 *   - variable arena sizes (5v5 small, 7v7 medium, 11v11 large)
 *   - a follow-camera that maps simulation coords to canvas coords
 *   - headless test harnesses that run on arbitrary pitch sizes
 *
 * The DEFAULT_PITCH matches the current hard-coded values so all existing
 * engine code continues to work without changes during the transition.
 */

import { VW, VH, BR, GOAL_Y0, GOAL_Y1, CORNER_RADIUS } from "@/constants/physics"

export interface Pitch {
  /** Total arena width in simulation pixels (walls included). */
  width: number
  /** Total arena height in simulation pixels (walls included). */
  height: number
  /** Radius of the four rounded wall corners. */
  cornerRadius: number
  /** Y coordinate of the top goalpost edge. */
  goalY0: number
  /** Y coordinate of the bottom goalpost edge. */
  goalY1: number
  /**
   * Minimum safe X for the ball during kickoff regroup
   * (piece radius + ball radius + tiny margin).
   */
  ballMinX: number
  /**
   * Maximum safe X for the ball during kickoff regroup.
   */
  ballMaxX: number
}

/** Default 5v5 pitch — mirrors the current hard-coded constants. */
export const DEFAULT_PITCH: Pitch = {
  width: VW,
  height: VH,
  cornerRadius: CORNER_RADIUS,
  goalY0: GOAL_Y0,
  goalY1: GOAL_Y1,
  ballMinX: 20 + BR,   // PR(18) + BR(9) + 2 ≈ 29; keep a small margin from the wall
  ballMaxX: VW - 20 - BR,
}

/**
 * Build a Pitch scaled around the standard aspect ratio.
 * Pass a multiplier relative to the default to get 7v7 / 11v11 sizes.
 *
 * Example:
 *   makePitch(1.76)  →  2200 × 1020  (11v11 large)
 *   makePitch(1.32)  →  1650 × 766   (7v7 medium)
 *   makePitch(1)     →  1250 × 580   (5v5 default)
 */
export function makePitch(scale: number): Pitch {
  const width = Math.round(VW * scale)
  const height = Math.round(VH * scale)
  const goalFraction = (GOAL_Y1 - GOAL_Y0) / VH   // preserve goalmouth ratio
  const goalCenter = height / 2
  const halfGoal = (height * goalFraction) / 2
  return {
    width,
    height,
    cornerRadius: Math.round(CORNER_RADIUS * scale),
    goalY0: goalCenter - halfGoal,
    goalY1: goalCenter + halfGoal,
    ballMinX: Math.round(29 * scale),
    ballMaxX: Math.round((VW - 29) * scale),
  }
}
