import type { LogoId, PieceType } from "../types"

export const PIECE_LABEL: Record<PieceType, string> = {
  triangle: "TRIÂNGULO",

  square: "QUADRADO",

  circle: "CÍRCULO",

  diamond: "LOSANGO",

  pentagon: "PENTÁGONO",

  line: "LINHA RETA",
}

export const PIECE_ROLE: Record<PieceType, string> = {
  triangle: "Ágil · Rápido",

  square: "Força · Chute",

  circle: "Defesa · Rebote",

  diamond: "Versátil · Preciso",

  pentagon: "Bloqueio · Poder",

  line: "Barreira · Desvio",
}

export const ALL_LOGOS: LogoId[] = [
  "shield",

  "star",

  "lightning",

  "crown",

  "hexagon",

  "target",

  "cross",

  "bolt2",
]
