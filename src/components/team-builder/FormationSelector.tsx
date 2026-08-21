import { FORMATION_PRESETS } from "@/constants";
import type { Role } from "@/types";

export default function FormationSelector({
  accentColor,
  onSelect,
}: {
  accentColor: string;
  onSelect: (roles: Role[] | null) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, marginTop: 6 }}>
      {FORMATION_PRESETS.map((p) => (
        <button
          key={p.name}
          onClick={() => onSelect(p.roles)}
          style={{
            padding: "6px 10px",
            borderRadius: "var(--rounded-lg)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            background: p.roles ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
            color: accentColor,
          }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
