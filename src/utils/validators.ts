import type { Role } from "../types"

export function countGKs(roles: Role[]): number {
  return roles.filter((r) => r === "GOL").length
}

export function ensureSingleGK(roles: Role[]): Role[] {
  const n = [...roles]

  const gkCount = n.filter((r) => r === "GOL").length

  if (gkCount === 1) return n

  if (gkCount === 0) {
    if (n.length > 0) n[0] = "GOL"

    return n
  }

  let seen = false

  for (let i = 0; i < n.length; i++) {
    if (n[i] === "GOL") {
      if (!seen) seen = true
      else n[i] = "ZAG"
    }
  }

  return n
}

export function assignUniqueGK(roles: Role[], slotIndex: number): Role[] {
  const n = [...roles]

  for (let i = 0; i < n.length; i++) {
    if (n[i] === "GOL" && i !== slotIndex) n[i] = "ZAG"
  }

  if (slotIndex >= 0 && slotIndex < n.length) n[slotIndex] = "GOL"

  return n
}

export function changeRoleKeepingOneGK(
  roles: Role[],

  slotIndex: number,

  newRole: Role,
): Role[] {
  if (newRole === "GOL") return assignUniqueGK(roles, slotIndex)

  const n = [...roles]

  n[slotIndex] = newRole

  if (countGKs(n) === 0) {
    const fallback = slotIndex === 0 ? 1 : 0

    if (fallback < n.length) n[fallback] = "GOL"
    else if (n.length > 0) n[0] = "GOL"
  }

  return n
}

export function isTeamValid(roles: Role[], slotCount: number): boolean {
  return slotCount === 5 && countGKs(roles) === 1
}
