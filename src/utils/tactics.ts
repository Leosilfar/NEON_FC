import type { Role } from "@/types";

export function groupRoles(roles: (Role | undefined)[]) {
  const groups: Record<"GOL" | "DEF" | "MID" | "ATT", number[]> = {
    GOL: [],
    DEF: [],
    MID: [],
    ATT: [],
  };
  roles.forEach((r, idx) => {
    if (r === "GOL") groups.GOL.push(idx);
    else if (r === "ZAG" || r === "LAT") groups.DEF.push(idx);
    else if (r === "VOL" || r === "MEI") groups.MID.push(idx);
    else if (r === "ATA") groups.ATT.push(idx);
  });
  return groups;
}

export function computeTacticalUiPositions(
  roles: Role[]
): { x: number; y: number }[] {
  const groups = groupRoles(roles);
  const positions: { x: number; y: number }[] = Array(roles.length)
    .fill(null)
    .map(() => ({ x: 50, y: 50 }));

  groups.GOL.forEach((idx) => {
    positions[idx] = { x: 50, y: 88 };
  });

  const xsByCount: Record<number, number[]> = {
    1: [50],
    2: [30, 70],
    3: [20, 50, 80],
  };
  const attXs: Record<number, number[]> = { 1: [50], 2: [32, 68] };

  const place = (
    idxs: number[],
    y: number,
    map: Record<number, number[]>
  ) => {
    if (idxs.length === 0) return;
    const xs = map[Math.min(idxs.length, 3)] ?? map[3] ?? [50];
    idxs.forEach((idx, i) => {
      positions[idx] = { x: xs[i] ?? 50, y };
    });
  };

  place(groups.DEF, 68, xsByCount);
  place(groups.MID, 44, xsByCount);
  place(groups.ATT, 18, attXs);

  return positions;
}

export function computeMatchPercentPositions(
  slotsRoles: (Role | undefined)[]
): { x: number; y: number }[] {
  const groups = groupRoles(slotsRoles);
  const positions: { x: number; y: number }[] = Array(slotsRoles.length)
    .fill(null)
    .map(() => ({ x: 50, y: 50 }));

  const depthX = { GOL: 4, DEF: 20, MID: 32, MEI: 42, ATT: 48 };

  const yByCount = (count: number) => {
    if (count === 1) return [50];
    if (count === 2) return [28, 72];
    return [20, 50, 80];
  };

  groups.GOL.forEach((idx, i) => {
    positions[idx] = { x: depthX.GOL, y: yByCount(groups.GOL.length)[i] ?? 50 };
  });

  const defYs = yByCount(groups.DEF.length);
  groups.DEF.forEach((idx, i) => {
    positions[idx] = { x: depthX.DEF, y: defYs[i] ?? 50 };
  });

  const midYs = yByCount(groups.MID.length);
  groups.MID.forEach((idx, i) => {
    const role = slotsRoles[idx];
    const xVal = role === "MEI" ? depthX.MEI : depthX.MID;
    positions[idx] = { x: xVal, y: midYs[i] ?? 50 };
  });

  const attYs = yByCount(groups.ATT.length);
  groups.ATT.forEach((idx, i) => {
    positions[idx] = { x: depthX.ATT, y: attYs[i] ?? 50 };
  });

  return positions;
}
