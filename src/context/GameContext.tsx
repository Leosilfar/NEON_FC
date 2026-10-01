import React, { createContext, useContext, useState, useEffect } from "react"
import { loadSettings, saveSettings } from "@/utils/settingsStorage"
import type { GameSettings } from "@/types/settings"
import type { MatchMode, Screen, SlotPiece } from "@/types/game"
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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [screen, setScreen] = useState<Screen>("SPLASH")
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [matchMode, setMatchMode] = useState<MatchMode>("normal")
  const [playerSlots, setPlayerSlots] = useState<SlotPiece[]>([])

  useEffect(() => {
    const defaultFormation = FORMATION_PRESETS[0]
    if (defaultFormation && defaultFormation.roles) {
      const slots: SlotPiece[] = defaultFormation.roles.map((role, idx) => ({
        id: idx + 1,
        type: "circle",
        role,
      }))
      setPlayerSlots(slots)
    }
  }, [])

  const updateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial }
      saveSettings(updated)
      return updated
    })
  }

  const updatePlayerSlots = (slots: SlotPiece[]) => {
    setPlayerSlots(slots)
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
