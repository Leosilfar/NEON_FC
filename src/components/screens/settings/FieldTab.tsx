import {
  BG_PRESETS,
  FIELD_SURFACE_OPTIONS,
} from "@/constants";
import type { BgPreset, GameSettings } from "@/types";
import { ColorPicker, NeonToggle } from "@/components/common";

export default function FieldTab({
  draft,
  accentColor,
  upd,
}: {
  draft: GameSettings;
  accentColor: string;
  upd: (patch: Partial<GameSettings>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 560 }}>
      <ColorPicker
        label="COR DAS LINHAS DO CAMPO"
        value={draft.fieldLineColor}
        onChange={(c) => upd({ fieldLineColor: c })}
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
          COR DA SUPERFÍCIE DO CAMPO
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {FIELD_SURFACE_OPTIONS.map(({ label, val }) => (
            <button
              key={val}
              onClick={() => upd({ fieldSurfaceColor: val })}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                background:
                  draft.fieldSurfaceColor === val
                    ? "rgba(155,79,255,0.15)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  draft.fieldSurfaceColor === val
                    ? "rgba(155,79,255,0.6)"
                    : "rgba(255,255,255,0.1)"
                }`,
                color:
                  draft.fieldSurfaceColor === val ? "#9b4fff" : "rgba(200,220,255,0.45)",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
          FUNDO DO JOGO
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {(Object.entries(BG_PRESETS) as [BgPreset, (typeof BG_PRESETS)[BgPreset]][]).map(
            ([key, bg]) => (
              <button
                key={key}
                onClick={() => upd({ bgPreset: key })}
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: `1.5px solid ${draft.bgPreset === key ? accentColor : "rgba(255,255,255,0.08)"}`,
                  boxShadow: draft.bgPreset === key ? `0 0 14px ${accentColor}44` : "none",
                  transition: "all 0.2s",
                  background: "none",
                  padding: 0,
                }}
              >
                <div style={{ height: 50, background: bg.css }} />
                <div
                  style={{
                    padding: "6px 8px",
                    background: "rgba(5,2,15,0.8)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    color: draft.bgPreset === key ? accentColor : "rgba(200,220,255,0.4)",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                  }}
                >
                  {bg.label}
                </div>
              </button>
            )
          )}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(155,79,255,0.7)",
            letterSpacing: "0.22em",
          }}
        >
          ELEMENTOS VISUAIS
        </div>
        {(
          [
            { label: "GRADE DE FUNDO", sub: "Grid sutil sobre o fundo", key: "showGrid" as const },
            {
              label: "LINHAS DE VARREDURA",
              sub: "Efeito CRT retro scanlines",
              key: "showScanlines" as const,
            },
          ]
        ).map(({ label, sub, key }) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(200,230,255,0.7)",
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(180,210,240,0.35)" }}>
                {sub}
              </div>
            </div>
            <NeonToggle value={draft[key]} onChange={(v) => upd({ [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
