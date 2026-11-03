import type { RefObject } from "react"

import { FieldLines } from "@/components/common"

import type { KickoffPhase } from "@/types"

import { CORNER_RADIUS, FIELD_SAFE_GAP, TOP_HUD_HEIGHT, VH, VW } from "@/constants/physics"
import { getKickoffLightLevel } from "@/utils/kickoffLighting"

export default function MatchCanvas({
  fieldRef,

  sceneRef,

  canvasRef,

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

  endingProgress,

  onFieldClick,
}: {
  fieldRef: RefObject<HTMLDivElement | null>

  sceneRef: RefObject<HTMLDivElement | null>

  canvasRef: RefObject<HTMLCanvasElement | null>

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

  endingProgress: number

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
      style={{
        position: "absolute",
        top: TOP_HUD_HEIGHT + FIELD_SAFE_GAP,
        left: 0,
        width: "100%",
        height: `calc(100% - ${TOP_HUD_HEIGHT + 2 * FIELD_SAFE_GAP}px)`,
        overflow: "hidden",
        background: bgCss,
        borderRadius: CORNER_RADIUS,
        boxShadow: "0 18px 48px rgba(0,0,0,0.42), 0 0 28px rgba(34,211,238,0.09)",
      }}
    >
      <div
        ref={sceneRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VW,
          height: VH,
          transformOrigin: "top left",
          willChange: "transform",

          zIndex: 1,

          pointerEvents: "none",

          transition: "filter 0.12s ease, opacity 100ms linear",

          opacity: 1 - endingProgress,
        }}
      >
        {fieldSurfaceColor && fieldSurfaceColor !== "rgba(0,0,0,0.0)" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: fieldSurfaceColor,
              borderRadius: CORNER_RADIUS,
              pointerEvents: "none",
              zIndex: 0,
              opacity: 1 - endingProgress,
              transition: "opacity 100ms linear",
            }}
          />
        )}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            borderRadius: CORNER_RADIUS,
            pointerEvents: "none",
            background: [
              "radial-gradient(ellipse at 50% 45%, rgba(60,150,255,0.10) 0%, rgba(10,25,60,0.04) 48%, rgba(0,0,0,0.30) 100%)",
              "linear-gradient(180deg, rgba(150,220,255,0.045), transparent 18%, transparent 82%, rgba(0,0,0,0.16))",
              "linear-gradient(90deg, rgba(0,0,0,0.12), transparent 12%, transparent 88%, rgba(0,0,0,0.12))",
            ].join(","),
            boxShadow: "inset 0 0 70px rgba(0,0,0,0.22), inset 0 1px 16px rgba(100,190,255,0.07)",
          }}
        />
        <div
          style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
        >
          <FieldLines w={VW} h={VH} color={lineColor} />
        </div>
        {kickoffPhase === "intro" && kickoffCountdown > 0 && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9,
            borderRadius: CORNER_RADIUS,
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
        {endingProgress > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 12,
            borderRadius: CORNER_RADIUS,
            background: "#02030a",
            opacity: endingProgress,
            pointerEvents: "none",
            transition: "opacity 100ms linear",
          }}
        />
        )}
        <canvas
        ref={canvasRef}
        style={{
          position: "absolute",

          inset: 0,

          width: VW,

          height: VH,

          zIndex: 10,

          pointerEvents: "none",
        }}
        />
        <div
          style={{ position: "absolute", inset: 0, zIndex: 11, pointerEvents: "auto" }}
          onClick={(e) => onFieldClick(e.clientX, e.clientY)}
        />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 15,
          borderRadius: "inherit",
          border: `1px solid ${lineColor}70`,
          boxShadow: [
            `0 0 14px ${accentColor}38`,
            `inset 0 0 22px ${lineColor}18`,
            `inset 0 0 2px ${lineColor}88`,
          ].join(","),
          opacity: 1 - endingProgress,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "fixed",

          bottom: 8,

          right: 18,

          zIndex: 20,

          fontFamily: "var(--font-mono)",

          fontSize: 9,

          color: `${hintColor}44`,

          letterSpacing: "0.12em",
        }}
      >
              TAB=trocar · WASD/↑←↓→=mover · Q/E=girar · F3=IA · ESC=pause
      </span>
      {notification && (
        <div
          style={{
            position: "fixed",

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
