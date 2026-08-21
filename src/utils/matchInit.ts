import type { GS, SlotPiece, Team } from "@/types";
import { MATCH_SECS, TEAM_A_START, TEAM_B_PRESET, VH, VW } from "@/constants";
import { computeMatchPercentPositions } from "./tactics";

export function makeGS(playerSlots: SlotPiece[]): GS {
  const roles = playerSlots.map((s) => s?.role);
  const perc = computeMatchPercentPositions(roles);

  const teamA = playerSlots.map((s, i) => {
    const p = perc[i] ?? { x: 50, y: 50 };
    return {
      id: i + 1,
      type: s?.type ?? "circle",
      team: "A" as Team,
      x: (p.x / 100) * VW,
      y: (p.y / 100) * VH,
    };
  });

  const teamBTypes = TEAM_B_PRESET.map((p) => p.type);
  const teamBPerc = perc.length >= 5 ? perc : Array(5).fill({ x: 50, y: 50 });
  const teamB = teamBPerc.map((p: { x: number; y: number }, i: number) => {
    const mirrorX = 100 - (p.x ?? 50);
    return {
      id: 101 + i,
      type: teamBTypes[i] ?? "circle",
      team: "B" as Team,
      x: (mirrorX / 100) * VW,
      y: ((p.y ?? 50) / 100) * VH,
    };
  });

  return {
    pieces: [...teamA, ...teamB],
    ball: { x: VW / 2, y: VH / 2, vx: 0, vy: 0 },
    selectedIdx: 0,
    scoreA: 0,
    scoreB: 0,
    paused: false,
    timeLeft: MATCH_SECS,
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
  };
}

export { TEAM_A_START };
