import { NEON_PALETTE } from "@/constants";

export function NeonBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(200,230,255,0.5)",
            letterSpacing: "0.12em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color,
            textShadow: `0 0 6px ${color}`,
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 5,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg,${color}77,${color})`,
            boxShadow: `0 0 8px ${color}`,
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (c: string) => void;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(155,79,255,0.7)",
            letterSpacing: "0.2em",
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {NEON_PALETTE.map((p) => (
          <button
            key={p.hex}
            title={p.name}
            onClick={() => onChange(p.hex)}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              cursor: "pointer",
              border: "none",
              padding: 0,
              background: p.hex,
              boxShadow:
                value === p.hex
                  ? `0 0 0 2px ${p.hex}, 0 0 10px ${p.hex}`
                  : `0 0 4px ${p.hex}55`,
              transform: value === p.hex ? "scale(1.18)" : "scale(1)",
              transition: "all 0.15s",
            }}
          />
        ))}
        <div
          title="Cor personalizada"
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: `0 0 0 1.5px rgba(255,255,255,0.2)`,
            background: `conic-gradient(red,yellow,lime,cyan,blue,magenta,red)`,
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function AttrSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(200,230,255,0.6)",
            letterSpacing: "0.12em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            color,
            textShadow: `0 0 6px ${color}`,
          }}
        >
          {value}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${value}%`,
            background: `linear-gradient(90deg,${color}44,${color}99)`,
            borderRadius: 3,
            pointerEvents: "none",
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={1}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ "--thumb-color": color } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export function NeonToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: value
          ? "rgba(155,79,255,0.18)"
          : "rgba(255,255,255,0.06)",
        boxShadow: value
          ? "0 0 10px rgba(155,79,255,0.45), inset 0 0 10px rgba(155,79,255,0.12)"
          : "none",
        borderColor: value
          ? "rgba(155,79,255,0.5)"
          : "rgba(255,255,255,0.1)",
        borderWidth: 1,
        position: "relative",
        transition: "all 0.2s",
        flexShrink: 0,
      } as React.CSSProperties}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 22 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: value ? "#9b4fff" : "rgba(255,255,255,0.3)",
          boxShadow: value ? "0 0 8px #9b4fff" : "none",
          transition: "all 0.2s",
        }}
      />
    </button>
  );
}
