import type { RefObject } from "react"

import { FieldLines } from "@/components/common"

import type { PlayRect } from "@/types"
import type { KickoffPhase } from "@/types"

import { CORNER_RADIUS, VW } from "@/constants/physics"
import { getKickoffLightLevel } from "@/utils/kickoffLighting"

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

  kickoffCountdown,

  kickoffDuration,

  kickoffPhase,

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

  kickoffCountdown: number

  kickoffDuration: number

  kickoffPhase: KickoffPhase

  onFieldClick: (clientX: number, clientY: number) => void
}) {
  const kickoffElapsed = kickoffDuration - kickoffCountdown
  const lightsReveal = getKickoffLightLevel(kickoffElapsed)
  const fieldBlackoutOpacity = 1 - lightsReveal
  const borderAlpha = Math.round(lightsReveal * 220)
    .toString(16)
    .padStart(2, "0")

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
      {kickoffPhase === "intro" && kickoffCountdown > 0 && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            left: playRect.x,
            top: playRect.y,
            width: playRect.w,
            height: playRect.h,
            zIndex: 9,
            borderRadius: (CORNER_RADIUS / VW) * playRect.w,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: "#02030a",
              opacity: fieldBlackoutOpacity,
              pointerEvents: "none",
              transition: "opacity 140ms linear",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 1,
              borderRadius: "inherit",
              border: `1px solid ${accentColor}${borderAlpha}`,
              boxShadow: `inset 0 0 ${48 * lightsReveal}px ${accentColor}66, 0 0 ${34 * lightsReveal}px ${accentColor}bb`,
              background: `radial-gradient(ellipse at center, ${accentColor}22, transparent 72%)`,
              opacity: lightsReveal,
              pointerEvents: "none",
              transition:
                "opacity 140ms linear, box-shadow 140ms linear, border-color 140ms linear",
            }}
          />
          <div
            style={{
              position: "absolute",
              zIndex: 1,
              left: "50%",
              top: "30%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              textShadow: `0 0 12px ${accentColor}, 0 0 32px ${accentColor}`,
            }}
          >
            <div
              style={{
                fontSize: "clamp(12px, 1.4vw, 18px)",
                letterSpacing: "0.35em",
              }}
            >
              A PARTIDA COMEÇA EM
            </div>
            <div
              key={Math.ceil(kickoffCountdown)}
              style={{
                fontSize: "clamp(46px, 8vw, 92px)",
                lineHeight: 1,
                animation: "kickoff-count 0.45s ease-out",
              }}
            >
              {kickoffCountdown < 0.35 ? "VAI" : Math.ceil(kickoffCountdown)}
            </div>
          </div>
        </div>
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
        TAB=trocar · WASD/↑←↓→=mover · Q/E=girar · ESC=pause
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
