import { useContext, useState, useEffect } from "react"
import { GameContext } from "@/context/GameContext"
import type { GameSettings, LogoId } from "@/types"
import { ColorPicker } from "@/components/common"
import { LogoSVG } from "@/components/common/LogoSVG"

export default function TeamATab({
  settings,
  onChange,
}: {
  settings: GameSettings
  onChange: (s: GameSettings) => void
}) {
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A")
  const team = activeTeam === "A" ? settings.teamA : settings.teamB
  const [name, setName] = useState<string>(team.name)
  const [color, setColor] = useState<string>(team.color)
  const [logo, setLogo] = useState<LogoId>(team.logo)

  // Sync when active team changes
  useEffect(() => {
    const t = activeTeam === "A" ? settings.teamA : settings.teamB
    setName(t.name)
    setColor(t.color)
    setLogo(t.logo)
  }, [activeTeam, settings.teamA, settings.teamB])

  // Local logo options
  const LOGO_OPTIONS: { label: string value: LogoId }[] = [
    { label: "Escudo", value: "shield" },
    { label: "Estrela", value: "star" },
    { label: "Relâmpago", value: "lightning" },
    { label: "Coroa", value: "crown" },
    { label: "Hexágono", value: "hexagon" },
    { label: "Alvo", value: "target" },
    { label: "Cruz", value: "cross" },
    { label: "Bolt2", value: "bolt2" },
  ]

  const handleTeamUpdate = (
    partial: Partial<{ name: string color: string logo: LogoId }>,
  ) => {
    const updated = {
      ...(activeTeam === "A" ? settings.teamA : settings.teamB),
      ...partial,
    }
    if (activeTeam === "A") {
      onChange({ ...settings, teamA: updated })
    } else {
      onChange({ ...settings, teamB: updated })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Team selector pills */}
      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setActiveTeam("A")}
          className={
            activeTeam === "A"
              ? "bg-[#ff007f] text-white px-4 py-2 rounded-full"
              : "bg-black/60 text-cyan-400 px-4 py-2 rounded-full"
          }
        >
          TIME A
        </button>
        <button
          onClick={() => setActiveTeam("B")}
          className={
            activeTeam === "B"
              ? "bg-[#ff007f] text-white px-4 py-2 rounded-full"
              : "bg-black/60 text-cyan-400 px-4 py-2 rounded-full"
          }
        >
          TIME B
        </button>
      </div>

      {/* Editing fields */}
      <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">
        NOME DO TIME
      </h3>
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          handleTeamUpdate({ name: e.target.value })
        }}
        className="neon-input w-full"
        placeholder="Digite o nome do time"
      />
      <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">
        COR DO TIME
      </h3>
      <ColorPicker
        value={color}
        onChange={(c) => {
          setColor(c)
          handleTeamUpdate({ color: c })
        }}
      />
      <h3 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">
        EMBLEMA
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {LOGO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setLogo(opt.value)
              handleTeamUpdate({ logo: opt.value })
            }}
            className={`flex flex-col items-center p-2 rounded ${
              logo === opt.value
                ? "border-2 border-[#ff007f] bg-[#ff007f]1a"
                : "border border-gray-600"
            }`}
          >
            <div
              className="text-xl"
              style={{
                color: logo === opt.value ? settings.accentColor : "#e0f7ff",
              }}
            >
              {opt.label}
            </div>
          </button>
        ))}
      </div>

      {/* Central preview card showing both teams */}
      <div className="mt-6 p-4 bg-black/60 border border-cyan-500/30 rounded-xl flex justify-around items-center">
        <div className="flex flex-col items-center">
          <LogoSVG
            id={settings.teamA.logo as LogoId}
            size={60}
            color={settings.teamA.color}
          />
          <div
            className="font-mono text-sm mt-1"
            style={{
              color: settings.teamA.color,
              textShadow: `0 0 8px ${settings.teamA.color}`,
            }}
          >
            {settings.teamA.name}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <LogoSVG
            id={settings.teamB.logo as LogoId}
            size={60}
            color={settings.teamB.color}
          />
          <div
            className="font-mono text-sm mt-1"
            style={{
              color: settings.teamB.color,
              textShadow: `0 0 8px ${settings.teamB.color}`,
            }}
          >
            {settings.teamB.name}
          </div>
        </div>
      </div>
    </div>
  )
}
