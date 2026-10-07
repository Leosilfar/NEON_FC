import { useContext } from "react"
import { GameContext } from "@/context/GameContext"

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const { settings } = useContext(GameContext)!

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        backgroundImage: "url('./background.png')",
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
          <h2 style={statsTitleStyle}>ESTATÍSTICAS</h2>
        </div>
        {/* Placeholder for future stats button */}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={placeholderBoxStyle}>
          <h3 style={placeholderTitleStyle}>Em Breve</h3>
          <p style={placeholderTextStyle}>
            A tela de estatísticas está em desenvolvimento. Brevemente você
            poderá acompanhar seus desempenho, histórico de partidas e muito
            mais.
          </p>
        </div>
      </div>
    </div>
  )
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
}

const statsTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 900,
  letterSpacing: "0.1em",
  color: "#e0f7ff",
}

const placeholderBoxStyle = {
  padding: "3rem",
  borderRadius: "16px",
  background: "rgba(0,0,0,0.4)",
  border: "2px solid rgba(155,79,255,0.2)",
  maxWidth: "500px",
  margin: "0 auto",
}

const placeholderTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "0.08em",
  color: "#00f5ff",
  marginBottom: "1rem",
}

const placeholderTextStyle = {
  fontFamily: "var(--font-body)",
  fontSize: "1.1rem",
  lineHeight: 1.6,
  color: "rgba(200,220,255,0.8)",
}
