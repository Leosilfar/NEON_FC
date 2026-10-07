import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { PR, VH, VW, vdist } from "@/constants/physics"
import { selectClosestPlayerToBall } from "@/engine/ai"
import type { GameControls, GS } from "@/types"
import { getPlayRect } from "@/utils/canvasHelpers"

export interface AimState {
  active: boolean
  startX: number
  startY: number
  x: number
  y: number
}

export function useMatchInput({
  fieldRef,
  gsRef,
  controls,
  onStateChange,
}: {
  fieldRef: React.RefObject<HTMLDivElement | null>
  gsRef: React.MutableRefObject<GS>
  controls: GameControls
  onStateChange: () => void
}) {
  const keysRef = useRef<Set<string>>(new Set())
  const [aim, setAim] = useState<AimState | null>(null)

  const selectPieceAt = useCallback(
    (clientX: number, clientY: number) => {
      const field = fieldRef.current
      if (!field) return

      const gs = gsRef.current
      const rect = field.getBoundingClientRect()
      const play = getPlayRect(rect.width, rect.height, false)
      const lx = clientX - rect.left - play.x
      const ly = clientY - rect.top - play.y

      if (lx < 0 || ly < 0 || lx > play.w || ly > play.h) return

      const mx = (lx / play.w) * VW
      const my = (ly / play.h) * VH
      const teamA = gs.pieces.filter((p) => p.team === "A")
      let best: number | null = null
      let bestD = PR * 1.6

      teamA.forEach((p, i) => {
        const d = vdist(p.x, p.y, mx, my)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })

      if (best !== null) {
        gs.selectedIdx = best
        teamA.forEach((p, i) => {
          p.isPlayerControlled = i === best
        })
        const selected = teamA[best]
        gs.pieceVx = selected?.vx ?? 0
        gs.pieceVy = selected?.vy ?? 0
        onStateChange()
      }
    },
    [fieldRef, gsRef, onStateChange],
  )

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.code
      if (
        [
          controls.moveUp,
          controls.moveDown,
          controls.moveLeft,
          controls.moveRight,
          controls.rotateLeft,
          controls.rotateRight,
          controls.selectNearest,
          controls.pause,
        ].includes(key)
      ) {
        e.preventDefault()
      }

      keysRef.current.add(key)

      if (key === controls.selectNearest) {
        selectClosestPlayerToBall(gsRef.current, "A")
        onStateChange()
      }

      if (key === controls.pause) {
        if (gsRef.current.finished) return
        gsRef.current.paused = !gsRef.current.paused
        onStateChange()
      }
    }

    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }

    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)

    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [controls, gsRef, onStateChange])

  const pointerHandlers = useMemo(
    () => ({
      onPointerDown: (clientX: number, clientY: number) => {
        selectPieceAt(clientX, clientY)
        setAim({
          active: true,
          startX: clientX,
          startY: clientY,
          x: clientX,
          y: clientY,
        })
      },
      onPointerMove: (clientX: number, clientY: number) => {
        setAim((prev) => (prev ? { ...prev, x: clientX, y: clientY } : prev))
      },
      onPointerUp: () => setAim(null),
    }),
    [selectPieceAt],
  )

  return { keysRef, aim, selectPieceAt, pointerHandlers }
}
