import type { GameSettings, HudSnap } from "@/types"

import { LogoSVG } from "@/components/common"

export default function MatchHud({
  settings,

  hud,

  onPause,
}: {
  settings: GameSettings

  hud: HudSnap

  onPause: () => void
}) {
  const ac = settings.accentColor

  const mm = String(Math.floor(hud.timeLeft / 60)).padStart(2, "0")

  const ss2 = String(Math.floor(hud.timeLeft % 60)).padStart(2, "0")

  return (
    <div
      style={{
        position: "absolute",

        top: 0,

        left: 0,

        right: 0,

        display: "flex",

        alignItems: "center",

        justifyContent: "space-between",

        padding: "6px 18px",

        background: "rgba(5,2,18,0.88)",

        backdropFilter: "blur(14px)",

        borderBottom: "1px solid rgba(155,79,255,0.15)",

        zIndex: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 150,
        }}
      >
        <LogoSVG
          id={settings.teamA.logo}
          size={26}
          color={settings.teamA.color}
        />
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",

              fontSize: 9,

              color: `${settings.teamA.color}88`,

              letterSpacing: "0.2em",
            }}
          >
            TIME A
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",

              fontSize: 13,

              fontWeight: 700,

              color: settings.teamA.color,

              textShadow: `0 0 8px ${settings.teamA.color}`,
            }}
          >
            {settings.teamA.name}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",

            fontSize: "clamp(28px,4vw,48px)",

            fontWeight: 900,

            color: settings.teamA.color,

            textShadow: `0 0 18px ${settings.teamA.color}`,

            lineHeight: 1,
          }}
        >
          {hud.scoreA}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "rgba(200,230,255,0.35)",
            }}
          >
            ×
          </span>
          <div
            style={{
              fontFamily: "var(--font-mono)",

              fontSize: 14,

              color: "#39ff5a",

              textShadow: "0 0 8px #39ff5a",

              border: "1px solid rgba(57,255,90,0.3)",

              borderRadius: 5,

              padding: "2px 8px",

              letterSpacing: "0.1em",
            }}
          >
            {mm}:{ss2}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",

            fontSize: "clamp(28px,4vw,48px)",

            fontWeight: 900,

            color: settings.teamB.color,

            textShadow: `0 0 18px ${settings.teamB.color}`,

            lineHeight: 1,
          }}
        >
          {hud.scoreB}
        </div>
      </div>
      <div
        style={{
          display: "flex",

          alignItems: "center",

          gap: 10,

          minWidth: 150,

          justifyContent: "flex-end",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",

              fontSize: 9,

              color: `${settings.teamB.color}88`,

              letterSpacing: "0.2em",
            }}
          >
            TIME B
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",

              fontSize: 13,

              fontWeight: 700,

              color: settings.teamB.color,

              textShadow: `0 0 8px ${settings.teamB.color}`,
            }}
          >
            {settings.teamB.name}
          </div>
        </div>
        <LogoSVG
          id={settings.teamB.logo}
          size={26}
          color={settings.teamB.color}
        />
        <button
          onClick={onPause}
          style={{
            width: 38,

            height: 38,

            borderRadius: 12,

            cursor: "pointer",

            background: "rgba(255,255,255,0.05)",

            border: `1px solid ${ac}40`,

            color: `${ac}bb`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 12px ${ac}55`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <rect x={3} y={2} width={3.5} height={12} rx={1} />
            <rect x={9.5} y={2} width={3.5} height={12} rx={1} />
          </svg>
        </button>
      </div>
    </div>
  )
}
