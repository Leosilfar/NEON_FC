import { useState } from "react";
import { ALL_PIECE_TYPES, PIECE_LABEL, PIECE_ROLE } from "@/constants";
import type { GameSettings, PieceType } from "@/types";
import { ColorPicker, PieceSVG } from "@/components/common";

export default function PiecesTab({
  settings,
  onChange,
  selectedPieceProp,
  setSelectedPieceProp,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  selectedPieceProp?: PieceType;
  setSelectedPieceProp?: (p: PieceType) => void;
}) {
  const [internalSelectedPiece, setInternalSelectedPiece] = useState<PieceType>("triangle");
  const selectedPiece = selectedPieceProp ?? internalSelectedPiece;
  const setSelectedPiece = setSelectedPieceProp ?? setInternalSelectedPiece;

  const handleChange = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });
  const updatePieceColor = (t: PieceType, c: string) => handleChange({ pieceColors: { ...settings.pieceColors, [t]: c } });
  const updateAttr = (t: PieceType, k: "speed" | "power" | "rebound", v: number) =>
    handleChange({ attrs: { ...settings.attrs, [t]: { ...settings.attrs[t], [k]: v } } });

  return (
    <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mx-auto px-4">
      {/* Left – Piece list */}
      <section className="col-span-5 space-y-4 overflow-y-auto max-h-[75vh]">
        <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">TIPOS DE PEÇA</h3>
        {ALL_PIECE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedPiece(t)}
            className={`flex items-center gap-3 w-full p-2 rounded ${selectedPiece === t ? "bg-black/30 border border-cyan-500" : "bg-black/10"}`}
          >
            <PieceSVG type={t} size={24} color={settings.pieceColors[t]} glowLevel={settings.glowIntensity} />
            <div>
              <div className="text-white font-mono text-sm">{PIECE_LABEL[t]}</div>
              <div className="text-gray-300 font-medium text-xs">{PIECE_ROLE[t].split(" · ")[0]}</div>
            </div>
          </button>
        ))}
      </section>

      {/* Right – Controls and preview */}
      <section className="col-span-7 space-y-6">
        {/* Selected piece header */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-cyan-500/30">
          <PieceSVG type={selectedPiece} size={48} color={settings.pieceColors[selectedPiece]} selected glowLevel={settings.glowIntensity} />
          <div>
            <div className="text-cyan-400 font-bold text-lg">{PIECE_LABEL[selectedPiece]}</div>
            <div className="text-gray-300 text-sm">{PIECE_ROLE[selectedPiece]}</div>
          </div>
        </div>

        {/* Color picker */}
        <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">COR DA PEÇA</h3>
        <ColorPicker
          value={settings.pieceColors[selectedPiece]}
          onChange={(c) => updatePieceColor(selectedPiece, c)}
        />

        {/* Attributes */}
        <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">ATRIBUTOS</h3>
        <div className="space-y-4">
          {(["speed", "power", "rebound"] as const).map((attr) => (
            <div key={attr}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-cyan-300 font-medium capitalize">{attr}</span>
                <span className="text-cyan-300 font-mono">{settings.attrs[selectedPiece][attr]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.attrs[selectedPiece][attr]}
                onChange={(e) => updateAttr(selectedPiece, attr, Number(e.target.value))}
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
  );
}
