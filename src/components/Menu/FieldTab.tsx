import React from "react";
import { BG_PRESETS, FIELD_SURFACE_OPTIONS } from "@/constants";
import type { BgPreset, GameSettings } from "@/types";
import { ColorPicker, NeonToggle } from "@/components/common";

interface FieldTabProps {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
}

export default function FieldTab({ settings, onChange }: FieldTabProps) {
  const handleChange = (patch: Partial<GameSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560, padding: "0.5rem" }}>
      {/* Linhas do Campo */}
      <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-2">COR DAS LINHAS DO CAMPO</h3>
      <ColorPicker
        value={settings.fieldLineColor}
        onChange={(c) => handleChange({ fieldLineColor: c })}
      />

      {/* Superfície do Campo */}
      <div>
        <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
          COR DA SUPERFÍCIE DO CAMPO
        </h3>
        <div className="space-y-3">
          {FIELD_SURFACE_OPTIONS.map(({ label, val }) => (
            <label key={val} className="flex items-center gap-4 cursor-pointer group">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  settings.fieldSurfaceColor === val
                    ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                    : "border-purple-900 bg-black/60"
                }`}
              >
                {settings.fieldSurfaceColor === val && (
                  <span className="text-[#ff007f] font-bold text-xs">✓</span>
                )}
              </div>
              <input
                type="radio"
                checked={settings.fieldSurfaceColor === val}
                onChange={() => handleChange({ fieldSurfaceColor: val })}
                className="hidden"
              />
              <span className="text-sm text-cyan-100 group-hover:text-cyan-300 transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      {/* Fundo do Jogo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
          FUNDO DO JOGO
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {(Object.entries(BG_PRESETS) as [BgPreset, (typeof BG_PRESETS)[BgPreset]][]).map(
            ([key, bg]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleChange({ bgPreset: key })}
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: `1.5px solid ${
                    settings.bgPreset === key ? settings.accentColor : "rgba(255,255,255,0.08)"
                  }`,
                  boxShadow:
                    settings.bgPreset === key ? `0 0 14px ${settings.accentColor}44` : "none",
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
                    color:
                      settings.bgPreset === key ? settings.accentColor : "rgba(200,220,255,0.4)",
                    letterSpacing: "0.1em",
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

      {/* Elementos Visuais */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
          ELEMENTOS VISUAIS
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "GRADE DE FUNDO",
              sub: "Grid sutil sobre o fundo",
              key: "showGrid" as const,
            },
            {
              label: "LINHAS DE VARREDURA",
              sub: "Efeito CRT retro scanlines",
              key: "showScanlines" as const,
            },
          ].map(({ label, sub, key }) => (
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
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    color: "rgba(180,210,240,0.35)",
                  }}
                >
                  {sub}
                </div>
              </div>
              <NeonToggle
                value={settings[key]}
                onChange={(v) => handleChange({ [key]: v })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}