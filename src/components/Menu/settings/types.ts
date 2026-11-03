import type { GameControls, GameSettings } from "@/types"
import type { Dispatch, SetStateAction } from "react"
import type { translations } from "./translations"

export type LanguageKey = keyof typeof translations
export type SettingsCopy = typeof translations.PT
export type Difficulty = NonNullable<GameSettings["difficulty"]>
export type SettingsTab = "general" | "audio" | "controls"
export type ControlAction = keyof GameControls
export type SettingsDraftSetter = Dispatch<SetStateAction<GameSettings>>
export interface ControlActionItem {
  action: ControlAction
  label: string
}
export interface VolumeControl {
  key: "masterVolume" | "musicVolume" | "sfxVolume" | "stadiumVolume"
  label: string
  value: number
}
