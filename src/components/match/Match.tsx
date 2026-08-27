import { useRef } from "react"

import type { GameSettings, SlotPiece } from "@/types"

import { BG_PRESETS } from "@/constants"

import { getPlayRect, useFieldSize } from "@/utils/canvasHelpers"

import { useMatch } from "@/hooks/useMatch"

import MatchCanvas from "./MatchCanvas"

import MatchHud from "./MatchHud"

import PauseOverlay from "./PauseOverlay"

export default function Match({
  playerSlots,

  onExit,

  settings,
}: {
  playerSlots: SlotPiece[]

  onExit: () => void

  settings: GameSettings
}) {
  const fieldRef = useRef<HTMLDivElement>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { w: fw, h: fh } = useFieldSize(fieldRef)

  const { hud, pauseToggle, restartGame, selectPieceAt } = useMatch(
    playerSlots,

    settings,

    fieldRef,

    canvasRef,

    fw,

    fh,
  )

  const playRect = getPlayRect(fw, fh, false)

  const lineColor = hud.flashColor ?? settings.fieldLineColor

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <MatchCanvas
        fieldRef={fieldRef}
        canvasRef={canvasRef}
        playRect={playRect}
        bgCss={BG_PRESETS[settings.bgPreset].css}
        lineColor={lineColor}
        fieldSurfaceColor={settings.fieldSurfaceColor}
        hintColor={settings.fieldLineColor}
        notification={hud.notification}
        goalColor={hud.goalColor}
        accentColor={settings.accentColor}
        onFieldClick={selectPieceAt}
      />
      <MatchHud settings={settings} hud={hud} onPause={pauseToggle} />
      {hud.paused && (
        <PauseOverlay
          settings={settings}
          hud={hud}
          onContinue={pauseToggle}
          onRestart={() => {
            restartGame()
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}
