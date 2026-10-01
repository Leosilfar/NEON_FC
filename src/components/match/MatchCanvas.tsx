import type { RefObject } from "react"

import { FieldLines } from "@/components/common"

import type { PlayRect } from "@/types"

import { CORNER_RADIUS, VW } from "@/constants/physics"

export default function MatchCanvas({
  fieldRef,

  canvasRef,

  playRect,

  bgCss,

  lineColor,

  fieldSurfaceColor,

  hintColor,

  notification,

  goalColor,

  accentColor,

  onFieldClick,
}: {
  fieldRef: RefObject<HTMLDivElement | null>

  canvasRef: RefObject<HTMLCanvasElement | null>

  playRect: PlayRect

  bgCss: string

  lineColor: string

  fieldSurfaceColor: string

  hintColor: string

  notification: string | null

  goalColor: string | null

  accentColor: string

  onFieldClick: (clientX: number, clientY: number) => void
}) {
  return (
    <div
      ref={fieldRef}
      style={{ position: "absolute", inset: 0, background: bgCss }}
    >
      <div
        style={{
          position: "absolute",

          left: playRect.x,

          top: playRect.y,

          width: playRect.w,

          height: playRect.h,

          zIndex: 2,

          pointerEvents: "none",

          transition: "filter 0.12s ease",
        }}
      >
        <FieldLines w={playRect.w} h={playRect.h} color={lineColor} />
      </div>
      {fieldSurfaceColor && fieldSurfaceColor !== "rgba(0,0,0,0.0)" && (
        <div
          style={{
            position: "absolute",

            left: playRect.x,

            top: playRect.y,

            width: playRect.w,

            height: playRect.h,

            background: fieldSurfaceColor,

            borderRadius: (CORNER_RADIUS / VW) * playRect.w,

            pointerEvents: "none",

            zIndex: 1,
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",

          inset: 0,

          width: "100%",

          height: "100%",

          zIndex: 10,

          pointerEvents: "none",
        }}
      />
      <div
        style={{ position: "absolute", inset: 0, zIndex: 11 }}
        onClick={(e) => onFieldClick(e.clientX, e.clientY)}
      />
      <span
        style={{
          position: "absolute",

          bottom: 8,

          right: 18,

          zIndex: 20,

          fontFamily: "var(--font-mono)",

          fontSize: 9,

          color: `${hintColor}44`,

          letterSpacing: "0.12em",
        }}
      >
        TAB=trocar · WASD/↑←↓→=mover · ESC=pause
      </span>
      {notification && (
        <div
          style={{
            position: "absolute",

            top: "50%",

            left: "50%",

            transform: "translate(-50%,-50%)",

            zIndex: 50,

            pointerEvents: "none",

            fontFamily: "var(--font-display)",

            fontSize: "clamp(64px,12vw,148px)",

            fontWeight: 900,

            color: goalColor ?? accentColor,

            textShadow:
              "0 0 18px currentColor,0 0 54px currentColor,0 0 110px currentColor",

            letterSpacing: "0.12em",

            textAlign: "center",

            lineHeight: 0.9,

            animation:
              "goal-pop 0.55s ease-out, pulse-glow 0.5s ease-in-out infinite",
          }}
        >
          {notification}
        </div>
      )}
    </div>
  )
}
