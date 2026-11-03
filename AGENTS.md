# NEON FC — Agent Instructions

React + Vite + TypeScript project. Game logic runs entirely in Canvas 2D; React handles only menus and HUD.

## Development Server

Run `pnpm dev` to start Vite on port 5173. Hot reload is active for all source files.

## Project Structure

- `src/engine/simulation.ts` — coordinates the fixed-timestep match phases
- `src/engine/collision.ts` — resolves piece, ball, and wall contacts
- `src/engine/combat/kicks.ts` — applies player and AI kicks
- `src/engine/ai.ts` — public entry point and AI orchestration
- `src/engine/ai/strategy/` — strategy context, team assignments, targets, and actions
- `src/engine/ai/goalkeeper.ts` — goalkeeper positioning and ball prediction
- `src/engine/ai/positioning.ts` — formation anchors and field positioning
- `src/engine/physics.ts` — geometry, SAT contacts, and field bounds
- `src/engine/state.ts` — `makeGS()` builds the initial match state
- `src/hooks/useMatch.ts` — RAF loop, integrates engine with React
- `src/hooks/useMatchInput.ts` — keyboard and touch input
- `src/components/match/` — canvas render and HUD overlay
- `src/components/Menu/` — menu screens and settings
- `src/components/Menu/settings/` — settings types, translations, and tab panels
- `src/components/match/` — match canvas, rendering, and HUD
- `src/utils/tactics.ts` — formations, home/away canvas coordinates
- `src/utils/audio.ts` — SFX and music via Howler
- `src/engine/rules/matchFlow.ts` — stable exports for goals and kickoffs
- `src/engine/rules/kickoff/` — kickoff planning, steering, and regroup phases
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
- All shared domain types in `src/types/`; avoid duplicating domain types across engine modules

## Commands

```bash
pnpm typecheck     # run before any commit
pnpm build         # verify the build passes
```
