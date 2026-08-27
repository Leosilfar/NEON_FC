import type { PieceType } from "./game";

export type LogoId =
  | "shield"
  | "star"
  | "lightning"
  | "crown"
  | "hexagon"
  | "target"
  | "cross"
  | "bolt2";

export type BgPreset =
  | "cyber-purple"
  | "cyber-dark"
  | "pure-black"
  | "black-neon"
  | "deep-blue"
  | "neon-green"
  | "neon-pink"
  | "deep-red"
  | "white";

export type GlowLevel = "low" | "medium" | "high" | number;

export interface TeamSettings {
  name: string;
  color: string;
  logo: LogoId;
}

export interface PieceAttrs {
  speed: number;
  power: number;
  rebound: number;
}

export interface GameSettings {
  showFps?: boolean;
  pieceColors: Record<PieceType, string>;
  fieldLineColor: string;
  fieldSurfaceColor: string;
  bgPreset: BgPreset;
  teamA: TeamSettings;
  teamB: TeamSettings;
  attrs: Record<PieceType, PieceAttrs>;
  accentColor: string;
  glowIntensity: GlowLevel | number;
  showScanlines: boolean;
  showGrid: boolean;
  masterVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface PaletteEntry {
  name: string;
  hex: string;
}

export interface BgEntry {
  label: string;
  css: string;
  preview: string;
}
