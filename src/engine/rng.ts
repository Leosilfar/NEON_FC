/**
 * Seeded pseudo-random number generator for the match engine.
 *
 * Algorithm: Mulberry32 — fast, seedable, good statistical properties,
 * zero dependencies.  A single uint32 holds the full state.
 *
 * Usage:
 *   const seed = createSeed()          // or pass an explicit uint32
 *   let state = seed
 *   const [next, value] = rng(state)   // value in [0, 1)
 *   state = next
 *
 * Or use the convenience wrapper on GS:
 *   gs.rngState = rngNext(gs.rngState)  // mutates gs.rngState, returns float
 */

/**
 * Advance the RNG state by one step.
 * Returns [nextState, value] where value is in [0, 1).
 */
export function rng(state: number): [number, number] {
  // Mulberry32 step — operates on unsigned 32-bit integers
  let s = (state + 0x6d2b79f5) | 0
  s = Math.imul(s ^ (s >>> 15), s | 1)
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
  const value = ((s ^ (s >>> 14)) >>> 0) / 4294967296
  return [s, value]
}

/**
 * Mutate gs.rngState in place and return a float in [0, 1).
 * This is the primary call site inside the engine — callers pass `gs` and
 * never touch `rngState` directly.
 */
export function roll(gs: { rngState: number }): number {
  const [next, value] = rng(gs.rngState)
  gs.rngState = next
  return value
}

/**
 * Derive a reproducible uint32 seed from a match identifier string.
 * Uses the same djb2 hash used in many game engines.
 */
export function seedFromString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0
  }
  return h || 1 // 0 is a degenerate seed for Mulberry32
}

/**
 * Create a seed suitable for a new match.  Pass an explicit value to make
 * the match reproducible (testing, replay); omit to get a time-based seed.
 */
export function createSeed(explicit?: number): number {
  if (explicit !== undefined) return explicit >>> 0 || 1
  // Mix Date.now() with a random word so two matches started in the same
  // millisecond still get different seeds.
  return seedFromString(`${Date.now()}-${Math.random()}`)
}
