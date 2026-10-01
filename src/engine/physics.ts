import type { GPiece, PieceType } from "@/types"
import { BR, PR, VW, VH, CORNER_RADIUS, clamp } from "@/constants/physics"

export interface Vector2D {
  x: number
  y: number
}

export interface HitResult {
  nx: number
  ny: number
  pen: number
}

const MTV_SLOP = 0.001

function pieceRotation(p: GPiece): number {
  return p.rot !== undefined ? p.rot : (p.team === "A" ? 0 : Math.PI)
}

function rotateVertex(x: number, y: number, cx: number, cy: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

export function getPieceVerts(
  type: PieceType,
  cx: number,
  cy: number,
  r: number,
  angle = 0
): [number, number][] {
  let verts: [number, number][]
  switch (type) {
    case "square": {
      const s = r * 0.88
      verts = [
        [cx - s, cy - s],
        [cx + s, cy - s],
        [cx + s, cy + s],
        [cx - s, cy + s],
      ]
      break
    }
    case "triangle":
      verts = [
        [cx + r * 0.95, cy],
        [cx - r * 0.95, cy - r * 0.95],
        [cx - r * 0.95, cy + r * 0.95],
      ]
      break
    case "diamond":
      verts = [
        [cx + r * 0.95, cy],
        [cx, cy - r * 0.95],
        [cx - r * 0.95, cy],
        [cx, cy + r * 0.95],
      ]
      break
    case "pentagon":
      verts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72) * (Math.PI / 180)
        return [cx + r * 0.95 * Math.cos(a), cy + r * 0.95 * Math.sin(a)] as [number, number]
      })
      break
    case "line": {
      const hw = r * 0.34
      const hh = r * 1.4
      verts = [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh],
      ]
      break
    }
    default:
      return []
  }
  if (angle !== 0) {
    verts = verts.map(v => rotateVertex(v[0], v[1], cx, cy, angle))
  }
  return verts
}

export function getPieceWorldVerts(p: GPiece): [number, number][] {
  return getPieceVerts(p.type, p.x, p.y, PR, pieceRotation(p))
}

export function getPieceVertices(piece: GPiece): Vector2D[] {
  return getPieceWorldVerts(piece).map(([x, y]) => ({ x, y }))
}

/** AABB of a piece's real, rotated world vertices (circle uses its radius). */
export function pieceWorldBounds(p: GPiece): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  if (p.type === "circle") {
    return { minX: p.x - PR, maxX: p.x + PR, minY: p.y - PR, maxY: p.y + PR }
  }
  const verts = getPieceWorldVerts(p)
  if (!verts.length) {
    return { minX: p.x - PR, maxX: p.x + PR, minY: p.y - PR, maxY: p.y + PR }
  }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of verts) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, maxX, minY, maxY }
}

/**
 * Clamp a piece so its real rotated vertices stay inside the field bounds.
 * Returns which axes were corrected (for velocity reflection).
 */
export function clampPieceToField(
  p: GPiece,
  left: number,
  right: number,
  top: number,
  bottom: number,
): { hitX: boolean; hitY: boolean } {
  const b = pieceWorldBounds(p)
  let hitX = false
  let hitY = false
  if (b.minX < left) {
    p.x += left - b.minX
    hitX = true
  }
  if (b.maxX > right) {
    p.x -= b.maxX - right
    hitX = true
  }
  if (b.minY < top) {
    p.y += top - b.minY
    hitY = true
  }
  if (b.maxY > bottom) {
    p.y -= b.maxY - bottom
    hitY = true
  }
  return { hitX, hitY }
}

function getAxes(verts: [number, number][]): [number, number][] {
  const axes: [number, number][] = []
  const n = verts.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = verts[i]
    const [x2, y2] = verts[(i + 1) % n]
    const ex = x2 - x1
    const ey = y2 - y1
    const len = Math.hypot(ex, ey) || 1
    axes.push([-ey / len, ex / len])
  }
  return axes
}

function project(verts: [number, number][], axis: [number, number]): { min: number; max: number } {
  const [ax, ay] = axis
  let min = Infinity
  let max = -Infinity
  for (const [x, y] of verts) {
    const proj = x * ax + y * ay
    if (proj < min) min = proj
    if (proj > max) max = proj
  }
  return { min, max }
}

function projectCircle(
  cx: number,
  cy: number,
  radius: number,
  axis: [number, number],
): { min: number; max: number; center: number } {
  const center = cx * axis[0] + cy * axis[1]
  return { min: center - radius, max: center + radius, center }
}

function polygonCentroid(verts: [number, number][]): [number, number] {
  let x = 0
  let y = 0
  for (const [vx, vy] of verts) {
    x += vx
    y += vy
  }
  return [x / verts.length, y / verts.length]
}

export function satPolygonPolygon(
  vertsA: [number, number][],
  vertsB: [number, number][]
): { overlap: number; axis: [number, number] } | null {
  const axesA = getAxes(vertsA)
  const axesB = getAxes(vertsB)
  let minOverlap = Infinity
  let minAxis: [number, number] = [0, 0]
  for (const axis of [...axesA, ...axesB]) {
    const projA = project(vertsA, axis)
    const projB = project(vertsB, axis)
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min)
    if (overlap <= 0) return null
    if (overlap < minOverlap) {
      minOverlap = overlap
      minAxis = axis
    }
  }
  return { overlap: minOverlap, axis: minAxis }
}

export function satCirclePolygon(
  cx: number,
  cy: number,
  radius: number,
  verts: [number, number][]
): { overlap: number; axis: [number, number] } | null {
  const mtv = circleConvexPolygonMTV(cx, cy, radius, verts)
  if (!mtv) return null
  return { overlap: mtv.pen, axis: [mtv.nx, mtv.ny] }
}

export function circleConvexPolygonMTV(
  cx: number,
  cy: number,
  radius: number,
  verts: [number, number][],
): HitResult | null {
  if (verts.length < 3) return null

  let minOverlap = Infinity
  let bestAxis: [number, number] = [1, 0]
  const [polyCx, polyCy] = polygonCentroid(verts)
  const polyCenterByAxis = (axis: [number, number]) =>
    polyCx * axis[0] + polyCy * axis[1]

  const axes = getAxes(verts)

  let closest = verts[0]
  let closestD2 = Infinity
  for (const v of verts) {
    const d2 = (v[0] - cx) ** 2 + (v[1] - cy) ** 2
    if (d2 < closestD2) {
      closest = v
      closestD2 = d2
    }
  }

  const vx = cx - closest[0]
  const vy = cy - closest[1]
  const vLen = Math.hypot(vx, vy)
  if (vLen > 0.000001) {
    axes.push([vx / vLen, vy / vLen])
  }

  for (let axis of axes) {
    const len = Math.hypot(axis[0], axis[1])
    if (len <= 0.000001) continue
    axis = [axis[0] / len, axis[1] / len]

    const polyProj = project(verts, axis)
    const circleProj = projectCircle(cx, cy, radius, axis)
    const overlap =
      Math.min(polyProj.max, circleProj.max) -
      Math.max(polyProj.min, circleProj.min)

    if (overlap <= 0) return null

    const polyCenter = polyCenterByAxis(axis)
    const direction = circleProj.center >= polyCenter ? 1 : -1
    const orientedAxis: [number, number] = [
      axis[0] * direction,
      axis[1] * direction,
    ]

    if (overlap < minOverlap) {
      minOverlap = overlap
      bestAxis = orientedAxis
    }
  }

  return { nx: bestAxis[0], ny: bestAxis[1], pen: minOverlap + MTV_SLOP }
}

/** Generic SAT circle vs convex polygon MTV. Normal points from polygon to circle. */
export function circlePolygonMTV(
  cx: number,
  cy: number,
  radius: number,
  verts: [number, number][]
): HitResult | null {
  return circleConvexPolygonMTV(cx, cy, radius, verts)
}

export function shapeBallHit(
  p: GPiece,
  bx: number,
  by: number
): { nx: number; ny: number; pen: number } | null {
  if (p.type === "circle") {
    const dx = bx - p.x
    const dy = by - p.y
    const d = Math.hypot(dx, dy)
    const minD = PR + BR
    if (d > 0.01 && d < minD) return { nx: dx / d, ny: dy / d, pen: minD - d }
    if (d <= 0.01) return { nx: 1, ny: 0, pen: minD }
    return null
  }
  const verts = getPieceWorldVerts(p)
  const result = circlePolygonMTV(bx, by, BR, verts)
  if (!result) return null
  const { nx, ny, pen } = result
  const pieceToBallX = bx - p.x
  const pieceToBallY = by - p.y
  const dot = pieceToBallX * nx + pieceToBallY * ny
  return {
    nx: dot >= 0 ? nx : -nx,
    ny: dot >= 0 ? ny : -ny,
    pen,
  }
}

export function piecePieceHit(
  p1: GPiece,
  p2: GPiece
): { nx: number; ny: number; pen: number } | null {
  if (p1.type === "circle" && p2.type === "circle") {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const d = Math.hypot(dx, dy)
    const minD = PR * 2
    if (d > 0.01 && d < minD) return { nx: dx / d, ny: dy / d, pen: minD - d }
    if (d <= 0.01) return { nx: 1, ny: 0, pen: minD }
    return null
  }
  const verts1 = p1.type === "circle" ? null : getPieceWorldVerts(p1)
  const verts2 = p2.type === "circle" ? null : getPieceWorldVerts(p2)
  let result: { overlap: number; axis: [number, number] } | null = null
  if (verts1 && verts2) {
    result = satPolygonPolygon(verts1, verts2)
  } else if (verts1 && p2.type === "circle") {
    result = satCirclePolygon(p2.x, p2.y, PR, verts1)
  } else if (verts2 && p1.type === "circle") {
    result = satCirclePolygon(p1.x, p1.y, PR, verts2)
    if (result) result.axis = [-result.axis[0], -result.axis[1]]
  }
  if (!result) return null
  const { overlap, axis } = result
  const nx = axis[0]
  const ny = axis[1]
  const p1ToP2X = p2.x - p1.x
  const p1ToP2Y = p2.y - p1.y
  const dot = p1ToP2X * nx + p1ToP2Y * ny
  return {
    nx: dot >= 0 ? nx : -nx,
    ny: dot >= 0 ? ny : -ny,
    pen: overlap,
  }
}

export function pieceAabb(p: GPiece) {
  return pieceWorldBounds(p)
}

export function ballNearPieceAabb(p: GPiece, bx: number, by: number) {
  const a = pieceAabb(p)
  return bx + BR >= a.minX && bx - BR <= a.maxX && by + BR >= a.minY && by - BR <= a.maxY
}

/** Returns MTV for circle vs wall (axis-aligned). */
export interface WallResult {
  x: number
  y: number
  nx: number
  ny: number
  collided: boolean
}

/**
 * Resolve the ball's centre against a ROUNDED-RECTANGLE field boundary
 * (solid rounded corners so the ball rolls around them, with goal openings on
 * the left/right straight edges). Returns the corrected position and the
 * surface normal at the point of contact.
 */
export function ballRoundedWall(
  bx: number,
  by: number,
  goalY0: number,
  goalY1: number,
): WallResult {
  const left = BR
  const right = VW - BR
  const top = BR
  const bottom = VH - BR
  const cr = CORNER_RADIUS

  const cLeft = left + cr
  const cRight = right - cr
  const cTop = top + cr
  const cBottom = bottom - cr

  const cx = clamp(bx, cLeft, cRight)
  const cy = clamp(by, cTop, cBottom)
  const dx = bx - cx
  const dy = by - cy
  const dist = Math.hypot(dx, dy)

  if (dist <= cr) {
    return { x: bx, y: by, nx: 0, ny: 0, collided: false }
  }

  const inv = 1 / dist
  let nx = dx * inv
  let ny = dy * inv

  // Goal opening: a horizontal correction within the goal mouth is open
  if (Math.abs(nx) > Math.abs(ny) && by >= goalY0 && by <= goalY1) {
    return { x: bx, y: by, nx: 0, ny: 0, collided: false }
  }

  return { x: cx + nx * cr, y: cy + ny * cr, nx, ny, collided: true }
}
