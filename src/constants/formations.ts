import type { PieceType, Role, GPiece } from "../types";
import { VH } from "./physics";

export const ALL_ROLES: Role[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

export const SLOT_LABELS: Role[] = ["GOL", "ZAG", "ZAG", "MEI", "ATA"];

export interface FormationPreset {
  name: string;
  roles: Role[] | null;
}

export const FORMATION_PRESETS: FormationPreset[] = [
  { name: "1-2-1-1 Equilibrada", roles: ["GOL", "ZAG", "ZAG", "MEI", "ATA"] },
  { name: "1-1-2-1 Losango", roles: ["GOL", "ZAG", "VOL", "MEI", "ATA"] },
  { name: "1-3-1-0 Retranca", roles: ["GOL", "ZAG", "ZAG", "ZAG", "MEI"] },
  { name: "1-1-1-2 Ataque Duplo", roles: ["GOL", "ZAG", "MEI", "ATA", "ATA"] },
  { name: "Customizada", roles: null },
];

export const ALL_PIECE_TYPES: PieceType[] = [
  "triangle",
  "square",
  "circle",
  "diamond",
  "pentagon",
  "line",
];

export const TEAM_B_PRESET: GPiece[] = [
  { id: 101, type: "circle", team: "B", x: 940, y: VH / 2 },
  { id: 102, type: "triangle", team: "B", x: 790, y: VH * 0.3 },
  { id: 103, type: "triangle", team: "B", x: 790, y: VH * 0.7 },
  { id: 104, type: "square", team: "B", x: 640, y: VH * 0.4 },
  { id: 105, type: "square", team: "B", x: 640, y: VH * 0.68 },
];

export const TEAM_A_START = [
  { x: 60, y: VH / 2 },
  { x: 210, y: VH * 0.3 },
  { x: 210, y: VH * 0.7 },
  { x: 370, y: VH * 0.4 },
  { x: 370, y: VH * 0.68 },
];

// Alias for compatibility
export const FORMATIONS = FORMATION_PRESETS;