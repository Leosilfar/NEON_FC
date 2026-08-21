import { useState } from "react";
import type { GameSettings, PieceType, SettingsTab } from "@/types";
import { DEFAULT_SETTINGS } from "@/constants";
import PiecesTab from "./settings/PiecesTab";
import FieldTab from "./settings/FieldTab";
import TeamsTab from "./settings/TeamsTab";
import AppearanceTab from "./settings/AppearanceTab";

export default function SettingsScreen({
  settings,
  onSave,
  onBack,
}: {
  settings: GameSettings;
  onSave: (s: GameSettings) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<GameSettings>(() =>
    JSON.parse(JSON.stringify(settings))
  );
  const [tab, setTab] = useState<SettingsTab>("pieces");
  const [selPiece, setSelPiece] = useState<PieceType>("triangle");

  const upd = (patch: Partial<GameSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const updPieceColor = (t: PieceType, c: string) =>
    setDraft((d) => ({ ...d, pieceColors: { ...d.pieceColors, [t]: c } }));
  const updAttr = (t: PieceType, k: "speed" | "power" | "rebound", v: number) =>
    setDraft((d) => ({
      ...d,
      attrs: { ...d.attrs, [t]: { ...d.attrs[t], [k]: v } },
    }));
  const updTeam = (team: "teamA" | "teamB", patch: Partial<typeof draft.teamA>) =>
    setDraft((d) => ({ ...d, [team]: { ...d[team], ...patch } }));

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "pieces", label: "PEÇAS" },
    { id: "field", label: "CAMPO" },
    { id: "teams", label: "TIMES" },
    { id: "appearance", label: "APARÊNCIA" },
  ];

  const accentColor = draft.accentColor;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        animation: "slide-in 0.2s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          flexShrink: 0,
          background: "rgba(5,2,15,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(155,79,255,0.15)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.15em",
            padding: "7px 16px",
            borderRadius: 7,
            cursor: "pointer",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(200,220,255,0.4)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#9b4fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(200,220,255,0.4)";
          }}
        >
          ← VOLTAR
        </button>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "rgba(155,79,255,0.5)",
              letterSpacing: "0.35em",
              marginBottom: 2,
            }}
          >
            PAINEL DE CONTROLE
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 900,
              color: accentColor,
              textShadow: `0 0 14px ${accentColor}`,
              letterSpacing: "0.16em",
            }}
          >
            CONFIGURAÇÕES
          </div>
        </div>
        <button
          onClick={() => {
            onSave(draft);
            onBack();
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            padding: "9px 22px",
            borderRadius: 8,
            cursor: "pointer",
            background: "rgba(57,255,90,0.1)",
            border: "1.5px solid #39ff5a",
            color: "#39ff5a",
            textShadow: "0 0 10px #39ff5a",
            boxShadow: "0 0 18px rgba(57,255,90,0.25)",
            transition: "all 0.2s",
          }}
        >
          SALVAR ✓
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 28px 0",
          flexShrink: 0,
          background: "rgba(5,2,15,0.5)",
          borderBottom: "1px solid rgba(155,79,255,0.12)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              padding: "8px 18px 10px",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              transition: "all 0.15s",
              background: tab === t.id ? "rgba(155,79,255,0.1)" : "transparent",
              border: `1px solid ${tab === t.id ? "rgba(155,79,255,0.4)" : "rgba(255,255,255,0.07)"}`,
              borderBottom:
                tab === t.id ? "1px solid rgba(5,2,15,0.5)" : "1px solid rgba(255,255,255,0.07)",
              color: tab === t.id ? accentColor : "rgba(200,220,255,0.35)",
              textShadow: tab === t.id ? `0 0 8px ${accentColor}` : "none",
              marginBottom: tab === t.id ? -1 : 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
        {tab === "pieces" && (
          <PiecesTab
            draft={draft}
            selPiece={selPiece}
            setSelPiece={setSelPiece}
            updPieceColor={updPieceColor}
            updAttr={updAttr}
          />
        )}
        {tab === "field" && <FieldTab draft={draft} accentColor={accentColor} upd={upd} />}
        {tab === "teams" && <TeamsTab draft={draft} updTeam={updTeam} />}
        {tab === "appearance" && (
          <AppearanceTab
            draft={draft}
            accentColor={accentColor}
            upd={upd}
            resetDefaults={() => setDraft(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)))}
          />
        )}
      </div>
    </div>
  );
}
