export type PieceType = "triangle" | "square" | "circle" | "diamond" | "pentagon" | "line"

export type Team = "A" | "B"

export type MatchMode = "normal" | "training"

export type Screen = "SPLASH" | "MAIN" | "SETTINGS" | "EDITAR" | "ELENCO" | "STATS" | "PLAY"

export type Role = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA"

export type MatchSound = "match-start" | "goal" | "ball-piece" | "piece-piece" | "wall" | "goal-line" | "whistle" | "lights-on"

export type KickoffPhase = "intro" | "regroup" | null

export interface KickoffTarget {
  x: number
  y: number
}

export interface KickoffRecoveryState {
  phase: "reposition" | "align" | "strike"
  targetX: number
  targetY: number
  strikeAngle: number
  pieceRotation: number
  plannedBallX: number
  plannedBallY: number
  bestCenterDistance: number
  bestPieceDistance: number
  noProgressTime: number
}

export interface GPiece {
  id: number

  type: PieceType

  role?: Role

  team: Team

  x: number

  y: number

  vx: number

  vy: number

  rot?: number

  isPlayerControlled: boolean

  isPrimaryChaser?: boolean
}

export interface Ball {
  x: number

  y: number

  vx: number

  vy: number
}

export interface SlotPiece {
  type: PieceType

  id: number

  role?: Role
}

export interface Particle {
  x: number

  y: number

  vx: number

  vy: number

  life: number

  ttl: number

  size: number

  rot: number

  vr: number

  type: PieceType

  color: string
}

export interface Shockwave {
  x: number

  y: number

  life: number

  ttl: number

  color: string
}

export interface PlayRect {
  x: number

  y: number

  w: number

  h: number

  scale: number
}

export interface GS {
  pieces: GPiece[]

  ball: Ball

  selectedIdx: number

  scoreA: number

  scoreB: number

  matchMode: MatchMode

  opponentSlots: SlotPiece[]

  paused: boolean

  finished: boolean

  timeLeft: number

  notification: string | null

  notifEnd: number

  goalCooldown: number

  kickoffCountdown: number

  kickoffDuration: number

  kickoffPhase: KickoffPhase

  kickoffConductorId: number | null

  kickoffTeam: Team | null

  kickoffTargets: Record<number, KickoffTarget>

  kickoffYieldSides: Record<number, -1 | 1>

  kickoffConductorCarrying: boolean

  kickoffConductorStriking: boolean

  kickoffCenterBraking: boolean

  kickoffRecovery: KickoffRecoveryState | null

  kickoffCarryComplete: boolean

  collisionCooldowns: Record<string, number>

  pieceVx: number

  pieceVy: number

  particles: Particle[]

  shockwaves: Shockwave[]

  shakeUntil: number

  flashUntil: number

  goalColor: string | null

  pendingResetScorerA: boolean | null

  stuckBallX: number

  stuckBallY: number

  stuckBallDuration: number

  pieceMotionWatch: Record<number, PieceMotionWatch>

  aiDecisionStates: Record<number, AiDecisionState>
}

export interface HudSnap {
  scoreA: number

  scoreB: number

  matchMode: MatchMode

  timeLeft: number

  notification: string | null

  paused: boolean

  finished: boolean

  selectedId: number | null

  flashColor: string | null

  goalColor: string | null

  kickoffCountdown: number

  kickoffDuration: number

  kickoffPhase: KickoffPhase
}

export interface PieceMotionWatch {
  anchorX: number

  anchorY: number

  stillTime: number

  escapeX: number

  escapeY: number

  escapeTime: number
}

export interface AiDecisionState {
  cooldown: number

  mistakeTime: number

  mistakeX: number

  mistakeY: number
}
