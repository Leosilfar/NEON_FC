import { useState, useContext, useMemo } from "react"

import type {
  GameSettings,
  PieceAttrs,
  PieceType,
  Role,
  SlotPiece,
} from "@/types"

import { FORMATION_PRESETS } from "@/constants"
import { GameContext } from "@/context/GameContext"
import { makeGS } from "@/engine/state"

import { changeRoleKeepingOneGK, isTeamValid } from "@/utils/validators"

import TacticalField from "./TacticalField"
import InventoryPanel from "./InventoryPanel"
import TeamStatsSummary from "./TeamStatsSummary"

export default function TeamBuilder({
  onBack,
  settings,
}: {
  onBack: () => void
  settings: GameSettings
}) {
  const { playerSlots, updatePlayerSlots } = useContext(GameContext)!
  const savedRoles = playerSlots.map((slot) => slot.role ?? "MEI")
  const savedFormation = FORMATION_PRESETS.find(
    (formation) => formation.roles?.join(",") === savedRoles.join(","),
  )
  const [selectedFormation, setSelectedFormation] = useState<string>(
    savedFormation?.name ?? "Customizada",
  )
  const [roles, setRoles] = useState<Role[]>(() =>
    savedRoles.length === 5
      ? savedRoles
      : (FORMATION_PRESETS[0].roles ?? ["GOL", "ZAG", "MEI", "ATA", "ATA"]),
  )
  const [slots, setSlots] = useState<(SlotPiece | null)[]>(() =>
    playerSlots.length === 5
      ? playerSlots.map((slot) => ({ ...slot }))
      : Array(5).fill(null),
  )
  const [selectedType, setSelectedType] = useState<PieceType | null>(null)
  const [nid, setNid] = useState(1)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)

  const currentSlots = useMemo<SlotPiece[]>(
    () =>
      roles.map((role, i) => {
        const slot = slots[i]
        return slot ? { ...slot, role } : { id: i + 1, type: "circle", role }
      }),
    [roles, slots],
  )

  const opponentPreviewPieces = useMemo(
    () => makeGS(currentSlots).pieces.filter((p) => p.team === "B"),
    [currentSlots],
  )

  const selectFormation = (formationName: string) => {
    setSelectedFormation(formationName)
    if (formationName === "Customizada") return

    const formation = FORMATION_PRESETS.find((p) => p.name === formationName)
    const newRoles = formation?.roles ?? ["GOL", "ZAG", "MEI", "ATA", "ATA"]
    setRoles(newRoles)
    setSlots((prev) => {
      const next = Array(newRoles.length).fill(null)
      prev.forEach((s, i) => {
        if (s && i < newRoles.length) next[i] = s
      })
      return next
    })
  }

  const clearTeam = () => {
    setSelectedFormation("Customizada")
    setSlots(Array(roles.length).fill(null))
    setSelectedType(null)
    setPendingSlot(null)
  }

  const filled = slots.filter(Boolean).length

  const avg = (k: keyof PieceAttrs) =>
    filled > 0
      ? Math.round(
          slots
            .filter(Boolean)
            .reduce((s, p) => s + (p ? settings.attrs[p.type][k] : 0), 0) /
            filled,
        )
      : 0

  const drop = (i: number, t: PieceType) => {
    setSlots((p) => {
      const n = [...p]
      n[i] = { type: t, id: nid, role: roles[i] }
      setNid((x) => x + 1)
      return n
    })
    setSelectedType(null)
    setPendingSlot(null)
  }

  const remove = (i: number) => {
    setSlots((p) => {
      const n = [...p]
      n[i] = null
      return n
    })
  }

  const canStart = isTeamValid(roles, filled)
  const ac = settings.accentColor

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "rgba(5,2,15,0.9)",
      }}
    >
      {/* Header – neon cyan bar like EditScreen */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderRadius: "24px",
          margin: "12px",
          background: ac,
          color: "#000",
          fontWeight: 900,
          fontFamily: "var(--font-display)",
          boxShadow: `0 0 30px ${ac}`,
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.15em",
            padding: "6px 12px",
            borderRadius: 9999,
            cursor: "pointer",
            background: "#ff007f",
            border: "none",
            color: "#fff",
            boxShadow: "0 0 15px #ff007f",
            transition: "all 0.2s",
          }}
        >
          ← VOLTAR
        </button>

        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 18, letterSpacing: "0.1em" }}>MEU ELENCO</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.35em",
              marginTop: 2,
              opacity: 0.7,
            }}
          >
            FASE 01 · MONTAGEM
          </div>
        </div>

        <button
          onClick={() => {
            updatePlayerSlots(currentSlots)
            onBack()
          }}
          disabled={!canStart}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            padding: "8px 18px",
            borderRadius: 9999,
            cursor: canStart ? "pointer" : "not-allowed",
            background: canStart ? "#ff007f" : "rgba(255,0,127,0.2)",
            border: "none",
            color: canStart ? "#fff" : "rgba(255,0,127,0.5)",
            boxShadow: canStart ? "0 0 20px #ff007f" : "none",
            transition: "all 0.2s",
          }}
        >
          SALVAR
        </button>
      </header>

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          gap: "16px",
          padding: "16px",
        }}
      >
        {/* Left column – Tactical field */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minWidth: 0,
          }}
        >
          {/* Formation selector as neon pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            {FORMATION_PRESETS.map((f) => (
              <button
                key={f.name}
                onClick={() => selectFormation(f.name)}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "6px 12px",
                  borderRadius: 9999,
                  cursor: "pointer",
                  background:
                    selectedFormation === f.name
                      ? `${ac}33`
                      : "rgba(0,0,0,0.5)",
                  border: `1px solid ${
                    selectedFormation === f.name ? ac : `${ac}44`
                  }`,
                  color: selectedFormation === f.name ? ac : "#fff",
                  textShadow:
                    selectedFormation === f.name ? `0 0 8px ${ac}` : "none",
                  transition: "all 0.2s",
                }}
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={clearTeam}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                padding: "6px 12px",
                borderRadius: 9999,
                background: "rgba(255,45,155,0.2)",
                border: "1px solid rgba(255,45,155,0.5)",
                color: "#ff66cc",
                cursor: "pointer",
              }}
            >
              LIMPAR
            </button>
          </div>

          {/* Tactical field fills remaining height */}
          <TacticalField
            slots={slots}
            roles={roles}
            selectedType={selectedType}
            settings={settings}
            onPlace={drop}
            onRemove={remove}
            onChangeRole={(i, role) =>
              setRoles((prev) => changeRoleKeepingOneGK(prev, i, role))
            }
            onSlotClick={setPendingSlot}
          />
        </div>

        {/* Right column – Inventory + Stats */}
        <div
          style={{
            width: "340px",
            flexShrink: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{ flex: 1, overflowY: "auto", padding: "0 4px 12px 4px" }}
          >
            <InventoryPanel
              settings={settings}
              avg={avg}
              opponentPieces={opponentPreviewPieces}
              canPlacePiece={
                pendingSlot !== null || slots.some((slot) => slot === null)
              }
              onPick={(t) => {
                const target = pendingSlot ?? slots.findIndex((s) => !s)
                if (target !== -1) {
                  drop(target, t)
                  return
                }
                setSelectedType(t)
              }}
            />
          </div>
          <TeamStatsSummary accentColor={ac} avg={avg} />
        </div>
      </div>

      {/* Validation hint */}
      {!canStart && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(245,230,66,0.08)",
            border: "1px solid rgba(245,230,66,0.2)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(245,230,66,0.9)",
            margin: "0 16px 16px 16px",
          }}
        >
          {filled < roles.length
            ? `⚡ Preencha os ${roles.length - filled} slot(s) vazios.`
            : "⚡ O time precisa de exatamente 1 GOL."}
        </div>
      )}
    </div>
  )
}
