import {
  useContext,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { GameContext } from "@/context/GameContext"
import type { GameControls, GameSettings } from "@/types"
import { DEFAULT_GAME_CONTROLS } from "@/constants"
import { MUSIC_TRACKS } from "@/utils/soundtrack"

type LanguageKey = keyof typeof translations
type Difficulty = NonNullable<GameSettings["difficulty"]>
type SettingsTab = "general" | "audio" | "controls"
type ControlAction = keyof GameControls
interface ControlActionItem {
  action: ControlAction
  label: string
}

const translations = {
  PT: {
    settings: "SETTINGS",
    voltar: "VOLTAR",
    geral: "GERAL",
    audioTab: "ÁUDIO",
    controlsTab: "CONTROLES",
    controlUp: "MOVER PARA CIMA",
    controlDown: "MOVER PARA BAIXO",
    controlLeft: "MOVER PARA A ESQUERDA",
    controlRight: "MOVER PARA A DIREITA",
    rotateLeft: "GIRAR PARA A ESQUERDA",
    rotateRight: "GIRAR PARA A DIREITA",
    selectNearest: "SELECIONAR PEÇA MAIS PRÓXIMA",
    pause: "PAUSAR / CONTINUAR",
    pressKey: "PRESSIONE UMA TECLA",
    resetControls: "RESTAURAR PADRÕES",
    duplicateKey: "Essa tecla já está atribuída a outra ação.",
    invalidKey: "Escolha uma tecla que não seja modificadora.",
    controlsHelp: "Clique numa ação e pressione a tecla desejada.",
    audio: "ÁUDIO",
    musica: "MÚSICA",
    sfx: "SFX",
    master: "VOLUME GERAL",
    stadium: "AMBIENTE DE ESTÁDIO",
    playlist: "PLAYLIST",
    tracksEnabled: "faixas ativas",
    allTracks: "TODAS",
    noTracks: "NENHUMA",
    idioma: "IDIOMA",
    ptbr: "PTBR",
    ingles: "INGLÊS",
    fpsToggle: "ATIVAR CONTADOR DE FPS",
    elementosVisuais: "ELEMENTOS VISUAIS",
    gridSutil: "ATIVAR GRID SUTIL SOBRE O FUNDO",
    scanlines: "ATIVAR EFEITO CRT RETRO SCANLINES",
    dificuldade: "DIFICULDADE",
    facil: "FÁCIL",
    medio: "MÉDIO",
    dificil: "DIFÍCIL",
  },
  EN: {
    settings: "SETTINGS",
    voltar: "BACK",
    geral: "GENERAL",
    audioTab: "AUDIO",
    controlsTab: "CONTROLS",
    controlUp: "MOVE UP",
    controlDown: "MOVE DOWN",
    controlLeft: "MOVE LEFT",
    controlRight: "MOVE RIGHT",
    rotateLeft: "ROTATE LEFT",
    rotateRight: "ROTATE RIGHT",
    selectNearest: "SELECT NEAREST PLAYER",
    pause: "PAUSE / RESUME",
    pressKey: "PRESS A KEY",
    resetControls: "RESTORE DEFAULTS",
    duplicateKey: "This key is already assigned to another action.",
    invalidKey: "Choose a key that is not a modifier.",
    controlsHelp: "Click an action, then press the key you want to bind.",
    audio: "AUDIO",
    musica: "MUSIC",
    sfx: "SFX",
    master: "MASTER VOLUME",
    stadium: "STADIUM AMBIENCE",
    playlist: "PLAYLIST",
    tracksEnabled: "tracks enabled",
    allTracks: "ALL",
    noTracks: "NONE",
    idioma: "LANGUAGE",
    ptbr: "PT-BR",
    ingles: "ENGLISH",
    fpsToggle: "ENABLE FPS COUNTER",
    elementosVisuais: "VISUAL ELEMENTS",
    gridSutil: "ENABLE SUBTLE BACKGROUND GRID",
    scanlines: "ENABLE CRT RETRO SCANLINES",
    dificuldade: "DIFFICULTY",
    facil: "EASY",
    medio: "MEDIUM",
    dificil: "HARD",
  },
}

export default function SettingsScreen({
  onBack,
  showFps,
  setShowFps,
}: {
  onBack: () => void
  showFps: boolean
  setShowFps: (v: boolean) => void
}) {
  const { settings, updateSettings } = useContext(GameContext)!
  const [draft, setDraft] = useState<GameSettings>(() => ({ ...settings }))
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [capturingAction, setCapturingAction] = useState<ControlAction | null>(
    null,
  )
  const [controlError, setControlError] = useState<string | null>(null)
  const languageKey: LanguageKey = draft.language?.startsWith("pt")
    ? "PT"
    : "EN"
  const t = translations[languageKey]
  const mutedMusicTracks = draft.mutedMusicTracks ?? []

  const handleSave = () => {
    updateSettings(draft)
    onBack()
  }

  const setVolume = (
    key: "masterVolume" | "musicVolume" | "sfxVolume" | "stadiumVolume",
    value: number,
  ) => setDraft((previous) => ({ ...previous, [key]: value }))

  const toggleMusicTrack = (src: string) => {
    setDraft((previous) => {
      const mutedTracks = previous.mutedMusicTracks ?? []
      return {
        ...previous,
        mutedMusicTracks: mutedTracks.includes(src)
          ? mutedTracks.filter((track) => track !== src)
          : [...mutedTracks, src],
      }
    })
  }

  const setAllMusicTracks = (muted: boolean) =>
    setDraft((previous) => ({
      ...previous,
      mutedMusicTracks: muted ? MUSIC_TRACKS.map((track) => track.src) : [],
    }))

  const volumeControls = [
    { key: "masterVolume", label: t.master, value: draft.masterVolume ?? 100 },
    { key: "sfxVolume", label: t.sfx, value: draft.sfxVolume ?? 80 },
    {
      key: "stadiumVolume",
      label: t.stadium,
      value: draft.stadiumVolume ?? 22,
    },
    { key: "musicVolume", label: t.musica, value: draft.musicVolume ?? 80 },
  ] as const
  const controlBindings = draft.controls ?? DEFAULT_GAME_CONTROLS
  const controlActions: ControlActionItem[] = [
    { action: "moveUp", label: t.controlUp },
    { action: "moveDown", label: t.controlDown },
    { action: "moveLeft", label: t.controlLeft },
    { action: "moveRight", label: t.controlRight },
    { action: "rotateLeft", label: t.rotateLeft },
    { action: "rotateRight", label: t.rotateRight },
    { action: "selectNearest", label: t.selectNearest },
    { action: "pause", label: t.pause },
  ]

  const captureControlKey = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    action: ControlAction,
  ) => {
    if (capturingAction !== action) return
    event.preventDefault()
    event.stopPropagation()
    if (
      [
        "ShiftLeft",
        "ShiftRight",
        "ControlLeft",
        "ControlRight",
        "AltLeft",
        "AltRight",
        "MetaLeft",
        "MetaRight",
      ].includes(event.code)
    ) {
      setControlError(t.invalidKey)
      return
    }

    const duplicate = Object.entries(controlBindings).some(
      ([otherAction, key]) => otherAction !== action && key === event.code,
    )
    if (duplicate) {
      setControlError(t.duplicateKey)
      return
    }

    setDraft((previous) => ({
      ...previous,
      controls: {
        ...(previous.controls ?? DEFAULT_GAME_CONTROLS),
        [action]: event.code,
      },
    }))
    setControlError(null)
    setCapturingAction(null)
  }

  const displayKey = (code: string) => {
    if (code.startsWith("Key")) return code.slice(3)
    if (code.startsWith("Digit")) return code.slice(5)
    if (code.startsWith("Numpad")) return `NUM ${code.slice(6)}`
    const labels: Record<string, string> = {
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
      Escape: "ESC",
      Space: "SPACE",
      Backspace: "BACKSPACE",
      Enter: "ENTER",
      Tab: "TAB",
    }
    return labels[code] ?? code.toUpperCase()
  }

  return (
    <div className="animate-neon-on relative z-20 flex h-dvh w-full flex-col items-center overflow-hidden px-5 py-4 font-mono text-white sm:px-8 sm:py-5">
      {/* Header */}
      <div className="mb-4 flex w-full max-w-7xl shrink-0 items-center justify-between gap-3 rounded-3xl bg-[#00f0ff] px-5 py-4 font-extrabold text-black shadow-[0_0_20px_rgba(0,240,255,0.6)] sm:px-10 sm:py-6">
        <h1 className="text-xl sm:text-3xl tracking-widest">{t.settings}</h1>
        <button
          onClick={onBack}
          className="bg-[#ff007f] text-white font-extrabold tracking-widest text-xs sm:text-sm px-4 sm:px-8 py-2 rounded-full shadow-[0_0_15px_rgba(255,0,127,0.8)] hover:scale-105 hover:brightness-125 transition-all"
        >
          {t.voltar}
        </button>
        <button
          onClick={handleSave}
          className="bg-[#ff007f] text-white font-extrabold tracking-widest text-xs sm:text-sm px-4 sm:px-8 py-2 rounded-full shadow-[0_0_15px_rgba(255,0,127,0.8)] hover:scale-105 hover:brightness-125 transition-all"
        >
          SALVAR
        </button>
      </div>

      <div className="mb-4 flex w-full max-w-7xl shrink-0 gap-2 overflow-x-auto">
        {(["general", "audio", "controls"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-lg border px-5 py-2.5 text-xs sm:text-sm font-extrabold tracking-[0.2em] transition-all ${
              activeTab === tab
                ? "border-[#ff007f] bg-[#ff007f]/15 text-white shadow-[0_0_18px_rgba(255,0,127,0.45)]"
                : "border-white/15 bg-black/55 text-white/55 hover:border-[#ff007f]/60 hover:text-white"
            }`}
          >
            {tab === "general"
              ? t.geral
              : tab === "audio"
                ? t.audioTab
                : t.controlsTab}
          </button>
        ))}
      </div>

      <div className="min-h-0 w-full max-w-7xl flex-1 overflow-y-auto pb-3">
        {activeTab === "controls" ? (
          <section className="w-full rounded-2xl border border-[#ff007f]/70 bg-[#08050d]/90 p-4 shadow-[0_0_30px_rgba(255,0,127,0.22)] sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-[0.25em] text-[#ff4ca0]">
                  {t.controlsTab}
                </h2>
                <p className="mt-2 text-xs text-white/50">{t.controlsHelp}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft((previous) => ({
                    ...previous,
                    controls: { ...DEFAULT_GAME_CONTROLS },
                  }))
                  setCapturingAction(null)
                  setControlError(null)
                }}
                className="border border-[#ff007f]/60 px-4 py-2 text-[10px] font-bold tracking-widest text-white transition-colors hover:bg-[#ff007f]/15"
              >
                {t.resetControls}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {controlActions.map(({ action, label }) => (
                <div
                  key={action}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/45 px-4 py-3"
                >
                  <span className="text-xs font-bold tracking-wider text-white/80">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturingAction(action)
                      setControlError(null)
                    }}
                    onKeyDown={(event) => captureControlKey(event, action)}
                    onBlur={() =>
                      setCapturingAction((current) =>
                        current === action ? null : current,
                      )
                    }
                    aria-label={`${label}: ${displayKey(controlBindings[action])}`}
                    className={`min-w-24 rounded-lg border px-3 py-2 text-xs font-bold tracking-widest transition-all ${
                      capturingAction === action
                        ? "border-[#ff007f] bg-[#ff007f]/20 text-white shadow-[0_0_12px_rgba(255,0,127,0.55)]"
                        : "border-[#ff007f]/50 bg-black text-[#ff72b2] hover:border-[#ff007f] hover:bg-[#ff007f]/10"
                    }`}
                  >
                    {capturingAction === action
                      ? t.pressKey
                      : displayKey(controlBindings[action])}
                  </button>
                </div>
              ))}
            </div>
            {controlError && (
              <p role="alert" className="mt-4 text-xs font-bold text-[#ff72b2]">
                {controlError}
              </p>
            )}
            <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/45">
              {languageKey === "PT"
                ? "Clique numa peça para selecioná-la; use o mouse para mirar e chutar."
                : "Click a piece to select it; use the mouse to aim and shoot."}
            </p>
          </section>
        ) : activeTab === "audio" ? (
          <section className="w-full rounded-2xl border border-[#ff007f]/70 bg-[#08050d]/90 p-4 shadow-[0_0_30px_rgba(255,0,127,0.22)] sm:p-7">
            <div className="mb-7">
              <h2 className="text-[#ff4ca0] font-bold tracking-[0.25em] text-lg">
                {t.audio}
              </h2>
              <p className="mt-2 text-xs text-white/50">
                {languageKey === "PT"
                  ? "Ajuste cada canal de áudio separadamente."
                  : "Adjust each audio channel independently."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {volumeControls.map((control) => (
                <label
                  key={control.key}
                  className="block rounded-xl border border-white/10 bg-black/45 p-4 sm:p-5"
                >
                  <span className="mb-4 flex items-center justify-between gap-4 text-xs font-bold tracking-widest text-white">
                    <span>{control.label}</span>
                    <span className="text-[#ff4ca0] tabular-nums">
                      {control.value}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={control.value}
                    aria-label={control.label}
                    onChange={(event) =>
                      setVolume(control.key, Number(event.target.value))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#34202d] accent-[#ff007f]"
                    style={{
                      background: `linear-gradient(to right, #ff007f ${control.value}%, #34202d ${control.value}%)`,
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/45">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-sm font-bold tracking-[0.2em] text-[#ff4ca0]">
                    {t.playlist}
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    {MUSIC_TRACKS.length - mutedMusicTracks.length} /{" "}
                    {MUSIC_TRACKS.length} {t.tracksEnabled}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAllMusicTracks(false)}
                    className="border border-[#ff007f]/60 px-3 py-2 text-[10px] font-bold tracking-widest text-white hover:bg-[#ff007f]/15"
                  >
                    {t.allTracks}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllMusicTracks(true)}
                    className="border border-white/20 px-3 py-2 text-[10px] font-bold tracking-widest text-white/65 hover:border-[#ff007f]/60 hover:text-white"
                  >
                    {t.noTracks}
                  </button>
                </div>
              </div>
              <div className="grid max-h-[min(32vh,17rem)] gap-px overflow-y-auto bg-white/10 sm:grid-cols-2">
                {MUSIC_TRACKS.map((track) => {
                  const enabled = !mutedMusicTracks.includes(track.src)
                  return (
                    <label
                      key={track.src}
                      className="flex cursor-pointer items-center gap-3 bg-[#0a070d] px-4 py-3 transition-colors hover:bg-[#ff007f]/10"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleMusicTrack(track.src)}
                        className="h-4 w-4 accent-[#ff007f]"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-white/85">
                        {track.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold tracking-widest ${
                          enabled ? "text-[#ff4ca0]" : "text-white/35"
                        }`}
                      >
                        {enabled ? "ON" : "OFF"}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </section>
        ) : (
          /* Grid Content */
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
                        <span className="text-[#ff007f] font-bold text-xs">
                          ✓
                        </span>
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
                        <span className="text-[#ff007f] font-bold text-xs">
                          ✓
                        </span>
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
                          (draft.language?.startsWith("pt") &&
                            langKey === "PT") ||
                          (draft.language?.startsWith("en") && langKey === "EN")
                            ? "border-[#ff007f] shadow-[0_0_10px_#ff007f]"
                            : "border-purple-900 bg-black/60"
                        }`}
                      >
                        {(draft.language?.startsWith("pt") &&
                          langKey === "PT") ||
                        (draft.language?.startsWith("en") &&
                          langKey === "EN") ? (
                          <span className="text-[#ff007f] font-bold text-xs">
                            ✓
                          </span>
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
                      <span className="text-[#ff007f] font-bold text-xs">
                        ✓
                      </span>
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
                          <span className="text-[#ff007f] font-bold text-xs">
                            ✓
                          </span>
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
        )}
      </div>
    </div>
  )
}
