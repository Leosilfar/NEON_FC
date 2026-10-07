import { useContext, useState, useEffect, useRef } from "react"
import { GameContext } from "@/context/GameContext"
import Match from "./components/match/Match"
import SplashScreen from "./components/Menu/SplashScreen"
import MainScreen from "./components/Menu/MainScreen"
import SettingsScreen from "./components/Menu/SettingsScreen"
import EditMenu from "./components/Menu/EditScreen"
import TeamBuilder from "./components/team-builder/TeamBuilder"
import StatsScreen from "./components/Menu/StatsScreen"
import {
  playMusicPlaylist,
  playSfx,
  setAudioVolumes,
  subscribeToMusicTrack,
  unlockAudio,
} from "@/utils/audio"
import { getEnabledMusicTracks, type MusicTrack } from "@/utils/soundtrack"

const MUSIC_TOAST_TRANSITION_MS = 1400
const MUSIC_TOAST_DISPLAY_MS = 5000

const FpsCounter = () => {
  const [fps, setFps] = useState(60)
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animId: number
    const update = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frameCount)
        frameCount = 0
        lastTime = now
      }
      animId = requestAnimationFrame(update)
    }
    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [])
  return (
    <div className="fixed top-4 left-4 z-50 font-mono text-xs font-bold text-[#00f0ff] bg-black/80 px-3 py-1 rounded border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
      FPS: {fps}
    </div>
  )
}

export default function App() {
  const { screen, setScreen, settings, playerSlots, matchMode } =
    useContext(GameContext)!
  const [showFps, setShowFps] = useState(false)
  const [musicToast, setMusicToast] = useState<{
    track: MusicTrack
    id: number
  } | null>(null)
  const [musicToastOpen, setMusicToastOpen] = useState(false)
  const musicStarted = useRef(false)
  const musicToastId = useRef(0)
  const musicToastOpenFrame = useRef<number | null>(null)

  useEffect(() => {
    const preventBrowserZoom = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      if (
        [
          "Equal",
          "Minus",
          "NumpadAdd",
          "NumpadSubtract",
          "Add",
          "Subtract",
        ].includes(event.code) ||
        event.key === "+" ||
        event.key === "-"
      ) {
        event.preventDefault()
      }
    }
    const preventPinchZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault()
    }

    document.addEventListener("keydown", preventBrowserZoom, true)
    document.addEventListener("wheel", preventPinchZoom, {
      capture: true,
      passive: false,
    })
    return () => {
      document.removeEventListener("keydown", preventBrowserZoom, true)
      document.removeEventListener("wheel", preventPinchZoom, true)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToMusicTrack((track) => {
      if (musicToastOpenFrame.current !== null) {
        cancelAnimationFrame(musicToastOpenFrame.current)
        musicToastOpenFrame.current = null
      }

      if (!track) {
        setMusicToast(null)
        setMusicToastOpen(false)
        return
      }

      musicToastId.current += 1
      setMusicToast({ track, id: musicToastId.current })
      setMusicToastOpen(false)
      musicToastOpenFrame.current = requestAnimationFrame(() => {
        musicToastOpenFrame.current = requestAnimationFrame(() => {
          setMusicToastOpen(true)
          musicToastOpenFrame.current = null
        })
      })
    })

    return () => {
      unsubscribe()
      if (musicToastOpenFrame.current !== null) {
        cancelAnimationFrame(musicToastOpenFrame.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!musicToast) return

    const closeTimer = window.setTimeout(() => {
      setMusicToastOpen(false)
    }, MUSIC_TOAST_TRANSITION_MS + MUSIC_TOAST_DISPLAY_MS)

    return () => window.clearTimeout(closeTimer)
  }, [musicToast])

  useEffect(() => {
    setAudioVolumes({
      master: settings.masterVolume ?? 100,
      music: settings.musicVolume ?? 80,
      sfx: settings.sfxVolume ?? 80,
      stadium: settings.stadiumVolume ?? 22,
    })
  }, [
    settings.masterVolume,
    settings.musicVolume,
    settings.sfxVolume,
    settings.stadiumVolume,
  ])

  useEffect(() => {
    if (!musicStarted.current) return
    playMusicPlaylist(getEnabledMusicTracks(settings.mutedMusicTracks))
  }, [settings.mutedMusicTracks])

  useEffect(() => {
    const getInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null
      return target.closest<HTMLElement>(
        "button, [role='button'], [data-ui-sound]",
      )
    }

    const handlePointerOver = (event: PointerEvent) => {
      const target = getInteractiveTarget(event.target)
      if (
        !target ||
        target.matches(":disabled") ||
        target.getAttribute("aria-disabled") === "true"
      ) {
        return
      }
      if (
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      ) {
        return
      }
      playSfx("menu-hover", 0.6)
    }

    const handleClick = (event: MouseEvent) => {
      const target = getInteractiveTarget(event.target)
      if (
        !target ||
        target.matches(":disabled") ||
        target.getAttribute("aria-disabled") === "true"
      ) {
        return
      }
      unlockAudio()
      if (
        screen === "MAIN" &&
        target instanceof HTMLButtonElement &&
        !musicStarted.current
      ) {
        musicStarted.current = true
        playMusicPlaylist(getEnabledMusicTracks(settings.mutedMusicTracks))
      }
      playSfx(
        target.getAttribute("data-ui-sound") === "slot-place"
          ? "slot-place"
          : "ui-click",
      )
    }

    const handleAudioUnlock = () => unlockAudio()
    const handleSplashKeyDown = () => {
      unlockAudio()
      if (screen !== "SPLASH" || musicStarted.current) return

      musicStarted.current = true
      playMusicPlaylist(getEnabledMusicTracks(settings.mutedMusicTracks))
    }
    document.addEventListener("pointerover", handlePointerOver, true)
    document.addEventListener("pointerdown", handleAudioUnlock, true)
    document.addEventListener("keydown", handleSplashKeyDown, true)
    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true)
      document.removeEventListener("pointerdown", handleAudioUnlock, true)
      document.removeEventListener("keydown", handleSplashKeyDown, true)
      document.removeEventListener("click", handleClick, true)
    }
  }, [screen, settings.mutedMusicTracks])

  let menuContent = null
  switch (screen) {
    case "SPLASH":
      menuContent = <SplashScreen />
      break
    case "MAIN":
      menuContent = <MainScreen />
      break
    case "SETTINGS":
      menuContent = (
        <SettingsScreen
          onBack={() => setScreen("MAIN")}
          showFps={showFps}
          setShowFps={setShowFps}
        />
      )
      break
    case "EDITAR":
      menuContent = <EditMenu onBack={() => setScreen("MAIN")} />
      break
    case "ELENCO":
      menuContent = (
        <TeamBuilder onBack={() => setScreen("MAIN")} settings={settings} />
      )
      break
    case "STATS":
      menuContent = <StatsScreen onBack={() => setScreen("MAIN")} />
      break
    default:
      menuContent = <MainScreen />
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {showFps && <FpsCounter />}
      {musicToast && (screen === "SPLASH" || screen === "MAIN") && (
        <div className="music-toast fixed bottom-6 left-6 z-[100] flex items-center text-white">
          <div className="music-toast__icon" aria-hidden="true">
            <span className="music-toast__diamond">
              <span className="music-toast__core" />
            </span>
          </div>
          <div
            role="status"
            aria-live="polite"
            aria-hidden={!musicToastOpen}
            className={`music-toast__card ${musicToastOpen ? "is-open" : ""}`}
          >
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.28em] text-cyan-300">
                TOCANDO AGORA
              </div>
              <div className="mt-1 max-w-[min(65vw,340px)] truncate font-display text-lg font-bold tracking-wider">
                {musicToast.track.title}
              </div>
            </div>
          </div>
        </div>
      )}
      {screen !== "PLAY" && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center z-0 pointer-events-none"
            style={{ backgroundImage: "url('./background.png')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent pointer-events-none z-10"></div>
          <div className="relative z-20 w-full h-full">{menuContent}</div>
          {settings.showGrid && (
            <div className="fixed inset-0 pointer-events-none z-40 bg-[linear-gradient(to_right,rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}
          {settings.showScanlines && (
            <div
              className="fixed inset-0 pointer-events-none z-50 opacity-30"
              style={{
                background:
                  "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)",
                backgroundSize: "100% 4px",
              }}
            />
          )}
        </>
      )}
      {screen === "PLAY" && (
        <Match
          playerSlots={playerSlots}
          matchMode={matchMode}
          settings={settings}
          onExit={() => setScreen("MAIN")}
        />
      )}
    </div>
  )
}
