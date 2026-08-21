import { ALL_PIECE_TYPES } from "@/constants";
import type { GameSettings, GlowLevel } from "@/types";
import { ColorPicker, PieceSVG } from "@/components/common";

export default function AppearanceTab({
  draft,
  accentColor,
  upd,
  resetDefaults,
}: {
  draft: GameSettings;
  accentColor: string;
  upd: (patch: Partial<GameSettings>) => void;
  resetDefaults: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 480 }}>
      <ColorPicker
        label="COR DE DESTAQUE (MENUS)"
        value={draft.accentColor}
        onChange={(c) => upd({ accentColor: c })}
      />

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(155,79,255,0.7)",
            letterSpacing: "0.22em",
          }}
        >
          INTENSIDADE DO BRILHO (GLOW)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["low", "medium", "high"] as GlowLevel[]).map((g) => {
            const labels = { low: "BAIXO", medium: "MÉDIO", high: "ALTO" };
            const glowSz = { low: 4, medium: 10, high: 20 };
            return (
              <button
                key={g}
                onClick={() => upd({ glowIntensity: g })}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  cursor: "pointer",
                  background:
                    draft.glowIntensity === g ? `${accentColor}14` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    draft.glowIntensity === g ? accentColor + "88" : "rgba(255,255,255,0.08)"
                  }`,
                  color: draft.glowIntensity === g ? accentColor : "rgba(200,220,255,0.35)",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  boxShadow:
                    draft.glowIntensity === g ? `0 0 ${glowSz[g]}px ${accentColor}44` : "none",
                  textShadow: draft.glowIntensity === g ? `0 0 8px ${accentColor}` : "none",
                  transition: "all 0.2s",
                }}
              >
                {labels[g]}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            padding: "16px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {ALL_PIECE_TYPES.slice(0, 3).map((t) => (
            <PieceSVG
              key={t}
              type={t}
              size={28}
              color={draft.pieceColors[t]}
              selected
              glowLevel={draft.glowIntensity}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(155,79,255,0.7)",
            letterSpacing: "0.22em",
          }}
        >
          RESTAURAR
        </div>
        <button
          onClick={resetDefaults}
          style={{
            padding: "11px 0",
            borderRadius: 8,
            cursor: "pointer",
            background: "rgba(255,45,155,0.06)",
            border: "1px solid rgba(255,45,155,0.3)",
            color: "rgba(255,45,155,0.7)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.color = "#ff2d9b";
            el.style.borderColor = "#ff2d9b";
            el.style.boxShadow = "0 0 14px rgba(255,45,155,0.3)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.color = "rgba(255,45,155,0.7)";
            el.style.borderColor = "rgba(255,45,155,0.3)";
            el.style.boxShadow = "none";
          }}
        >
          RESTAURAR PADRÕES
        </button>
      </div>
    </div>
  );
}
