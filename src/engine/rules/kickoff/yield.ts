import type { GS } from "@/types"
import { PR, VH, VW, clamp } from "@/constants/physics"
import {
  KICKOFF_YIELD_DISTANCE,
  KICKOFF_YIELD_LATERAL_LIMIT,
  KICKOFF_YIELD_OFFSET,
} from "./constants"
export function getKickoffYieldTarget(
  piece: GS["pieces"][number],
  conductor: GS["pieces"][number],
  routeX: number,
  routeY: number,
  pieces: GS["pieces"],
  preferredSide?: -1 | 1,
) {
  const routeXFromConductor = routeX - conductor.x
  const routeYFromConductor = routeY - conductor.y
  const routeDistance = Math.hypot(routeXFromConductor, routeYFromConductor)
  if (routeDistance < 0.001) return null

  const directionX = routeXFromConductor / routeDistance
  const directionY = routeYFromConductor / routeDistance
  const offsetX = piece.x - conductor.x
  const offsetY = piece.y - conductor.y
  const alongRoute = offsetX * directionX + offsetY * directionY
  const lateralDistance = Math.abs(offsetX * -directionY + offsetY * directionX)

  if (
    alongRoute < (preferredSide ? -KICKOFF_YIELD_OFFSET : 0) ||
    alongRoute >
      Math.min(routeDistance, KICKOFF_YIELD_DISTANCE) +
        (preferredSide ? KICKOFF_YIELD_OFFSET : 0) ||
    lateralDistance >
      KICKOFF_YIELD_LATERAL_LIMIT + (preferredSide ? KICKOFF_YIELD_OFFSET : 0)
  ) {
    return null
  }

  let bestTarget: Pick<GS["ball"], "x" | "y"> & { side: -1 | 1 } | null = null
  let bestClearance = Number.NEGATIVE_INFINITY

  const sides: (-1 | 1)[] = preferredSide ? [preferredSide] : [-1, 1]
  for (const side of sides) {
    const targetX = clamp(
      piece.x - directionY * side * KICKOFF_YIELD_OFFSET,
      PR,
      VW - PR,
    )
    const targetY = clamp(
      piece.y + directionX * side * KICKOFF_YIELD_OFFSET,
      PR,
      VH - PR,
    )
    let clearance = Infinity

    for (const other of pieces) {
      if (other.id === piece.id || other.id === conductor.id) continue
      clearance = Math.min(
        clearance,
        Math.hypot(targetX - other.x, targetY - other.y),
      )
    }

    if (clearance > bestClearance) {
      bestClearance = clearance
      bestTarget = { x: targetX, y: targetY, side }
    }
  }

  return bestTarget
}

// ─── Regroup trigger ─────────────────────────────────────────────────────────

/**
 * Transition to the regroup/kickoff phase after a goal or match start.
 * Computes target positions for every piece, selects the best conductor, and
 * arms the kickoff-recovery state machine.
 */
