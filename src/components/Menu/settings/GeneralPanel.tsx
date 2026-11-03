import type { GameSettings } from "@/types"
import type { Difficulty, SettingsCopy, SettingsDraftSetter } from "./types"
export function GeneralSettingsPanel({
  t,
  draft,
  setDraft,
  showFps,
  setShowFps,
}: {
  t: SettingsCopy
  draft: GameSettings
  setDraft: SettingsDraftSetter
  showFps: boolean
  setShowFps: (value: boolean) => void
}) {
  return (
    <div className="w-full max-w-7xl grid grid-cols-1 gap-8 rounded-2xl border border-white/10 bg-[#08050d]/75 p-4 font-mono text-white text-base md:grid-cols-2 md:gap-12 md:p-7">
      {/* Left Column */}
      <div className="space-y-10">
        {/* Visual Elements */}
        <div>
          <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
            {t.elementosVisuais}
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  draft.showGrid
                    ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                    : "border-purple-900 bg-black/60"
                }`}
              >
                {draft.showGrid && (
                  <span className="text-[#ff007f] font-bold text-xs">✓</span>
                )}
              </div>
              <input
                type="checkbox"
                checked={draft.showGrid}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, showGrid: e.target.checked }))
                }
                className="hidden"
              />
              <span className="text-sm group-hover:text-cyan-300 transition-colors">
                {t.gridSutil}
              </span>
            </label>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  draft.showScanlines
                    ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                    : "border-purple-900 bg-black/60"
                }`}
              >
                {draft.showScanlines && (
                  <span className="text-[#ff007f] font-bold text-xs">✓</span>
                )}
              </div>
              <input
                type="checkbox"
                checked={draft.showScanlines}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,

                    showScanlines: e.target.checked,
                  }))
                }
                className="hidden"
              />
              <span className="text-sm group-hover:text-cyan-300 transition-colors">
                {t.scanlines}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-8">
        {/* Language */}
        <div>
          <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
            {t.idioma}
          </h2>
          <div className="space-y-3">
            {(["PT", "EN"] as const).map((langKey) => (
              <label
                key={langKey}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    (draft.language?.startsWith("pt") && langKey === "PT") ||
                    (draft.language?.startsWith("en") && langKey === "EN")
                      ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                      : "border-purple-900 bg-black/60"
                  }`}
                >
                  {(draft.language?.startsWith("pt") && langKey === "PT") ||
                  (draft.language?.startsWith("en") && langKey === "EN") ? (
                    <span className="text-[#ff007f] font-bold text-xs">✓</span>
                  ) : null}
                </div>
                <input
                  type="radio"
                  name="language"
                  checked={draft.language?.startsWith(
                    langKey.toLowerCase(),
                  )}
                  onChange={() =>
                    setDraft((p) => ({
                      ...p,

                      language: langKey === "PT" ? "pt-BR" : "en",
                    }))
                  }
                  className="hidden"
                />
                <span className="text-sm group-hover:text-cyan-300 transition-colors">
                  {langKey === "PT" ? t.ptbr : t.ingles}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* FPS Toggle */}
        <div>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                showFps
                  ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                  : "border-purple-900 bg-black/60"
              }`}
            >
              {showFps && (
                <span className="text-[#ff007f] font-bold text-xs">✓</span>
              )}
            </div>
            <input
              type="checkbox"
              checked={showFps}
              onChange={() => setShowFps(!showFps)}
              className="hidden"
            />
            <span className="text-sm font-bold tracking-wider group-hover:text-cyan-300 transition-colors">
              {t.fpsToggle}
            </span>
          </label>
        </div>

        {/* Difficulty */}
        <div>
          <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">
            {t.dificuldade}
          </h2>
          <div className="space-y-3">
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <label
                key={diff}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    draft.difficulty === diff
                      ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                      : "border-purple-900 bg-black/60"
                  }`}
                >
                  {draft.difficulty === diff && (
                    <span className="text-[#ff007f] font-bold text-xs">✓</span>
                  )}
                </div>
                <input
                  type="radio"
                  name="difficulty"
                  checked={draft.difficulty === diff}
                  onChange={() =>
                    setDraft((p) => ({
                      ...p,

                      difficulty: diff satisfies Difficulty,
                    }))
                  }
                  className="hidden"
                />
                <span className="text-sm group-hover:text-cyan-300 transition-colors">
                  {diff === "easy"
                    ? t.facil
                    : diff === "medium"
                      ? t.medio
                      : t.dificil}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
