import type { PieceAttrs } from "@/types";

export default function TeamStatsSummary({
  accentColor,
  avg,
}: {
  accentColor: string;
  avg: (k: keyof PieceAttrs) => number;
}) {
  const bars: { key: keyof PieceAttrs; label: string; from: string; to: string }[] = [
    { key: "speed", label: "VEL", from: "#f5e64266", to: "#f5e642" },
    { key: "power", label: "FOR", from: "#ff2d9b66", to: "#ff2d9b" },
    { key: "rebound", label: "REB", from: "#39ff5a66", to: "#39ff5a" },
  ];

  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 8px",
        borderRadius: 8,
        background: `${accentColor}06`,
        border: `1px solid ${accentColor}12`,
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "rgba(200,230,255,0.8)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
          marginRight: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: `${accentColor}88`,
          }}
        >
          ESTATÍSTICAS
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "rgba(200,220,255,0.45)",
            letterSpacing: "0.14em",
          }}
        >
          DO TIME
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {bars.map(({ key, label, from, to }) => (
          <div
            key={key}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <div style={{ fontSize: 9, color: "rgba(200,230,255,0.6)" }}>{label}</div>
            <div
              style={{
                height: 6,
                width: 64,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${avg(key)}%`,
                  background: `linear-gradient(90deg,${from},${to})`,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
