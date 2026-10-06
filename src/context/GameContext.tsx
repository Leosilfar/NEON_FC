import React, { createContext, useContext, useState } from "react"
import { loadSettings, saveSettings } from "@/utils/settingsStorage"
import type { GameSettings } from "@/types/settings"
import type { MatchMode, PieceType, Role, Screen, SlotPiece } from "@/types/game"
import { FORMATION_PRESETS } from "@/constants/formations"

interface GameContextType {
  screen: Screen
  setScreen: (screen: GameContextType["screen"]) => void
  settings: GameSettings
  updateSettings: (partial: Partial<GameSettings>) => void
  matchMode: MatchMode
  setMatchMode: (mode: MatchMode) => void
  playerSlots: SlotPiece[]
  updatePlayerSlots: (slots: SlotPiece[]) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

const PLAYER_SLOTS_STORAGE_KEY = "botaofc-player-slots-v1"
const PIECE_TYPES: readonly string[] = [
  "triangle",
  "square",
  "circle",
  "diamond",
  "pentagon",
  "line",
]
const ROLES: readonly string[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]

function isPieceType(value: unknown): value is PieceType {
  return typeof value === "string" && PIECE_TYPES.includes(value)
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value)
}

function defaultPlayerSlots(): SlotPiece[] {
  const roles = FORMATION_PRESETS[0]?.roles ?? ["GOL", "ZAG", "ZAG", "MEI", "ATA"]
  return roles.map((role, index) => ({
    id: index + 1,
    type: "circle",
    role,
  }))
}

function loadPlayerSlots(): SlotPiece[] {
  try {
    const raw = localStorage.getItem(PLAYER_SLOTS_STORAGE_KEY)
    if (!raw) return defaultPlayerSlots()

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== 5) {
      return defaultPlayerSlots()
    }

    const slots = parsed.map((slot: unknown, index) => {
      if (
        typeof slot !== "object" ||
        slot === null ||
        !("type" in slot) ||
        !("role" in slot) ||
        !isPieceType(slot.type) ||
        !isRole(slot.role)
      ) {
        return null
      }

      return {
        id: index + 1,
        type: slot.type,
        role: slot.role,
      }
    })

    return slots.every(
      (slot): slot is SlotPiece & { role: Role } => slot !== null,
    )
      ? slots
      : defaultPlayerSlots()
  } catch {
    return defaultPlayerSlots()
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [screen, setScreen] = useState<Screen>("SPLASH")
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [matchMode, setMatchMode] = useState<MatchMode>("normal")
  const [playerSlots, setPlayerSlots] = useState<SlotPiece[]>(loadPlayerSlots)

  const updateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial }
      saveSettings(updated)
      return updated
    })
  }

  const updatePlayerSlots = (slots: SlotPiece[]) => {
    setPlayerSlots(slots)
    try {
      localStorage.setItem(PLAYER_SLOTS_STORAGE_KEY, JSON.stringify(slots))
    } catch {
      /* keep the selected lineup for the current session */
    }
  }

  return (
    <GameContext.Provider
      value={{
        screen,
        setScreen,
        settings,
        updateSettings,
        matchMode,
        setMatchMode,
        playerSlots,
        updatePlayerSlots,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}

// Export the context for use in components
export { GameContext }
