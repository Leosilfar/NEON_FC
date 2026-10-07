import type { BgPreset, GameSettings, PaletteEntry, BgEntry } from "../types"

export const NEON_PALETTE: PaletteEntry[] = [
  { name: "CIANO", hex: "#00f5ff" },

  { name: "MAGENTA", hex: "#ff2d9b" },

  { name: "AMARELO", hex: "#f5e642" },

  { name: "VERDE", hex: "#39ff5a" },

  { name: "AZUL", hex: "#3d5eff" },

  { name: "LARANJA", hex: "#ff6b2b" },

  { name: "ROXO", hex: "#bf5fff" },

  { name: "VERMELHO", hex: "#ff2020" },

  { name: "ROSA", hex: "#ff84d8" },

  { name: "TURQUESA", hex: "#00ffb2" },

  { name: "OURO", hex: "#ffd700" },

  { name: "PRATA", hex: "#c0c0c0" },

  { name: "BRANCO", hex: "#ffffff" },

  { name: "PRETO NEON", hex: "#111111" },
]

export const BG_PRESETS: Record<BgPreset, BgEntry> = {
  "cyber-purple": {
    label: "CYBER ROXO",

    preview: "#0d0520",

    css: "linear-gradient(160deg,#0a0320 0%,#120535 50%,#0d0225 100%)",
  },

  "cyber-dark": {
    label: "CYBER DARK",

    preview: "#0a0519",

    css: "linear-gradient(160deg,#04010d 0%,#080218 55%,#06011a 100%)",
  },

  "pure-black": { label: "PRETO PURO", preview: "#000000", css: "#000000" },

  "black-neon": {
    label: "PRETO NEON",

    preview: "#001515",

    css: "radial-gradient(ellipse at center,#001515 0%,#000000 70%)",
  },

  "deep-blue": {
    label: "AZUL PROFUNDO",

    preview: "#000020",

    css: "linear-gradient(160deg,#00001a 0%,#000033 100%)",
  },

  "neon-green": {
    label: "NEON VERDE",

    preview: "#001a08",

    css: "radial-gradient(ellipse at center,#001a08 0%,#000000 70%)",
  },

  "neon-pink": {
    label: "NEON ROSA",

    preview: "#1a0010",

    css: "radial-gradient(ellipse at center,#1a0010 0%,#000000 70%)",
  },

  "deep-red": {
    label: "RUBRO NEON",

    preview: "#1a0000",

    css: "radial-gradient(ellipse at center,#1a0000 0%,#000000 70%)",
  },

  white: {
    label: "BRANCO CLEAN",

    preview: "#f5f5f5",

    css: "linear-gradient(160deg,#f0f0f0,#ffffff)",
  },
}

export const DEFAULT_GAME_CONTROLS = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  rotateLeft: "KeyQ",
  rotateRight: "KeyE",
  selectNearest: "Tab",
  pause: "Escape",
} as const

export const DEFAULT_SETTINGS: GameSettings = {
  pieceColors: {
    triangle: "#f5e642",

    square: "#ff2d9b",

    circle: "#39ff5a",

    diamond: "#bf5fff",

    pentagon: "#ff6b2b",

    line: "#00f5ff",
  },

  fieldLineColor: "#4dd6ff",

  fieldSurfaceColor: "rgba(0,18,8,0.45)",

  bgPreset: "cyber-purple",

  teamA: { name: "NEON FC", color: "#4dd6ff", logo: "shield" },

  teamB: { name: "GRID OS", color: "#ff2d9b", logo: "hexagon" },

  attrs: {
    triangle: { speed: 92, power: 58, rebound: 44 },

    square: { speed: 55, power: 95, rebound: 62 },

    circle: { speed: 68, power: 48, rebound: 97 },

    diamond: { speed: 80, power: 72, rebound: 55 },

    pentagon: { speed: 60, power: 80, rebound: 75 },

    line: { speed: 75, power: 65, rebound: 88 },
  },

  accentColor: "#9b4fff",

  glowIntensity: "medium",

  showScanlines: true,

  showGrid: true,

  masterVolume: 100,

  musicVolume: 80,

  sfxVolume: 80,

  stadiumVolume: 22,

  mutedMusicTracks: [],

  controls: DEFAULT_GAME_CONTROLS,

  difficulty: "medium",
}

export const FIELD_SURFACE_OPTIONS = [
  { label: "GRAMA ESCURA", val: "rgba(0,22,8,0.5)" },

  { label: "GRAMA VÍVIDA", val: "rgba(0,40,10,0.55)" },

  { label: "GELO AZUL", val: "rgba(0,20,50,0.5)" },

  { label: "ROXO VOID", val: "rgba(25,0,50,0.55)" },

  { label: "AREIA", val: "rgba(50,35,0,0.4)" },

  { label: "VERMELHO", val: "rgba(50,0,0,0.45)" },

  { label: "NEUTRO", val: "rgba(0,0,0,0.0)" },
] as const
