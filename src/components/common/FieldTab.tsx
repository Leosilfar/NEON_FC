import { BG_PRESETS, FIELD_SURFACE_OPTIONS } from "@/constants"
import type { BgPreset, GameSettings } from "@/types"
import { ColorPicker, NeonToggle } from "@/components/common"

interface FieldTabProps {
  settings: GameSettings
  onChange: (s: GameSettings) => void
}

export default function FieldTab({ settings, onChange }: FieldTabProps) {
  const handleChange = (patch: Partial<GameSettings>) => {
    onChange({ ...settings, ...patch })
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 560,
        padding: "0.5rem",
      }}
    >
      {/* Linhas do Campo */}
      <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-2">
        COR DAS LINHAS DO CAMPO
      </h3>
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
            <label
              key={val}
              className="flex items-center gap-4 cursor-pointer group"
            >
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
          background:
            "linear-gradient(90deg,transparent,rgba(155,79,255,0.18),transparent)",
        }}
      />
    </div>
  )
}
