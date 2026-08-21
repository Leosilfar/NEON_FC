import { useState } from "react";
import type { GameSettings, PieceAttrs, PieceType, Role, SlotPiece } from "@/types";
import { SLOT_LABELS } from "@/constants";
import {
  changeRoleKeepingOneGK,
  countGKs,
  ensureSingleGK,
  isTeamValid,
} from "@/utils/validators";
import FormationSelector from "./FormationSelector";
import TacticalField from "./TacticalField";
import InventoryPanel from "./InventoryPanel";

export default function TeamBuilder({
  onBack,
  onStart,
  settings,
}: {
  onBack: () => void;
  onStart: (s: SlotPiece[]) => void;
  settings: GameSettings;
}) {
  const [slots, setSlots] = useState<(SlotPiece | null)[]>([null, null, null, null, null]);
  const [roles, setRoles] = useState<Role[]>([...SLOT_LABELS]);
  const [selectedType, setSelectedType] = useState<PieceType | null>(null);
  const [nid, setNid] = useState(1);
  const filled = slots.filter(Boolean).length;
  const avg = (k: keyof PieceAttrs) =>
    filled > 0
      ? Math.round(
          slots.filter(Boolean).reduce((s, p) => s + (p ? settings.attrs[p.type][k] : 0), 0) /
            filled
        )
      : 0;
  const drop = (i: number, t: PieceType) => {
    setSlots((p) => {
      const n = [...p];
      n[i] = { type: t, id: nid, role: roles[i] };
      setNid((x) => x + 1);
      return n;
    });
    setSelectedType(null);
  };
  const remove = (i: number) => {
    setSlots((p) => {
      const n = [...p];
      n[i] = null;
      return n;
    });
  };
  const canStart = isTeamValid(roles, filled);
  const ac = settings.accentColor;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(155,79,255,0.15)",
          background: "rgba(5,2,15,0.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.15em",
            padding: "8px 18px",
            borderRadius: 16,
            cursor: "pointer",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(200,220,255,0.4)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = ac;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(200,220,255,0.4)";
          }}
        >
          ← MENU
        </button>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: `${ac}55`,
              letterSpacing: "0.35em",
              marginBottom: 2,
            }}
          >
            FASE 01 · MONTAGEM
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 900,
              color: ac,
              textShadow: `0 0 14px ${ac}`,
              letterSpacing: "0.16em",
            }}
          >
            MONTE SEU TIME
          </div>
        </div>
        <button
          onClick={() => {
            if (countGKs(roles) !== 1) {
              window.alert("O time deve conter exatamente 1 GOL (goleiro).");
              return;
            }
            const filledSlots = slots
              .map((s, i) => (s ? { ...s, role: roles[i] } : null))
              .filter(Boolean) as SlotPiece[];
            onStart(filledSlots);
          }}
          disabled={!canStart}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.16em",
            padding: "9px 22px",
            borderRadius: "var(--rounded-xl)",
            cursor: canStart ? "pointer" : "not-allowed",
            background: canStart ? "rgba(57,255,90,0.1)" : "rgba(57,255,90,0.03)",
            border: `1.5px solid ${canStart ? "#39ff5a" : "rgba(57,255,90,0.2)"}`,
            color: canStart ? "#39ff5a" : "rgba(57,255,90,0.24)",
            textShadow: canStart ? "0 0 10px #39ff5a" : "none",
            boxShadow: canStart ? "0 0 20px rgba(57,255,90,0.28)" : "none",
            transition: "all 0.2s",
            animation: canStart ? "btn-pulse-green 2s ease-in-out infinite" : "none",
          }}
        >
          JOGAR →
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            flex: "0 0 62%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            padding: "18px",
            gap: 18,
            borderRight: "1px solid rgba(155,79,255,0.08)",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flexShrink: 0, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, rgba(255,255,255,0.02), ${ac}10)`,
                    border: `1px solid ${ac}33`,
                    boxShadow: `0 6px 18px ${ac}14,inset 0 0 12px ${ac}06`,
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    fontWeight: 800,
                    color: ac,
                    letterSpacing: "0.18em",
                  }}
                >
                  FORMAÇÃO TÁTICA · {filled}/5
                </div>
              </div>
              <button
                onClick={() => {
                  setSlots([null, null, null, null, null]);
                  setRoles([...SLOT_LABELS]);
                }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "rgba(255,45,155,0.5)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                }}
              >
                LIMPAR
              </button>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 2,
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(filled / 5) * 100}%`,
                  borderRadius: 2,
                  background: `linear-gradient(90deg,${ac}88,${ac})`,
                  boxShadow: `0 0 8px ${ac}`,
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <FormationSelector
              accentColor={ac}
              onSelect={(next) => {
                if (next) setRoles(ensureSingleGK(next));
              }}
            />

            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.02)",
                borderRadius: 2,
                marginBottom: 18,
                overflow: "hidden",
              }}
            />
          </div>

          <TacticalField
            slots={slots}
            roles={roles}
            selectedType={selectedType}
            settings={settings}
            onPlace={drop}
            onRemove={remove}
            onChangeRole={(i, role) => setRoles((prev) => changeRoleKeepingOneGK(prev, i, role))}
          />

          {!canStart && (
            <div
              style={{
                height: 28,
                borderRadius: 8,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                padding: "4px 10px",
                flexShrink: 0,
                background: "rgba(245,230,66,0.03)",
                border: "1px solid rgba(245,230,66,0.12)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "rgba(245,230,66,0.7)",
              }}
            >
              {filled < 5
                ? `⚡ Arraste peças para os ${5 - filled} slot(s) vazios.`
                : "⚡ O time precisa de exatamente 1 GOL."}
            </div>
          )}
        </div>

          <InventoryPanel
            settings={settings}
            avg={avg}
            onPick={(t) => {
              const firstEmpty = slots.findIndex((s) => !s);
              if (firstEmpty !== -1) drop(firstEmpty, t);
              setSelectedType(t);
            }}
          />
      </div>
    </div>
  );
}
