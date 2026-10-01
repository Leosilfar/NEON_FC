import type { PieceType, Role } from "../types"

export const ALL_ROLES: Role[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]

export interface FormationPreset {
  name: string

  roles: Role[] | null
}

export const FORMATION_PRESETS: FormationPreset[] = [
  { name: "1-2-1-1 Equilibrada", roles: ["GOL", "ZAG", "ZAG", "MEI", "ATA"] },

  { name: "1-1-2-1 Losango", roles: ["GOL", "ZAG", "VOL", "MEI", "ATA"] },

  { name: "1-3-1-0 Retranca", roles: ["GOL", "ZAG", "ZAG", "ZAG", "MEI"] },

  { name: "1-1-1-2 Ataque Duplo", roles: ["GOL", "ZAG", "MEI", "ATA", "ATA"] },

  { name: "Customizada", roles: null },
]

export const ALL_PIECE_TYPES: PieceType[] = [
  "triangle",

  "square",

  "circle",

  "diamond",

  "pentagon",

  "line",
]

// Alias for compatibility

export const FORMATIONS = FORMATION_PRESETS
