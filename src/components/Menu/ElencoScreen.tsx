import { useContext, useState } from "react";
import { GameContext } from "@/context/GameContext";
import { FORMATIONS } from "@/constants/formations";
import type { GameSettings, SlotPiece } from "@/types";

export default function ElencoScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useContext(GameContext)!;
  const [selectedFormation, setSelectedFormation] = useState<string>(settings.teamA.name || "4-3-3"); // default or from settings

  const handleSave = () => {
    // Here we could save the formation preference, but for now we just go back
    // In a real app, we might update settings with formation choice
    onBack();
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        backgroundImage: "url('/assets/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          background: "rgba(5,2,15,0.7)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(155,79,255,0.1)",
        }}
      >
        <button onClick={onBack} style={backButtonStyle}>
          ← VOLTAR
        </button>
        <div>
          <h2 style={elencoTitleStyle}>MEU ELENCO</h2>
        </div>
        <button onClick={handleSave} style={saveButtonStyle}>
          SALVAR
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={formationSectionStyle}>
          <h3 style={sectionTitleStyle}>Formação Padrão</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {FORMATIONS.map((formation) => (
              <button
                key={formation.name}
                onClick={() => setSelectedFormation(formation.name)}
                style={formationButtonStyle(selectedFormation === formation.name, settings.accentColor)}
              >
                {formation.name}
                <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{/* description not available */}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={previewSectionStyle}>
          <h3 style={sectionTitleStyle}>Prévisualização</h3>
          {/* Simple preview of formation - just show the name for now */}
          <div style={previewBoxStyle}>
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{selectedFormation}</div>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>{selectedFormation}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper styles
const backButtonStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.9rem",
  letterSpacing: "0.15em",
  padding: "0.5rem 1rem",
  borderRadius: "6px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(200,220,255,0.4)",
  transition: "all 0.2s",
};

const elencoTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 900,
  letterSpacing: "0.1em",
  color: "#e0f7ff",
};

const saveButtonStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "0.9rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  padding: "0.5rem 1rem",
  borderRadius: "6px",
  cursor: "pointer",
  background: "rgba(57,255,90,0.1)",
  border: "1.5px solid #39ff5a",
  color: "#39ff5a",
  textShadow: "0 0 10px #39ff5a",
  boxShadow: "0 0 18px rgba(57,255,90,0.25)",
  transition: "all 0.2s",
};

const formationSectionStyle = {
  marginBottom: "2rem",
};

const sectionTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.1rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "#e0f7ff",
  marginBottom: "0.5rem",
};

const formationButtonStyle = (active: boolean, accentColor: string) => ({
  flex: 1,
  minWidth: "80px",
  padding: "0.75rem",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
  background: active ? `${accentColor}20` : "rgba(255,255,255,0.03)",
  border: active ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.1)",
color: active ? accentColor : "#e0f7ff",
  fontFamily: "var(--font-display)",
  fontSize: "0.9rem",
  fontWeight: 600,
  letterSpacing: "0.05em",
  "&:hover": {
    background: active ? `${accentColor}30` : "rgba(255,255,255,0.05)",
    transform: "translateY(-2px)",
  },
});

const previewSectionStyle = {
  borderTop: "1px solid rgba(155,79,255,0.1)",
  paddingTop: "1.5rem",
};

const previewBoxStyle = {
  padding: "1.5rem",
  borderRadius: "10px",
  background: "rgba(0,0,0,0.3)",
border: "1px solid rgba(155,79,255,0.2)",
};