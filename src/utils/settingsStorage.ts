import type { GameControls, GameSettings } from "@/types"

import { DEFAULT_GAME_CONTROLS, DEFAULT_SETTINGS } from "@/constants"

const STORAGE_KEY = "botaofc-v2"

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>
      const parsedControls: Partial<GameControls> =
        typeof parsed.controls === "object" && parsed.controls !== null
          ? parsed.controls
          : {}

      return {
        ...DEFAULT_SETTINGS,

        ...parsed,

        pieceColors: {
          ...DEFAULT_SETTINGS.pieceColors,

          ...(parsed.pieceColors ?? {}),
        },

        attrs: { ...DEFAULT_SETTINGS.attrs, ...(parsed.attrs ?? {}) },

        teamA: { ...DEFAULT_SETTINGS.teamA, ...(parsed.teamA ?? {}) },

        teamB: { ...DEFAULT_SETTINGS.teamB, ...(parsed.teamB ?? {}) },

        difficulty: parsed.difficulty ?? DEFAULT_SETTINGS.difficulty,

        mutedMusicTracks: Array.isArray(parsed.mutedMusicTracks)
          ? parsed.mutedMusicTracks.filter(
              (track): track is string => typeof track === "string",
            )
          : DEFAULT_SETTINGS.mutedMusicTracks,

        controls: {
          ...DEFAULT_SETTINGS.controls,
          moveUp:
            typeof parsedControls.moveUp === "string"
              ? parsedControls.moveUp
              : DEFAULT_GAME_CONTROLS.moveUp,
          moveDown:
            typeof parsedControls.moveDown === "string"
              ? parsedControls.moveDown
              : DEFAULT_GAME_CONTROLS.moveDown,
          moveLeft:
            typeof parsedControls.moveLeft === "string"
              ? parsedControls.moveLeft
              : DEFAULT_GAME_CONTROLS.moveLeft,
          moveRight:
            typeof parsedControls.moveRight === "string"
              ? parsedControls.moveRight
              : DEFAULT_GAME_CONTROLS.moveRight,
          rotateLeft:
            typeof parsedControls.rotateLeft === "string"
              ? parsedControls.rotateLeft
              : DEFAULT_GAME_CONTROLS.rotateLeft,
          rotateRight:
            typeof parsedControls.rotateRight === "string"
              ? parsedControls.rotateRight
              : DEFAULT_GAME_CONTROLS.rotateRight,
          selectNearest:
            typeof parsedControls.selectNearest === "string"
              ? parsedControls.selectNearest
              : DEFAULT_GAME_CONTROLS.selectNearest,
          pause:
            typeof parsedControls.pause === "string"
              ? parsedControls.pause
              : DEFAULT_GAME_CONTROLS.pause,
        },

        fieldSurfaceColor:
          parsed.fieldSurfaceColor ?? DEFAULT_SETTINGS.fieldSurfaceColor,
      }
    }
  } catch {
    /* keep defaults */
  }

  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore quota / private mode */
  }
}
