import { useCallback, useEffect, useRef, useState } from "react"

import type { GameSettings, GS, HudSnap, MatchMode, SlotPiece } from "@/types"

import {
  FIXED_DT,
  NORMAL_MATCH_DURATION,
  MAX_FRAME_DT,
  MAX_STEPS_PER_FRAME,
} from "@/constants/physics"

import { makeGS } from "@/engine/state"
import { stepMatchSimulation } from "@/engine/simulation"
import { renderMatchFrame } from "@/components/match/renderMatchFrame"
import { useMatchInput } from "@/hooks/useMatchInput"

export function useMatch(
  playerSlots: SlotPiece[],
  matchMode: MatchMode,
  settings: GameSettings,
  fieldRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  fw: number,
  fh: number,
) {
  const gsRef = useRef<GS>(makeGS(playerSlots, undefined, matchMode, true))
  const settRef = useRef<GameSettings>(settings)
  const playerSlotsRef = useRef<SlotPiece[]>(playerSlots)
  const rafRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)
  const accRef = useRef(0)
  const nextHudSyncRef = useRef(0)

  useEffect(() => {
    settRef.current = settings
  }, [settings])

  const [hud, setHud] = useState<HudSnap>(() => {
    const gs = gsRef.current

    return {
      scoreA: 0,
      scoreB: 0,
      matchMode,
      timeLeft: matchMode === "normal" ? NORMAL_MATCH_DURATION : Infinity,
      notification: null,
      paused: false,
      finished: false,
      selectedId: gs.pieces.filter((p) => p.team === "A")[0]?.id ?? null,
      flashColor: null,
      goalColor: null,
    }
  })

  const hudRef = useRef(hud)

  useEffect(() => {
    hudRef.current = hud
  }, [hud])

  const makeHudSnap = useCallback((): HudSnap => {
    const gs = gsRef.current
    const teamA = gs.pieces.filter((p) => p.team === "A")

    return {
      scoreA: gs.scoreA,
      scoreB: gs.scoreB,
      matchMode: gs.matchMode,
      timeLeft: gs.timeLeft,
      notification: gs.notification,
      paused: gs.paused,
      finished: gs.finished,
      selectedId: teamA[gs.selectedIdx]?.id ?? null,
      flashColor:
        gs.goalColor && performance.now() < gs.flashUntil ? gs.goalColor : null,
      goalColor: gs.goalColor,
    }
  }, [])

  const publishHud = useCallback(
    (force = false) => {
      const next = makeHudSnap()
      const prev = hudRef.current
      const changed =
        force ||
        prev.scoreA !== next.scoreA ||
        prev.scoreB !== next.scoreB ||
        prev.matchMode !== next.matchMode ||
        prev.paused !== next.paused ||
        prev.finished !== next.finished ||
        prev.notification !== next.notification ||
        prev.goalColor !== next.goalColor ||
        prev.flashColor !== next.flashColor ||
        prev.selectedId !== next.selectedId ||
        Math.floor(prev.timeLeft) !== Math.floor(next.timeLeft)

      if (changed) {
        hudRef.current = next
        setHud(next)
      }
    },
    [makeHudSnap],
  )

  const { keysRef, selectPieceAt } = useMatchInput({
    fieldRef,
    gsRef,
    onStateChange: () => publishHud(true),
  })

  useEffect(() => {
    playerSlotsRef.current = playerSlots
    gsRef.current = makeGS(playerSlots, undefined, matchMode, true)
    keysRef.current.clear()
    publishHud(true)
  }, [keysRef, matchMode, playerSlots, publishHud])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
    c.width = Math.max(1, Math.round(fw * dpr))
    c.height = Math.max(1, Math.round(fh * dpr))
  }, [fw, fh, canvasRef])

  const tick = useCallback(
    (ts: number) => {
      const last = lastTsRef.current || ts
      const frameDt = Math.min((ts - last) / 1000, MAX_FRAME_DT)

      lastTsRef.current = ts
      accRef.current += frameDt

      let steps = 0
      while (accRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        stepMatchSimulation({
          gs: gsRef.current,
          settings: settRef.current,
          input: { keys: keysRef.current },
          playerSlots: playerSlotsRef.current,
          dt: FIXED_DT,
          ts,
        })

        accRef.current -= FIXED_DT
        steps++
      }

      if (steps === MAX_STEPS_PER_FRAME) accRef.current = 0

      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")

      if (canvas && canvas.width > 0 && canvas.height > 0 && ctx) {
        renderMatchFrame({
          ctx,
          canvas,
          gameState: gsRef.current,
          settings: settRef.current,
          ts,
        })
      }

      if (ts >= nextHudSyncRef.current) {
        publishHud()
        nextHudSyncRef.current = ts + 125
      }

      rafRef.current = requestAnimationFrame(tick)
    },
    [canvasRef, keysRef, publishHud],
  )

  useEffect(() => {
    lastTsRef.current = performance.now()
    accRef.current = 0
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  function pauseToggle() {
    if (gsRef.current.finished) return
    gsRef.current.paused = !gsRef.current.paused
    publishHud(true)
  }

  function restartGame() {
    gsRef.current = makeGS(playerSlotsRef.current, undefined, matchMode, true)
    keysRef.current.clear()
    publishHud(true)
  }

  return { hud, gsRef, pauseToggle, restartGame, selectPieceAt }
}
