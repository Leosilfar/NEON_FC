import { useState } from "react"
import { ALL_PIECE_TYPES } from "@/constants"
import type { GameSettings, GlowLevel } from "@/types"
import { ColorPicker, PieceSVG } from "@/components/common"

export default function AppearanceTab({
  settings,
  onChange,
}: {
  settings: GameSettings
  onChange: (s: GameSettings) => void
}) {
  const [glowLevel, setGlowLevel] = useState<any>(settings.glowIntensity)
  const [accentColor, setAccentColor] = useState<string>(settings.accentColor)

  const handleChange = (partial: Partial<GameSettings>) => {
    onChange({ ...settings, ...partial })
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 480,
        padding: "0.5rem",
      }}
    >
      <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
        COR DE DESTAQUE (MENUS)
      </h3>
      <ColorPicker
        value={accentColor}
        onChange={(c) => {
          setAccentColor(c)
          handleChange({ accentColor: c })
        }}
      />

      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      <div className="space-y-4">
        <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
          INTENSIDADE DO BRILHO (GLOW)
        </h3>
        <div className="space-y-3">
          {(["low", "medium", "high"] as GlowLevel[]).map((g) => {
            const labels = { low: "BAIXO", medium: "MÉDIO", high: "ALTO" }
            return (
              <label
                key={g}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    glowLevel === g
                      ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                      : "border-purple-900 bg-black/60"
                  }`}
                >
                  {glowLevel === g && (
                    <span className="text-[#ff007f] font-bold text-xs">✓</span>
                  )}
                </div>
                <input
                  type="radio"
                  name="glow"
                  checked={glowLevel === g}
                  onChange={() => {
                    setGlowLevel(g as GlowLevel)
                    handleChange({ glowIntensity: g as GlowLevel })
                  }}
                  className="hidden"
                />
                <span className="text-sm group-hover:text-cyan-300 transition-colors">
                  {labels[(g as keyof typeof labels)]}
                </span>
              </label>
            )
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
              color={settings.pieceColors[t]}
              selected
              glowLevel={settings.glowIntensity}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />

      <div className="space-y-4">
        <h3 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
          RESTAURAR
        </h3>
        <button
          onClick={() => {
            alert(
              "Funcionalidade de restauração de padrões ainda não implementada",
            )
          }}
          className="bg-[#ff007f] text-white px-6 py-2 rounded-full shadow-[0_0_15px_#ff007f] transition-all duration-200"
        >
          RESTAURAR PADRÕES
        </button>
      </div>
    </div>
  )
}
