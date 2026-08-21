import { useState } from "react";
import type { GameSettings } from "@/types";
import { ALL_PIECE_TYPES } from "@/constants";
import { PieceSVG } from "@/components/common";

export default function MainMenu({
  onStart,
  onSettings,
  settings,
}: {
  onStart: () => void;
  onSettings: () => void;
  settings: GameSettings;
}) {
  const [hov, setHov] = useState<string | null>(null);
  const ac = settings.accentColor;
  const items = [
    { key: "start", label: "JOGAR", primary: true, action: onStart },
    { key: "cfg", label: "CONFIGURAÇÕES", primary: false, action: onSettings },
    { key: "rank", label: "RANKING", primary: false, action: () => {} },
    { key: "cred", label: "CRÉDITOS", primary: false, action: () => {} },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {[
        { top: 20, left: 20 },
        { top: 20, right: 20 },
        { bottom: 20, left: 20 },
        { bottom: 20, right: 20 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 40,
            height: 40,
            borderTop: i < 2 ? `1.5px solid ${ac}55` : "none",
            borderBottom: i >= 2 ? `1.5px solid ${ac}55` : "none",
            borderLeft: i % 2 === 0 ? `1.5px solid ${ac}55` : "none",
            borderRight: i % 2 === 1 ? `1.5px solid ${ac}55` : "none",
          }}
        />
      ))}
      {[{ top: 18, left: "50%" }, { bottom: 18, left: "50%" }].map((pos, i) => (
        <svg
          key={i}
          width={10}
          height={10}
          viewBox="0 0 10 10"
          style={{
            position: "absolute",
            ...pos,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            opacity: 0.6,
          }}
        >
          <polygon
            points="5,0 10,5 5,10 0,5"
            fill="none"
            stroke="#39ff5a"
            strokeWidth={1.2}
            style={{ filter: "drop-shadow(0 0 3px #39ff5a)" }}
          />
        </svg>
      ))}
      {(
        [
          [{ left: 28, top: "50%" }, false],
          [{ right: 28, top: "50%" }, true],
        ] as const
      ).map(([pos, flip], i) => (
        <svg
          key={i}
          width={14}
          height={14}
          viewBox="0 0 14 14"
          style={{
            position: "absolute",
            ...(pos as object),
            transform: "translateY(-50%)",
            pointerEvents: "none",
            opacity: 0.5,
          }}
        >
          {flip ? (
            <polygon
              points="14,7 0,0 0,14"
              fill="#39ff5a"
              style={{ filter: "drop-shadow(0 0 4px #39ff5a)" }}
            />
          ) : (
            <polygon
              points="0,7 14,0 14,14"
              fill="#39ff5a"
              style={{ filter: "drop-shadow(0 0 4px #39ff5a)" }}
            />
          )}
        </svg>
      ))}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 700,
          pointerEvents: "none",
          background: `radial-gradient(ellipse,${ac}0e 0%,transparent 65%)`,
        }}
      />
      <div style={{ textAlign: "center", marginBottom: 52, position: "relative" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(77,214,255,0.55)",
            letterSpacing: "0.45em",
            marginBottom: 14,
          }}
        >
           QUE CHOCOLATE
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(52px,9vw,96px)",
            lineHeight: 0.88,
            color: ac,
            textShadow: `0 0 20px ${ac},0 0 60px ${ac}77,0 0 120px ${ac}33`,
            letterSpacing: "0.08em",
          }}
        >
          NEON 
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(52px,9vw,96px)",
            lineHeight: 0.88,
            color: settings.teamB.color,
            textShadow: `0 0 20px ${settings.teamB.color},0 0 60px ${settings.teamB.color}77`,
            letterSpacing: "0.08em",
            marginBottom: 22,
          }}
        >
          FC
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
          {ALL_PIECE_TYPES.slice(0, 3).map((t) => (
            <PieceSVG
              key={t}
              type={t}
              size={22}
              color={settings.pieceColors[t]}
              glowLevel={settings.glowIntensity}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        {items.map(({ key, label, primary, action }) => (
          <button
            key={key}
            onClick={action}
            onMouseEnter={() => setHov(key)}
            onMouseLeave={() => setHov(null)}
            style={{
              width: "100%",
              padding: primary ? "16px 0" : "12px 0",
              borderRadius: 10,
              fontFamily: "var(--font-display)",
              fontSize: primary ? 14 : 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              cursor: "pointer",
              transition: "all 0.18s",
              background: primary
                ? hov === key
                  ? `${ac}28`
                  : `${ac}14`
                : hov === key
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.02)",
              border: primary
                ? `1.5px solid ${hov === key ? ac : ac + "80"}`
                : `1px solid ${hov === key ? "rgba(155,79,255,0.45)" : "rgba(255,255,255,0.1)"}`,
              color: primary
                ? ac
                : hov === key
                  ? "rgba(200,230,255,0.9)"
                  : "rgba(200,230,255,0.42)",
              textShadow: primary
                ? `0 0 12px ${ac}`
                : hov === key
                  ? "0 0 8px rgba(155,79,255,0.5)"
                  : "none",
              boxShadow:
                primary && hov === key
                  ? `0 0 28px ${ac}44`
                  : primary
                    ? `0 0 18px ${ac}18`
                    : "none",
              animation: primary ? "btn-pulse 2.8s ease-in-out infinite" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 48,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: `${ac}30`,
          letterSpacing: "0.25em",
        }}
      >
        © 2026 HASHI LABS · ABSOLUTAMENTE NENHUM DIREITO RESERVADO KKKKKKKKKKKK
      </div>
    </div>
  );
}
