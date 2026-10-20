# NEON FC — Agent Instructions

React + Vite + TypeScript project. Game logic runs entirely in Canvas 2D; React handles only menus and HUD.

## Development Server

Run `pnpm dev` to start Vite on port 5173. Hot reload is active for all source files.

## Project Structure

- `src/engine/simulation.ts` — main game loop step, kickoff, goals, particles
- `src/engine/ai.ts` — opponent AI per role
- `src/engine/physics.ts` — SAT collision, polygon movement
- `src/engine/state.ts` — `makeGS()` builds the initial match state
- `src/hooks/useMatch.ts` — RAF loop, integrates engine with React
- `src/hooks/useMatchInput.ts` — keyboard and touch input
- `src/components/match/` — canvas render and HUD overlay
- `src/components/screens/` — game screens (menu, roster, match)
- `src/utils/tactics.ts` — formations, home/away canvas coordinates
- `src/utils/audio.ts` — SFX and music via Howler
- `src/constants/physics.ts` — field dimensions (VW, VH), fixed timestep
- `src/constants/settings.ts` — default settings, neon palette, controls
- `src/types/` — TypeScript domain types (GS, Piece, Team, etc.)
- `electron/main.cjs` — Electron main process (desktop only)

## Field Dimensions

`VW = 1250`, `VH = 580` (pixels, arena with walls). These are imported as constants throughout the engine — treat them as the single source of truth for field size.

## Code Style

- Double quotes for strings with apostrophes
- Export components as default exports
- Engine files use plain functions, no classes
- All domain types in `src/types/`; avoid inline type definitions in engine files

## Commands

```bash
pnpm typecheck     # run before any commit
pnpm build         # verify the build passes
```
