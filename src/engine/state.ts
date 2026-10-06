import type { GS, MatchMode, PieceType, Role, SlotPiece, Team } from "@/types"
import { MATCH_SECS, VH, VW } from "@/constants/physics"
import {
  computeHomeNormalized,
  homeToCanvas,
  awayToCanvas,
} from "@/utils/tactics"

const CENTER_CIRCLE_RADIUS = VW * 0.15
const RANDOM_AWAY_PIECES: PieceType[] = [
  "triangle",
  "square",
  "circle",
  "diamond",
  "pentagon",
  "line",
]
const RANDOM_AWAY_ROLES: Role[] = ["ZAG", "LAT", "VOL", "MEI", "ATA"]

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function createRandomAwayFormation(): SlotPiece[] {
  const roles = shuffle([
    "GOL" as Role,
    ...Array.from({ length: 4 }, () => randomItem(RANDOM_AWAY_ROLES)),
  ])

  return roles.map((role, i) => ({
    id: 101 + i,
    role,
    type: randomItem(RANDOM_AWAY_PIECES),
  }))
}

/**
 * Keep-out zone: no piece may spawn inside the central circle at kickoff.
 * Only the X axis is adjusted (towards the piece's own half) so we never break
 * the vertical latereality (y) of the defensive/offensive lines. Y is untouched.
 */
function pushOutOfCenterX(piece: { x: number; y: number }, side: "HOME" | "AWAY") {
  const cx = VW / 2
  const cy = VH / 2
  const r = CENTER_CIRCLE_RADIUS
  const dx = piece.x - cx
  const dy = piece.y - cy
  const dist = Math.hypot(dx, dy)
  if (dist < r) {
    const sign = side === "HOME" ? -1 : 1
    const nx = dist > 0.001 ? dx / dist : sign
    const ny = dist > 0.001 ? dy / dist : 0
    const projectedX = cx + nx * r
    const projectedY = cy + ny * r

    piece.x = side === "HOME"
      ? Math.min(projectedX, cx - r)
      : Math.max(projectedX, cx + r)
    piece.y = projectedY
  }
}

/**
 * Build the initial game state from normalized formations.
 *
 * @param homeFormation Selected slots for the HOME team (left half).
 * @param awayFormation Optional slots for the AWAY team (right half).
 *                      When omitted, AWAY mirrors HOME unless randomizeAway is true.
 */
export function makeGS(
  homeFormation: SlotPiece[],
  awayFormation?: SlotPiece[],
  matchMode: MatchMode = "normal",
  randomizeAway = false,
): GS {
  const binHome = homeFormation.map((s) => s?.role)
  const homeNorm = computeHomeNormalized(binHome)

  const filledHome = [...homeFormation]
  while (filledHome.length < 5) {
    filledHome.push({ type: "circle", id: filledHome.length + 1, role: "MEI" })
  }

  // HOME — left half, attacks right, rot = 0 (internally Team "A")
  const home = filledHome.slice(0, 5).map((s, i) => {
    const canvas = homeToCanvas(homeNorm[i] ?? { x: 0.5, y: 0.5 })
    pushOutOfCenterX(canvas, "HOME")
    return {
      id: i + 1,
      type: s?.type ?? "circle",
      team: "A" as Team,
      x: canvas.x,
      y: canvas.y,
      vx: 0,
      vy: 0,
      rot: 0,
      role: s?.role,
      isPlayerControlled: i === 0,
    }
  })

  // AWAY — right half, attacks left, rot = Math.PI (internally Team "B")
  let away: GS["pieces"]
  let opponentSlots: SlotPiece[] = []
  const resolvedAwayFormation =
    awayFormation && awayFormation.length
      ? awayFormation
      : randomizeAway
        ? createRandomAwayFormation()
        : undefined

  if (resolvedAwayFormation) {
    const binAway = resolvedAwayFormation.map((s) => s?.role)
    const awayNorm = computeHomeNormalized(binAway)
    const filledAway = [...resolvedAwayFormation]
    while (filledAway.length < 5) {
      filledAway.push({ type: "circle", id: filledAway.length + 1, role: "MEI" })
    }
    opponentSlots = filledAway.slice(0, 5)
    away = filledAway.slice(0, 5).map((s, i) => {
      const canvas = awayToCanvas(awayNorm[i] ?? { x: 0.5, y: 0.5 })
      pushOutOfCenterX(canvas, "AWAY")
      return {
        id: 101 + i,
        type: s?.type ?? "circle",
        team: "B" as Team,
        x: canvas.x,
        y: canvas.y,
        vx: 0,
        vy: 0,
        rot: Math.PI,
        role: s?.role,
        isPlayerControlled: false,
      }
    })
  } else {
    // Mirror HOME formation for AWAY
    const awayTypes: PieceType[] = ["circle", "triangle", "triangle", "square", "square"]
    opponentSlots = filledHome.slice(0, 5).map((s, i) => ({
      id: 101 + i,
      role: s.role,
      type: awayTypes[i] ?? "circle",
    }))
    away = homeNorm.slice(0, 5).map((p, i) => {
      const canvas = awayToCanvas(p)
      pushOutOfCenterX(canvas, "AWAY")
      return {
        id: 101 + i,
        type: awayTypes[i] ?? "circle",
        team: "B" as Team,
        x: canvas.x,
        y: canvas.y,
        vx: 0,
        vy: 0,
        rot: Math.PI,
        role: opponentSlots[i]?.role,
        isPlayerControlled: false,
      }
    })
  }

  return {
    pieces: [...home, ...away],
    ball: { x: VW / 2, y: VH / 2, vx: 0, vy: 0 },
    selectedIdx: 0,
    scoreA: 0,
    scoreB: 0,
    matchMode,
    opponentSlots,
    paused: false,
    finished: false,
    timeLeft: matchMode === "normal" ? MATCH_SECS : Infinity,
    notification: null,
    notifEnd: 0,
    goalCooldown: 0,
    pieceVx: 0,
    pieceVy: 0,
    particles: [],
    shockwaves: [],
    shakeUntil: 0,
    flashUntil: 0,
    goalColor: null,
    pendingResetScorerA: null,
    stuckBallX: VW / 2,
    stuckBallY: VH / 2,
    stuckBallDuration: 0,
    pieceMotionWatch: {},
    aiDecisionStates: {},
  }
}
