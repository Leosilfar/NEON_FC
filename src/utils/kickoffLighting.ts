const LIGHT_RAMP_DURATION = 2.7
const FINAL_FLICKER: readonly [number, number][] = [
  [0, 1],
  [0.04, 0.3],
  [0.09, 0.96],
  [0.13, 0.42],
  [0.18, 1],
  [0.22, 0.68],
  [0.26, 1],
]

export function getKickoffLightLevel(elapsed: number) {
  if (elapsed >= LIGHT_RAMP_DURATION + 0.26) return 1

  if (elapsed > LIGHT_RAMP_DURATION) {
    const flickerTime = elapsed - LIGHT_RAMP_DURATION

    for (let index = 1; index < FINAL_FLICKER.length; index++) {
      const [endTime, endLevel] = FINAL_FLICKER[index]
      if (flickerTime > endTime) continue

      const [startTime, startLevel] = FINAL_FLICKER[index - 1]
      const progress = (flickerTime - startTime) / (endTime - startTime)
      const easedProgress = progress * progress * (3 - 2 * progress)

      return startLevel + (endLevel - startLevel) * easedProgress
    }
  }

  const progress = Math.max(0, Math.min(1, elapsed / LIGHT_RAMP_DURATION))

  return progress * progress * (3 - 2 * progress)
}
