import type { GameSettings, HudSnap } from "@/types"

import { LogoSVG } from "@/components/common"

export default function PauseOverlay({
  settings,

  hud,

  onContinue,

  onRestart,

  onExit,
}: {
  settings: GameSettings

  hud: HudSnap

  onContinue: () => void

  onRestart: () => void

  onExit: () => void
}) {
  const ac = settings.accentColor

  return (
    <div
      style={{
        position: "absolute",

        inset: 0,

        zIndex: 100,

        background: "rgba(4,1,13,0.9)",

        backdropFilter: "blur(10px)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",

          inset: 0,

          pointerEvents: "none",

          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px)",
        }}
      />
      <div
        style={{
          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          padding: "42px 52px",

          borderRadius: 16,

          background: "rgba(5,2,20,0.95)",

          border: `1px solid ${ac}33`,

          boxShadow: `0 0 60px ${ac}18,inset 0 0 40px ${ac}06`,

          minWidth: 300,

          animation: "slide-in 0.2s ease-out",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",

            fontSize: 10,

            color: `${ac}66`,

            letterSpacing: "0.35em",

            marginBottom: 8,
          }}
        >
          SISTEMA PAUSADO
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",

            fontSize: 36,

            fontWeight: 900,

            color: ac,

            textShadow: `0 0 16px ${ac},0 0 40px ${ac}66`,

            letterSpacing: "0.14em",

            marginBottom: 8,
          }}
        >
          PAUSE
        </div>
        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 16,

            marginBottom: 32,

            padding: "8px 24px",

            borderRadius: "var(--rounded-lg)",

            background: `${ac}08`,

            border: `1px solid ${ac}18`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LogoSVG
              id={settings.teamA.logo}
              size={18}
              color={settings.teamA.color}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",

                fontSize: 28,

                fontWeight: 900,

                color: settings.teamA.color,

                textShadow: `0 0 12px ${settings.teamA.color}`,
              }}
            >
              {hud.scoreA}
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "rgba(200,230,255,0.3)",
            }}
          >
            ×
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",

                fontSize: 28,

                fontWeight: 900,

                color: settings.teamB.color,

                textShadow: `0 0 12px ${settings.teamB.color}`,
              }}
            >
              {hud.scoreB}
            </span>
            <LogoSVG
              id={settings.teamB.logo}
              size={18}
              color={settings.teamB.color}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
          }}
        >
          {[
            { label: "▶  CONTINUAR", col: ac, action: onContinue },

            { label: "↺  REINICIAR", col: "#f5e642", action: onRestart },

            { label: "✕  SAIR DA PARTIDA", col: "#ff2d9b", action: onExit },
          ].map(({ label, col, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%",

                padding: "12px 0",

                borderRadius: 16,

                fontFamily: "var(--font-display)",

                fontSize: 11,

                fontWeight: 700,

                letterSpacing: "0.2em",

                cursor: "pointer",

                transition: "all 0.2s",

                background: `${col}0e`,

                border: `1px solid ${col}44`,

                color: col,

                textShadow: `0 0 8px ${col}`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget

                el.style.background = `${col}1e`

                el.style.boxShadow = `0 0 18px ${col}44`

                el.style.borderColor = col
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget

                el.style.background = `${col}0e`

                el.style.boxShadow = "none"

                el.style.borderColor = `${col}44`
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,

            fontFamily: "var(--font-mono)",

            fontSize: 9,

            color: `${ac}44`,

            letterSpacing: "0.15em",
          }}
        >
          ESC / P para retomar
        </div>
      </div>
    </div>
  )
}
