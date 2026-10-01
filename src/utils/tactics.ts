import type { Role } from "@/types"

import { VW, VH } from "@/constants/physics"

/**
 * NORMALIZED HALF-FIELD COORDINATES
 * --------------------------------
 * Every formation position is expressed as a normalized point `(x, y)` where:
 *   - x ∈ [0, 1]: 0 = own goal line (left for HOME), 1 = halfway line (field center).
 *   - y ∈ [0, 1]: 0 = top sideline, 1 = bottom sideline.
 *
 * This is the *single source of truth*. BOTH the team-selection preview AND the
 * match engine convert from these normalized coordinates, so they can never diverge.
 */
export interface NormalizedPos {
  x: number
  y: number
}

export const KICKOFF_CENTER_MARGIN = 40
export const PIECE_MIN_SPACING = 36

export function groupRoles(roles: (Role | undefined)[]) {
  const groups: Record<"GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA", number[]> = {
    GOL: [],
    ZAG: [],
    LAT: [],
    VOL: [],
    MEI: [],
    ATA: [],
  }

  roles.forEach((r, idx) => {
    if (r === "GOL") groups.GOL.push(idx)
    else if (r === "ZAG") groups.ZAG.push(idx)
    else if (r === "LAT") groups.LAT.push(idx)
    else if (r === "VOL") groups.VOL.push(idx)
    else if (r === "MEI") groups.MEI.push(idx)
    else if (r === "ATA") groups.ATA.push(idx)
  })

  return groups
}

/**
 * Depth (x) of each role within the own half, normalized [0,1].
 * 0 = own goal line, 1 = halfway line.
 */
const ROLE_DEPTH: Record<string, number> = {
  GOL: 0.08,
  ZAG: 0.28,
  LAT: 0.42,
  VOL: 0.5,
  MEI: 0.58,
  ATA: 0.68,
}

function lateralYByCount(count: number): number[] {
  if (count === 1) return [0.5]
  if (count === 2) return [0.28, 0.72]
  if (count === 3) return [0.18, 0.5, 0.82]
  const gap = 0.72 / Math.max(1, count - 1)
  return Array.from({ length: count }, (_, i) => 0.14 + gap * i)
}

function centralYByCount(count: number): number[] {
  if (count === 1) return [0.5]
  if (count === 2) return [0.4, 0.6]
  if (count === 3) return [0.32, 0.5, 0.68]
  const gap = 0.48 / Math.max(1, count - 1)
  return Array.from({ length: count }, (_, i) => 0.26 + gap * i)
}

function wingYByCount(count: number): number[] {
  if (count === 1) return [0.5]
  if (count === 2) return [0.18, 0.82]
  const gap = 0.72 / Math.max(1, count - 1)
  return Array.from({ length: count }, (_, i) => 0.14 + gap * i)
}

function assignLine(
  positions: NormalizedPos[],
  indexes: number[],
  depth: number,
  yValues: number[],
) {
  indexes.forEach((idx, i) => {
    positions[idx] = { x: depth, y: yValues[i] ?? 0.5 }
  })
}

/**
 * Compute normalized half-field positions for the given roles (HOME side).
 * This is the canonical position source used by both the preview and the engine.
 */
export function computeHomeNormalized(
  roles: (Role | undefined)[],
): NormalizedPos[] {
  const groups = groupRoles(roles)
  const positions: NormalizedPos[] = Array(roles.length)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5 }))

  groups.GOL.forEach((idx, i) => {
    positions[idx] = {
      x: ROLE_DEPTH.GOL,
      y: lateralYByCount(groups.GOL.length)[i] ?? 0.5,
    }
  })

  assignLine(positions, groups.ZAG, ROLE_DEPTH.ZAG, centralYByCount(groups.ZAG.length))
  assignLine(positions, groups.LAT, ROLE_DEPTH.LAT, wingYByCount(groups.LAT.length))
  assignLine(positions, groups.VOL, ROLE_DEPTH.VOL, centralYByCount(groups.VOL.length))
  assignLine(positions, groups.MEI, ROLE_DEPTH.MEI, centralYByCount(groups.MEI.length))
  assignLine(positions, groups.ATA, ROLE_DEPTH.ATA, lateralYByCount(groups.ATA.length))

  return positions
}

/**
 * CANVAS CONVERSION (used by the engine)
 * --------------------------------------
 * HOME (left half, attacks right): X = x * (VW/2), Y = y * VH.
 * AWAY (right half, attacks left): X = VW - x * (VW/2), Y = y * VH.
 */
export function homeToCanvas(p: NormalizedPos): { x: number; y: number } {
  return { x: p.x * (VW / 2), y: p.y * VH }
}

export function awayToCanvas(p: NormalizedPos): { x: number; y: number } {
  return { x: VW - p.x * (VW / 2), y: p.y * VH }
}

/**
 * PREVIEW CONVERSION (used by the team-selection UI)
 * -------------------------------------------------
 * The board is drawn VERTICAL (own goal at the bottom, attacking upward), even
 * though the match itself runs on a horizontal field. We map:
 *   - horizontal (left%)  = normalized lateral y
 *   - vertical   (top%)   = 1 - depth x  (x=0 own goal → bottom, x=1 halfway → top)
 */
export function computeTacticalUiPositions(
  roles: Role[],
): { x: number; y: number }[] {
  return computeHomeNormalized(roles).map((p, i) => {
    const role = roles[i]
    const visualDepth =
      role === "ATA"
        ? 0.82
        : role === "MEI"
          ? 0.58
          : role === "VOL"
            ? 0.48
            : role === "LAT"
              ? 0.4
              : role === "ZAG"
                ? 0.28
                : role === "GOL"
                  ? 0.08
                  : p.x

    return {
      x: p.y * 100,
      y: 8 + (1 - visualDepth) * 84,
    }
  })
}

// Legacy alias — percentages of the FULL field width (0..50) used by older code.
export function computeMatchPercentPositions(
  slotsRoles: (Role | undefined)[],
): { x: number; y: number }[] {
  return computeHomeNormalized(slotsRoles).map((p) => ({
    x: p.x * 50,
    y: p.y * 100,
  }))
}

/** Mirror a normalized/percentage X coordinate for the right (AWAY) side. */
export function mirrorX(x: number): number {
  return VW - x
}

export function mirrorPositionsForTeamB(
  teamAPositions: { x: number; y: number }[],
): { x: number; y: number }[] {
  return teamAPositions.map((pos) => ({
    x: VW - pos.x,
    y: pos.y,
  }))
}
