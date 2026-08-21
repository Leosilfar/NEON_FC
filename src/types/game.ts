export type PieceType =
  | "triangle"
  | "square"
  | "circle"
  | "diamond"
  | "pentagon"
  | "line";

export type Team = "A" | "B";
export type Screen = "menu" | "settings" | "builder" | "match";
export type Role = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface GPiece {
  id: number;
  type: PieceType;
  team: Team;
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SlotPiece {
  type: PieceType;
  id: number;
  role?: Role;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  rot: number;
  vr: number;
  type: PieceType;
  color: string;
}

export interface Shockwave {
  x: number;
  y: number;
  life: number;
  ttl: number;
  color: string;
}

export interface PlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

export interface GS {
  pieces: GPiece[];
  ball: Ball;
  selectedIdx: number;
  scoreA: number;
  scoreB: number;
  paused: boolean;
  timeLeft: number;
  notification: string | null;
  notifEnd: number;
  goalCooldown: number;
  pieceVx: number;
  pieceVy: number;
  particles: Particle[];
  shockwaves: Shockwave[];
  shakeUntil: number;
  flashUntil: number;
  goalColor: string | null;
  pendingResetScorerA: boolean | null;
}

export interface HudSnap {
  scoreA: number;
  scoreB: number;
  timeLeft: number;
  notification: string | null;
  paused: boolean;
  selectedId: number | null;
  flashColor: string | null;
  goalColor: string | null;
}
