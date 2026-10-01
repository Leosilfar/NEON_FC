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
  const menuMagenta = "#ff007f"
  const menuCyan = "#00f0ff"
  const menuDark = "#05020f"
  const title = hud.finished ? "FIM DE JOGO" : "PAUSE"
  const eyebrow = hud.finished ? "PARTIDA ENCERRADA" : "SISTEMA PAUSADO"
  const actions = hud.finished
    ? [
        { label: "↺  REINICIAR", col: menuCyan, action: onRestart },
        { label: "✕  SAIR DA PARTIDA", col: menuMagenta, action: onExit },
      ]
    : [
        { label: "▶  CONTINUAR", col: menuMagenta, action: onContinue },
        { label: "↺  REINICIAR", col: menuCyan, action: onRestart },
        { label: "✕  SAIR DA PARTIDA", col: menuMagenta, action: onExit },
      ]

  return (
    <div
      style={{
        position: "absolute",

        inset: 0,

        zIndex: 100,

        background: "rgba(5,2,15,0.92)",

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

          background: "rgba(5,2,15,0.96)",

          border: `1px solid ${menuMagenta}88`,

          boxShadow: `0 0 60px ${menuMagenta}40,inset 0 0 40px ${menuCyan}10`,

          minWidth: 300,

          animation: "slide-in 0.2s ease-out",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",

            fontSize: 10,

            color: `${menuCyan}aa`,

            letterSpacing: "0.35em",

            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",

            fontSize: 36,

            fontWeight: 900,

            color: "#fff",

            textShadow: `0 0 16px ${menuMagenta},0 0 40px ${menuMagenta}99`,

            letterSpacing: "0.14em",

            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 16,

            marginBottom: 32,

            padding: "8px 24px",

            borderRadius: "var(--rounded-lg)",

            background: `${menuCyan}08`,

            border: `1px solid ${menuCyan}26`,
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
          {actions.map(({ label, col, action }) => (
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

                background: col === menuCyan ? menuCyan : `${menuDark}cc`,

                border: `1px solid ${col}`,

                color: col === menuCyan ? menuDark : col,

                textShadow: `0 0 8px ${col}`,

                boxShadow: `0 0 18px ${col}38`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget

                el.style.background =
                  col === menuCyan ? "#4fffff" : `${col}22`

                el.style.boxShadow = `0 0 28px ${col}88`

                el.style.borderColor = col
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget

                el.style.background = col === menuCyan ? menuCyan : `${menuDark}cc`

                el.style.boxShadow = `0 0 18px ${col}38`

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

            color: `${menuCyan}66`,

            letterSpacing: "0.15em",
          }}
        >
          {hud.finished ? "00:00" : "ESC / P para retomar"}
        </div>
      </div>
    </div>
  )
}
