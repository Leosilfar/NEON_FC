import type { GameSettings, GS } from "@/types"

import { BR, PR, VH, VW, clamp } from "@/constants/physics"
import { getPlayRect } from "@/utils/canvasHelpers"
import { cBall, cParticle, cPiece, cShockwave } from "@/utils/canvasDrawing"
import { getKickoffLightLevel } from "@/utils/kickoffLighting"

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
  const kickoffElapsed = gameState.kickoffDuration - gameState.kickoffCountdown
  const isIntroBlackout =
    gameState.kickoffPhase === "intro" && gameState.kickoffCountdown > 0
  const pieceReveal = getKickoffLightLevel(kickoffElapsed)
  const selId =
    teamA.find((p) => p.isPlayerControlled)?.id ??
    teamA[gameState.selectedIdx]?.id ??
    null

  for (const p of gameState.pieces) {
    if (isIntroBlackout) {
      ctx.globalAlpha = pieceReveal
    }
    const isKickFlash =
      (p.id === selId && ts < gameState.kickFlashUntil) ||
      ts < (gameState.aiKickFlashUntil[p.id] ?? 0)
    cPiece(
      ctx,
      p,
      toX(p.x),
      toY(p.y),
      pr,
      settings.pieceColors[p.type],
      p.id === selId && !isIntroBlackout,
      ts,
      settings.glowIntensity,
      settings.teamA.color,
      settings.teamB.color,
      isKickFlash,
    )
    ctx.globalAlpha = 1
  }

  if (gameState.aiDebugEnabled) {
    ctx.save()
    ctx.font = `bold ${Math.max(8, 10 * play.scale)}px monospace`
    ctx.textBaseline = "middle"
    for (const p of gameState.pieces) {
      const decision = gameState.aiDecisionStates[p.id]
      if (!decision || p.isPlayerControlled) continue
      const color = p.team === "A" ? "#43f5ff" : "#ff4da6"
      const px = toX(p.x)
      const py = toY(p.y)
      const tx = toX(decision.targetX)
      const ty = toY(decision.targetY)
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.globalAlpha = 0.45
      ctx.setLineDash([4 * play.scale, 3 * play.scale])
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(tx, ty, Math.max(3, pr * 0.22), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      const receiverLabel = decision.action === "PASS" && decision.kickReceiverId != null
        ? `→${decision.kickReceiverId}`
        : ""
      ctx.fillText(`${p.role ?? "?"} ${decision.action}${receiverLabel}`, px + pr * 0.45, py - pr * 0.8)

      if (decision.action === "PASS" || decision.action === "SHOOT") {
        const aimX = toX(decision.kickTargetX)
        const aimY = toY(decision.kickTargetY)
        const ballX = toX(gameState.ball.x)
        const ballY = toY(gameState.ball.y)
        ctx.strokeStyle = decision.action === "PASS" ? "#9dff9d" : "#ffd166"
        ctx.fillStyle = ctx.strokeStyle
        ctx.globalAlpha = 0.78
        ctx.setLineDash([2 * play.scale, 3 * play.scale])
        ctx.beginPath()
        ctx.moveTo(ballX, ballY)
        ctx.lineTo(aimX, aimY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(aimX, aimY, Math.max(3, pr * 0.2), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 0.9
    ctx.fillStyle = "#ffffff"
    ctx.fillText("DEBUG IA · F3", play.x + 10, play.y + 14)
    ctx.restore()
  }

  if (isIntroBlackout) {
    ctx.globalAlpha = pieceReveal
  }
  cBall(ctx, toX(gameState.ball.x), toY(gameState.ball.y), br, ts)
  ctx.globalAlpha = 1

  for (const w of gameState.shockwaves) {
    cShockwave(ctx, w, toX, toY, play.scale)
  }

  for (const p of gameState.particles) {
    cParticle(ctx, p, toX, toY, play.scale)
  }

  ctx.restore()
}
