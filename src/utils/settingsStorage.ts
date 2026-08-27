import type { GameSettings } from "@/types"

import { DEFAULT_SETTINGS } from "@/constants"

const STORAGE_KEY = "botaofc-v2"

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>

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
