import type { GameSettings, GS } from "@/types"

import { BR, PR, VH, VW, clamp } from "@/constants/physics"
import { getPlayRect } from "@/utils/canvasHelpers"
import { cBall, cParticle, cPiece, cShockwave } from "@/utils/canvasDrawing"

export function renderMatchFrame({
  ctx,
  canvas,
  gameState,
  settings,
  ts,
}: {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  gameState: GS
  settings: GameSettings
  ts: number
}) {
  const rect = canvas.getBoundingClientRect()
  const cw = rect.width || canvas.width
  const ch = rect.height || canvas.height
  const dprX = canvas.width / cw
  const dprY = canvas.height / ch

  ctx.setTransform(dprX, 0, 0, dprY, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  const play = getPlayRect(cw, ch, false)
  const shakeT = clamp((gameState.shakeUntil - ts) / 300, 0, 1)
  const shakeX = shakeT > 0 ? (Math.random() - 0.5) * 8 * shakeT : 0
  const shakeY = shakeT > 0 ? (Math.random() - 0.5) * 8 * shakeT : 0

  ctx.save()
  ctx.translate(shakeX, shakeY)

  const toX = (vx: number) => play.x + (vx / VW) * play.w
  const toY = (vy: number) => play.y + (vy / VH) * play.h
  const pr = PR * play.scale
  const br = BR * play.scale
  const teamA = gameState.pieces.filter((p) => p.team === "A")
  const selId = teamA.find((p) => p.isPlayerControlled)?.id ?? teamA[gameState.selectedIdx]?.id ?? null

  for (const p of gameState.pieces) {
    cPiece(
      ctx,
      p,
      toX(p.x),
      toY(p.y),
      pr,
      settings.pieceColors[p.type],
      p.id === selId,
      ts,
      settings.glowIntensity,
      settings.teamA.color,
      settings.teamB.color,
    )
  }

  cBall(ctx, toX(gameState.ball.x), toY(gameState.ball.y), br, ts)

  for (const w of gameState.shockwaves) {
    cShockwave(ctx, w, toX, toY, play.scale)
  }

  for (const p of gameState.particles) {
    cParticle(ctx, p, toX, toY, play.scale)
  }

  ctx.restore()
}
