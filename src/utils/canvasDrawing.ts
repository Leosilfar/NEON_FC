import type { GPiece, GlowLevel, Particle, PieceType, Shockwave } from "@/types";
import { clamp } from "@/constants";

export function cShape(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  switch (type) {
    case "triangle":
      ctx.moveTo(cx, cy - r * 0.95);
      ctx.lineTo(cx + r * 0.95, cy + r * 0.95);
      ctx.lineTo(cx - r * 0.95, cy + r * 0.95);
      ctx.closePath();
      break;
    case "square": {
      const s2 = r * 0.88;
      ctx.rect(cx - s2, cy - s2, s2 * 2, s2 * 2);
      break;
    }
    case "circle":
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      break;
    case "diamond":
      ctx.moveTo(cx, cy - r * 0.95);
      ctx.lineTo(cx + r * 0.95, cy);
      ctx.lineTo(cx, cy + r * 0.95);
      ctx.lineTo(cx - r * 0.95, cy);
      ctx.closePath();
      break;
    case "pentagon":
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * (Math.PI / 180);
        if (i === 0) ctx.moveTo(cx + r * 0.95 * Math.cos(a), cy + r * 0.95 * Math.sin(a));
        else ctx.lineTo(cx + r * 0.95 * Math.cos(a), cy + r * 0.95 * Math.sin(a));
      }
      ctx.closePath();
      break;
    case "line":
      ctx.roundRect(
        cx - r * 1.4,
        cy - r * 0.34,
        r * 2.8,
        r * 0.68,
        r * 0.28
      );
      break;
  }
}

export function cPiece(
  ctx: CanvasRenderingContext2D,
  p: GPiece,
  cx: number,
  cy: number,
  r: number,
  color: string,
  selected: boolean,
  ts: number,
  glowLevel: GlowLevel,
  teamAColor: string,
  teamBColor: string
) {
  const gz = glowLevel === "low" ? 5 : glowLevel === "high" ? 18 : 10;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = selected ? gz * 1.8 : gz;
  ctx.fillStyle = color + "22";
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 2.5 : 1.8;
  cShape(ctx, p.type, cx, cy, r);
  ctx.fill();
  ctx.stroke();
  const dot = p.team === "A" ? teamAColor : teamBColor;
  ctx.shadowColor = dot;
  ctx.shadowBlur = 7;
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -((ts * 0.045) % 7);
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = gz * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r + r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function cBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  ts: number
) {
  const pulse = 1 + Math.sin(ts * 0.005) * 0.28;
  ctx.save();
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 16 * pulse;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(190,220,255,0.5)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function cParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  toX: (v: number) => number,
  toY: (v: number) => number,
  scale: number
) {
  const alpha = clamp(p.life / p.ttl, 0, 1);
  const size = p.size * scale;
  ctx.save();
  ctx.translate(toX(p.x), toY(p.y));
  ctx.rotate(p.rot);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 14 * alpha;
  ctx.fillStyle = p.color;
  cShape(ctx, p.type, 0, 0, size);
  ctx.fill();
  ctx.restore();
}

export function cShockwave(
  ctx: CanvasRenderingContext2D,
  w: Shockwave,
  toX: (v: number) => number,
  toY: (v: number) => number,
  scale: number
) {
  const t = 1 - clamp(w.life / w.ttl, 0, 1);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = w.color;
  ctx.lineWidth = Math.max(1.5, 4 * scale * (1 - t));
  ctx.shadowColor = w.color;
  ctx.shadowBlur = 24 * (1 - t);
  ctx.beginPath();
  ctx.arc(toX(w.x), toY(w.y), (18 + t * 170) * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
