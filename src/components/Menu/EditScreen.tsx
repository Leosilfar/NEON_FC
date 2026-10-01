import { useContext, useState, useEffect } from "react"
import { GameContext } from "@/context/GameContext"
import type { GameSettings, PieceType, LogoId, BgPreset } from "@/types"
import AppearanceTab from "@/components/common/AppearanceTab"
import FieldTab from "@/components/common/FieldTab"
import TeamATab from "./TeamATab"
import PiecesTab from "@/components/common/PiecesTab"
import { LogoSVG } from "@/components/common/LogoSVG"
import { PieceSVG } from "@/components/common/PieceSVG"
import { BG_PRESETS } from "@/constants"

// Exported component name aligns with user reference
export default function EditMenu({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useContext(GameContext)!

  // Local draft state for all edits
  const [draft, setDraft] = useState<GameSettings>(() => ({ ...settings }))

  // Selected piece for Pieces tab preview (lifted state)
  const [previewPiece, setPreviewPiece] = useState<PieceType>("triangle")

  // Active main tab (merged appearance+field)
  const [activeTab, setActiveTab] = useState<"appearance" | "teamA" | "pieces">(
    "appearance",
  )

  // Apply accent color globally for neon primary variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--neon-primary",
      draft.accentColor,
    )
  }, [draft.accentColor])

  const handleSave = () => {
    updateSettings(draft)
    onBack()
  }

  // Tab definitions (three tabs)
  const tabs = [
    { key: "appearance" as const, label: "APARÊNCIA" },
    { key: "teamA" as const, label: "TIMES do treino" },
    { key: "pieces" as const, label: "PEÇAS" },
  ]

  return (
    <div
      className="fixed inset-0 bg-cover bg-center flex flex-col animate-neon-on"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between bg-[#00f0ff] text-black font-extrabold px-8 py-4 rounded-3xl mx-4 mt-4">
        <h2 className="text-xl">EDITAR E PERSONALIZAR</h2>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="bg-[#ff007f] text-white px-6 py-2 rounded-full shadow-[0_0_15px_#ff007f] transition-all duration-200"
          >
            VOLTAR
          </button>
          <button
            onClick={handleSave}
            className="bg-[#ff007f] text-white px-6 py-2 rounded-full shadow-[0_0_15px_#ff007f] transition-all duration-200"
          >
            SALVAR
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-2 px-4 py-2 mt-2 mx-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? "bg-[#ff007f] text-white shadow-[0_0_15px_#ff007f] rounded-xl px-5 py-2 font-bold tracking-widest transition-all duration-200"
                : "bg-black/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl px-5 py-2 font-semibold tracking-widest transition-all duration-200"
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-6 w-full max-w-7xl mx-auto px-4 flex-1 mt-4 animate-smooth-neon">
        {activeTab === "appearance" ? (
          <>
            {/* Left – Appearance controls (7 cols) */}
            <section className="col-span-7 space-y-6 overflow-y-auto max-h-[75vh] rounded-2xl border border-cyan-400/20 bg-black/70 p-5 shadow-[0_0_24px_rgba(0,240,255,0.14)] backdrop-blur-sm">
              <AppearanceTab settings={draft} onChange={setDraft} />
            </section>

            {/* Right – Field controls + compact preview (5 cols) */}
            <section className="col-span-5 space-y-4 rounded-2xl border border-cyan-400/20 bg-black/65 p-5 shadow-[0_0_24px_rgba(0,240,255,0.12)] backdrop-blur-sm">
              {/* Compact Live Preview */}
              <div className="h-44 bg-black/60 border border-cyan-500/30 rounded-xl flex items-center justify-center overflow-hidden mb-4">
                <div
                  className="relative w-full h-full rounded-md overflow-hidden border"
                  style={{
                    borderColor: draft.fieldLineColor,
                    background: BG_PRESETS[(draft.bgPreset as BgPreset)].css,
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: draft.fieldSurfaceColor }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center gap-4"
                    style={{
                      color: draft.accentColor,
                      textShadow: `0 0 8px ${draft.accentColor}`,
                    }}
                  >
                    <span className="text-2xl font-mono">△</span>
                    <span className="text-2xl font-mono">□</span>
                    <span className="text-2xl font-mono">○</span>
                  </div>
                </div>
              </div>
              <FieldTab settings={draft} onChange={setDraft} />
            </section>
          </>
        ) : (
          <>
            {/* Left – Other tabs (8 cols) */}
            <section
              className={
                activeTab === "teamA"
                  ? "col-span-12 space-y-6 overflow-y-auto max-h-[75vh] rounded-2xl border border-cyan-400/20 bg-black/70 p-5 shadow-[0_0_24px_rgba(0,240,255,0.14)] backdrop-blur-sm"
                  : "col-span-8 space-y-6 overflow-y-auto max-h-[75vh] rounded-2xl border border-cyan-400/20 bg-black/70 p-5 shadow-[0_0_24px_rgba(0,240,255,0.14)] backdrop-blur-sm"
              }
            >
              {activeTab === "teamA" && (
                <TeamATab settings={draft} onChange={setDraft} />
              )}
              {activeTab === "pieces" && (
                <PiecesTab
                  settings={draft}
                  onChange={setDraft}
                  selectedPieceProp={previewPiece}
                  setSelectedPieceProp={setPreviewPiece}
                />
              )}
            </section>

            {activeTab !== "teamA" && (
              <aside className="col-span-4 bg-black/75 border border-cyan-400/30 rounded-2xl p-5 text-cyan-300 h-[260px] flex flex-col items-center justify-center shadow-[0_0_24px_rgba(0,240,255,0.12)] backdrop-blur-sm">
                <h3 className="text-center font-bold tracking-widest mb-2">
                  LIVE PREVIEW
                </h3>
                {activeTab === "pieces" && (
                  <div className="flex flex-col items-center gap-4">
                    <PieceSVG
                      type={previewPiece}
                      size={80}
                      color={draft.pieceColors[previewPiece]}
                      glowLevel={draft.glowIntensity}
                    />
                    <div
                      className="font-semibold tracking-wide"
                      style={{
                        color: draft.pieceColors[previewPiece],
                        textShadow: `0 0 8px ${draft.pieceColors[previewPiece]}`,
                      }}
                    >
                      {previewPiece}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  )
}
