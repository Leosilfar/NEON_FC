import { useState } from "react"
import { ALL_PIECE_TYPES, PIECE_LABEL, PIECE_ROLE } from "@/constants"
import type { GameSettings, PieceType } from "@/types"
import { ColorPicker, PieceSVG } from "@/components/common"

export default function PiecesTab({
  settings,
  onChange,
  selectedPieceProp,
  setSelectedPieceProp,
}: {
  settings: GameSettings
  onChange: (s: GameSettings) => void
  selectedPieceProp?: PieceType
  setSelectedPieceProp?: (p: PieceType) => void
}) {
  const [internalSelectedPiece, setInternalSelectedPiece] =
    useState<PieceType>("triangle")
  const selectedPiece = selectedPieceProp ?? internalSelectedPiece
  const setSelectedPiece = setSelectedPieceProp ?? setInternalSelectedPiece

  const handleChange = (patch: Partial<GameSettings>) =>
    onChange({ ...settings, ...patch })
  const updatePieceColor = (t: PieceType, c: string) =>
    handleChange({ pieceColors: { ...settings.pieceColors, [t]: c } })
  const updateAttr = (
    t: PieceType,
    k: "speed" | "power" | "rebound",
    v: number,
  ) =>
    handleChange({
      attrs: { ...settings.attrs, [t]: { ...settings.attrs[t], [k]: v } },
    })

  return (
    <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
      {/* Left – Piece list */}
      <section className="col-span-5 space-y-3 overflow-y-auto max-h-[75vh] rounded-2xl border border-cyan-400/20 bg-[#05020f]/80 p-4 shadow-[0_0_22px_rgba(0,240,255,0.1)]">
        <h3 className="rounded-xl border border-cyan-400/25 bg-black/75 px-4 py-3 text-cyan-300 font-bold tracking-[0.24em] text-sm shadow-[0_0_14px_rgba(0,240,255,0.12)]">
          TIPOS DE PEÇA
        </h3>
        {ALL_PIECE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedPiece(t)}
            className={`flex items-center gap-4 w-full rounded-xl border p-3 text-left transition-all duration-200 ${
              selectedPiece === t
                ? "border-[#00f0ff] bg-black/85 shadow-[0_0_18px_rgba(0,240,255,0.25)]"
                : "border-cyan-400/15 bg-black/60 hover:border-cyan-300/50 hover:bg-black/75"
            }`}
          >
            <PieceSVG
              type={t}
              size={24}
              color={settings.pieceColors[t]}
              glowLevel={settings.glowIntensity}
            />
            <div>
              <div className="text-white font-bold tracking-widest text-sm drop-shadow-[0_0_6px_rgba(0,0,0,0.95)]">
                {PIECE_LABEL[t]}
              </div>
              <div className="text-cyan-100/80 font-medium tracking-wide text-xs">
                {PIECE_ROLE[t].split(" · ")[0]}
              </div>
            </div>
          </button>
        ))}
      </section>

      {/* Right – Controls and preview */}
      <section className="col-span-7 space-y-5 rounded-2xl border border-cyan-400/20 bg-[#05020f]/80 p-5 shadow-[0_0_22px_rgba(0,240,255,0.1)]">
        {/* Selected piece header */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/80 border border-cyan-400/30 shadow-[0_0_18px_rgba(0,240,255,0.12)]">
          <PieceSVG
            type={selectedPiece}
            size={48}
            color={settings.pieceColors[selectedPiece]}
            selected
            glowLevel={settings.glowIntensity}
          />
          <div>
            <div className="text-cyan-300 font-bold tracking-widest text-lg">
              {PIECE_LABEL[selectedPiece]}
            </div>
            <div className="text-cyan-100/80 text-sm tracking-wide">
              {PIECE_ROLE[selectedPiece]}
            </div>
          </div>
        </div>

        {/* Color picker */}
        <div className="rounded-2xl border border-cyan-400/20 bg-black/70 p-4">
          <h3 className="text-cyan-300 font-bold tracking-[0.24em] text-sm mb-3">
            COR DA PEÇA
          </h3>
          <ColorPicker
            value={settings.pieceColors[selectedPiece]}
            onChange={(c) => updatePieceColor(selectedPiece, c)}
          />
        </div>

        {/* Attributes */}
        <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-black/70 p-4">
          <h3 className="text-cyan-300 font-bold tracking-[0.24em] text-sm">
            ATRIBUTOS
          </h3>
          {(["speed", "power", "rebound"] as const).map((attr) => (
            <div key={attr}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-cyan-100 font-semibold tracking-wide capitalize">
                  {attr}
                </span>
                <span className="text-cyan-300 font-bold">
                  {settings.attrs[selectedPiece][attr]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.attrs[selectedPiece][attr]}
                onChange={(e) =>
                  updateAttr(selectedPiece, attr, Number(e.target.value))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff007f ${settings.attrs[selectedPiece][attr]}%, #555 ${settings.attrs[selectedPiece][attr]}%)`,
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
