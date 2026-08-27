import { useEffect, useState } from "react"

import type { PlayRect } from "@/types"

import {
  BOTTOM_HUD_HEIGHT,
  FIELD_SAFE_GAP,
  TOP_HUD_HEIGHT,
  VH,
  VW,
} from "@/constants"

export function getPlayRect(
  w: number,

  h: number,

  showBottomHud = true,
): PlayRect {
  const padX = 8

  const top = TOP_HUD_HEIGHT + FIELD_SAFE_GAP

  const bottom = showBottomHud
    ? BOTTOM_HUD_HEIGHT + FIELD_SAFE_GAP
    : FIELD_SAFE_GAP

  const aw = Math.max(1, w - padX * 2)

  const ah = Math.max(1, h - top - bottom)

  const scale = Math.min(aw / VW, ah / VH)

  const rw = VW * scale

  const rh = VH * scale

  return { x: (w - rw) / 2, y: top + (ah - rh) / 2, w: rw, h: rh, scale }
}

export function useFieldSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 800, h: 480 })

  useEffect(() => {
    if (!ref.current) return

    const read = () => {
      if (!ref.current) return

      const rect = ref.current.getBoundingClientRect()

      setSize({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) })
    }

    read()

    const obs = new ResizeObserver(([e]) => {
      const rect = ref.current?.getBoundingClientRect()

      setSize({
        w: Math.max(1, e.contentRect.width || rect?.width || 1),

        h: Math.max(1, e.contentRect.height || rect?.height || 1),
      })
    })

    obs.observe(ref.current)

    return () => obs.disconnect()
  }, [ref])

  return size
}
