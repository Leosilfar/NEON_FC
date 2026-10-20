import { DEFAULT_SETTINGS } from "@/constants/settings"
import { FIXED_DT } from "@/constants/physics"
import { FORMATION_PRESETS } from "@/constants/formations"
import { stepMatchSimulation } from "@/engine/simulation"
import { getTacticalAiKickIntents } from "@/engine/ai"
import { makeGS } from "@/engine/state"
import type { GameSettings, GS, Team } from "@/types"
import { BR, PR, vdist } from "@/constants/physics"
import type { AiAction } from "@/types"

export interface AiMatchMetrics {
  seed: number
  scoreA: number
  scoreB: number
  possessionASeconds: number
  possessionBSeconds: number
  contestedSeconds: number
  stuckBallSeconds: number
  aiKicks: number
  aiPasses: number
  aiShots: number
  kickActionPieceSeconds: number
  kickContactPieceSeconds: number
  kickReadyPieceSeconds: number
  nearBallPieceSeconds: number
  nearBallActions: Partial<Record<AiAction, number>>
  contactRangePieceSeconds: number
  contactRangeActions: Partial<Record<AiAction, number>>
  durationSeconds: number
}

export interface AiBatchMetrics {
  matches: number
  averageGoals: number
  homeWinRate: number
  awayWinRate: number
  drawRate: number
  averagePossessionA: number
  averagePossessionB: number
  averageStuckBallSeconds: number
  matchResults: AiMatchMetrics[]
}

function createHeadlessState(
  seed: number,
  settings: GameSettings,
  durationSeconds: number,
): GS {
  const roles = FORMATION_PRESETS[0]?.roles ?? [
    "GOL",
    "ZAG",
    "ZAG",
    "MEI",
    "ATA",
  ]
  const homeSlots = roles.map((role, index) => ({
    id: index + 1,
    role,
    type: (["triangle", "square", "circle", "diamond", "pentagon"] as const)[
      index
    ],
  }))
  const gs = makeGS(homeSlots, undefined, "normal", true, seed)
  gs.pieces.forEach((piece) => {
    piece.isPlayerControlled = false
  })
  // -1 means the simulation has no keyboard-controlled fallback piece.
  gs.selectedIdx = -1
  gs.timeLeft = durationSeconds
  return gs
}

export function simulateAiMatch(
  seed: number,
  options: { settings?: GameSettings; durationSeconds?: number } = {},
): AiMatchMetrics {
  const settings = options.settings ?? DEFAULT_SETTINGS
  const durationSeconds = Math.max(FIXED_DT, options.durationSeconds ?? 240)
  const gs = createHeadlessState(seed, settings, durationSeconds)
  const playerSlots = gs.pieces
    .filter((piece) => piece.team === "A")
    .map((piece, index) => ({
      id: piece.id,
      type: piece.type,
      role: piece.role,
    }))
  const emptyInput = { keys: new Set<string>() }
  let possessionASeconds = 0
  let possessionBSeconds = 0
  let contestedSeconds = 0
  let stuckBallSeconds = 0
  let simulatedSeconds = 0
  let timestamp = 0
  let kickActionPieceSeconds = 0
  let kickContactPieceSeconds = 0
  let kickReadyPieceSeconds = 0
  let nearBallPieceSeconds = 0
  const nearBallActions: Partial<Record<AiAction, number>> = {}
  let contactRangePieceSeconds = 0
  const contactRangeActions: Partial<Record<AiAction, number>> = {}

  while (!gs.finished && simulatedSeconds < durationSeconds + 30) {
    stepMatchSimulation({
      gs,
      settings,
      input: emptyInput,
      playerSlots,
      dt: FIXED_DT,
      ts: timestamp,
    })
    simulatedSeconds += FIXED_DT
    timestamp += FIXED_DT * 1000

    const kickActionPieces = gs.pieces.filter((piece) => {
      const action = gs.aiDecisionStates[piece.id]?.action
      return !piece.isPlayerControlled && (action === "PASS" || action === "SHOOT")
    })
    kickActionPieceSeconds += kickActionPieces.length * FIXED_DT
    kickContactPieceSeconds += kickActionPieces.filter((piece) =>
      vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= PR + BR + 10
    ).length * FIXED_DT
    kickReadyPieceSeconds += getTacticalAiKickIntents(gs).length * FIXED_DT
    for (const piece of gs.pieces) {
      if (piece.isPlayerControlled || vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) > 150) continue
      nearBallPieceSeconds += FIXED_DT
      const action = gs.aiDecisionStates[piece.id]?.action
      if (action) nearBallActions[action] = (nearBallActions[action] ?? 0) + 1
      if (vdist(piece.x, piece.y, gs.ball.x, gs.ball.y) <= PR + BR + 10) {
        contactRangePieceSeconds += FIXED_DT
        if (action) contactRangeActions[action] = (contactRangeActions[action] ?? 0) + 1
      }
    }

    const possession: Team | null = gs.aiPossessionTeam
    if (possession === "A") possessionASeconds += FIXED_DT
    else if (possession === "B") possessionBSeconds += FIXED_DT
    else contestedSeconds += FIXED_DT

    if (gs.stuckBallDuration > 0.8) stuckBallSeconds += FIXED_DT
  }

  return {
    seed,
    scoreA: gs.scoreA,
    scoreB: gs.scoreB,
    possessionASeconds,
    possessionBSeconds,
    contestedSeconds,
    stuckBallSeconds,
    aiKicks: gs.aiKickCount,
    aiPasses: gs.aiPassCount,
    aiShots: gs.aiShotCount,
    kickActionPieceSeconds,
    kickContactPieceSeconds,
    kickReadyPieceSeconds,
    nearBallPieceSeconds,
    nearBallActions,
    contactRangePieceSeconds,
    contactRangeActions,
    durationSeconds: simulatedSeconds,
  }
}

export function simulateAiBatch(
  count: number,
  options: {
    firstSeed?: number
    settings?: GameSettings
    durationSeconds?: number
  } = {},
): AiBatchMetrics {
  const matchCount = Math.max(1, Math.floor(count))
  const firstSeed = options.firstSeed ?? 1
  const matchResults = Array.from({ length: matchCount }, (_, index) =>
    simulateAiMatch((firstSeed + index) >>> 0, options),
  )
  const totalGoals = matchResults.reduce(
    (sum, match) => sum + match.scoreA + match.scoreB,
    0,
  )
  const homeWins = matchResults.filter(
    (match) => match.scoreA > match.scoreB,
  ).length
  const awayWins = matchResults.filter(
    (match) => match.scoreB > match.scoreA,
  ).length
  const draws = matchCount - homeWins - awayWins
  const totalDuration =
    matchResults.reduce((sum, match) => sum + match.durationSeconds, 0) || 1

  return {
    matches: matchCount,
    averageGoals: totalGoals / matchCount,
    homeWinRate: homeWins / matchCount,
    awayWinRate: awayWins / matchCount,
    drawRate: draws / matchCount,
    averagePossessionA:
      matchResults.reduce((sum, match) => sum + match.possessionASeconds, 0) /
      totalDuration,
    averagePossessionB:
      matchResults.reduce((sum, match) => sum + match.possessionBSeconds, 0) /
      totalDuration,
    averageStuckBallSeconds:
      matchResults.reduce((sum, match) => sum + match.stuckBallSeconds, 0) /
      matchCount,
    matchResults,
  }
}
