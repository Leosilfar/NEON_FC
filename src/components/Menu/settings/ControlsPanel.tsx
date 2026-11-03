import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from "react"
import type { GameControls } from "@/types"
import { DEFAULT_GAME_CONTROLS } from "@/constants"
import type {
  ControlAction,
  ControlActionItem,
  LanguageKey,
  SettingsCopy,
  SettingsDraftSetter,
} from "./types"
export function ControlsSettingsPanel({
  t,
  languageKey,
  controlActions,
  controlBindings,
  capturingAction,
  setCapturingAction,
  controlError,
  setControlError,
  captureControlKey,
  displayKey,
  setDraft,
}: {
  t: SettingsCopy
  languageKey: LanguageKey
  controlActions: ControlActionItem[]
  controlBindings: GameControls
  capturingAction: ControlAction | null
  setCapturingAction: Dispatch<SetStateAction<ControlAction | null>>
  controlError: string | null
  setControlError: Dispatch<SetStateAction<string | null>>
  captureControlKey: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    action: ControlAction,
  ) => void
  displayKey: (code: string) => string
  setDraft: SettingsDraftSetter
}) {
  return (
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
  )
}
