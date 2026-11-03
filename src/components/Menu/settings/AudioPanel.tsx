import { MUSIC_TRACKS } from "@/utils/soundtrack"
import type { LanguageKey, SettingsCopy, VolumeControl } from "./types"
export function AudioSettingsPanel({
  t,
  languageKey,
  volumeControls,
  mutedMusicTracks,
  setVolume,
  setAllMusicTracks,
  toggleMusicTrack,
}: {
  t: SettingsCopy
  languageKey: LanguageKey
  volumeControls: VolumeControl[]
  mutedMusicTracks: string[]
  setVolume: (key: VolumeControl["key"], value: number) => void
  setAllMusicTracks: (muted: boolean) => void
  toggleMusicTrack: (src: string) => void
}) {
  return (
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
                className={`group flex cursor-pointer items-center gap-3 bg-[#0a070d] px-4 py-3 transition-colors hover:bg-[#ff007f]/10 ${
                  enabled ? "text-white" : "text-white/55"
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleMusicTrack(track.src)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full border transition-all ${
                    enabled
                      ? "border-[#ff4ca0]/80 bg-[#ff007f]/25 shadow-[0_0_10px_rgba(255,0,127,0.35)]"
                      : "border-white/20 bg-white/5"
                  } peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff4ca0] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0a070d]`}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                      enabled
                        ? "left-[18px] bg-[#ff4ca0] shadow-[0_0_8px_#ff007f]"
                        : "left-0.5 bg-white/45"
                    }`}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs transition-colors group-hover:text-white">
                  {track.title}
                </span>
                <span
                  className={`text-[9px] font-bold tracking-widest ${
                    enabled
                      ? "rounded-full border border-[#ff4ca0]/30 bg-[#ff007f]/10 px-2 py-0.5 text-[#ff4ca0]"
                      : "text-white/35"
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
  )
}
