import {
  useContext,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"

import { GameContext } from "@/context/GameContext"

import type { GameSettings } from "@/types"

import { DEFAULT_GAME_CONTROLS } from "@/constants"

import { MUSIC_TRACKS } from "@/utils/soundtrack"

import { translations } from "./settings/translations"
import type {
  ControlAction,
  ControlActionItem,
  LanguageKey,
  SettingsTab,
} from "./settings/types"

import { AudioSettingsPanel } from "./settings/AudioPanel"

import { ControlsSettingsPanel } from "./settings/ControlsPanel"

import { GeneralSettingsPanel } from "./settings/GeneralPanel"

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

    { action: "kick", label: t.kick },
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
          {t.save}
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
          <ControlsSettingsPanel
            t={t}
            languageKey={languageKey}
            controlActions={controlActions}
            controlBindings={controlBindings}
            capturingAction={capturingAction}
            setCapturingAction={setCapturingAction}
            controlError={controlError}
            setControlError={setControlError}
            captureControlKey={captureControlKey}
            displayKey={displayKey}
            setDraft={setDraft}
          />
        ) : activeTab === "audio" ? (
          <AudioSettingsPanel
            t={t}
            languageKey={languageKey}
            volumeControls={[...volumeControls]}
            mutedMusicTracks={mutedMusicTracks}
            setVolume={setVolume}
            setAllMusicTracks={setAllMusicTracks}
            toggleMusicTrack={toggleMusicTrack}
          />
        ) : (
          <GeneralSettingsPanel
            t={t}
            draft={draft}
            setDraft={setDraft}
            showFps={showFps}
            setShowFps={setShowFps}
          />
        )}
      </div>
    </div>
  )
}
