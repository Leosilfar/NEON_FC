import type { GPiece, PieceType } from "@/types";
import { BR, PR } from "@/constants";

export function getPieceVerts(
  type: PieceType,
  cx: number,
  cy: number,
  r: number
): [number, number][] {
  switch (type) {
    case "square": {
      const s = r * 0.88;
      return [
        [cx - s, cy - s],
        [cx + s, cy - s],
        [cx + s, cy + s],
        [cx - s, cy + s],
      ];
    }
    case "triangle":
      return [
        [cx, cy - r * 0.95],
        [cx + r * 0.95, cy + r * 0.95],
        [cx - r * 0.95, cy + r * 0.95],
      ];
    case "diamond":
      return [
        [cx, cy - r * 0.95],
        [cx + r * 0.95, cy],
        [cx, cy + r * 0.95],
        [cx - r * 0.95, cy],
      ];
    case "pentagon":
      return Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180);
        return [
          cx + r * 0.95 * Math.cos(a),
          cy + r * 0.95 * Math.sin(a),
        ] as [number, number];
      });
    case "line": {
      const hw = r * 1.4;
      const hh = r * 0.34;
      return [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh],
      ];
    }
    default:
      return [];
  }
}

export function pieceAabb(p: GPiece) {
  if (p.type === "line") {
    return {
      minX: p.x - PR * 1.4,
      maxX: p.x + PR * 1.4,
      minY: p.y - PR * 0.34,
      maxY: p.y + PR * 0.34,
    };
  }
  return {
    minX: p.x - PR,
    maxX: p.x + PR,
    minY: p.y - PR,
    maxY: p.y + PR,
  };
}

export function ballNearPieceAabb(p: GPiece, bx: number, by: number) {
  const a = pieceAabb(p);
  return (
    bx + BR >= a.minX &&
    bx - BR <= a.maxX &&
    by + BR >= a.minY &&
    by - BR <= a.maxY
  );
}

export function shapeBallHit(
  p: GPiece,
  bx: number,
  by: number
): { nx: number; ny: number; pen: number } | null {
  if (p.type === "circle") {
    const dx = bx - p.x;
    const dy = by - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const minD = PR + BR;
    if (d > 0.01 && d < minD) return { nx: dx / d, ny: dy / d, pen: minD - d };
    if (d <= 0.01) return { nx: 1, ny: 0, pen: minD };
    return null;
  }

  const verts = getPieceVerts(p.type, p.x, p.y, PR);
  const n = verts.length;
  let minD2 = Infinity;
  let cpx = bx;
  let cpy = by;

  for (let i = 0; i < n; i++) {
    const [ax, ay] = verts[i];
    const [vbx, vby] = verts[(i + 1) % n];
    const ex = vbx - ax;
    const ey = vby - ay;
    const el2 = ex * ex + ey * ey;
    if (el2 < 0.001) continue;
    const t = Math.max(
      0,
      Math.min(1, ((bx - ax) * ex + (by - ay) * ey) / el2)
    );
    const qx = ax + t * ex;
    const qy = ay + t * ey;
    const d2 = (bx - qx) ** 2 + (by - qy) ** 2;
    if (d2 < minD2) {
      minD2 = d2;
      cpx = qx;
      cpy = qy;
    }
  }

  let inside = true;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = verts[i];
    const [vbx, vby] = verts[(i + 1) % n];
    if ((vbx - ax) * (by - ay) - (vby - ay) * (bx - ax) <= 0) {
      inside = false;
      break;
    }
  }

  const dist = Math.sqrt(minD2);
  if (inside) {
    const ddx = bx - p.x;
    const ddy = by - p.y;
    const ddl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
    return { nx: ddx / ddl, ny: ddy / ddl, pen: BR + dist };
  }

  if (dist < BR) {
    const ddx = bx - cpx;
    const ddy = by - cpy;
    const ddl = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
    return { nx: ddx / ddl, ny: ddy / ddl, pen: BR - dist };
  }

  return null;
}
