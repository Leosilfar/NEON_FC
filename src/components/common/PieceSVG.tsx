import type { PieceType, Team, GlowLevel } from "@/types";

export function pentagonPts(cx: number, cy: number, r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

export function PieceSVG({
  type,
  size = 28,
  selected = false,
  color,
  team,
  glowLevel = "medium",
}: {
  type: PieceType;
  size?: number;
  selected?: boolean;
  color: string;
  team?: Team;
  glowLevel?: GlowLevel;
}) {
  const c = size / 2;
  const sw = selected ? 2.8 : 1.8;
  const glowPx = glowLevel === "low" ? 3 : glowLevel === "high" ? 10 : 5;
  const glowPx2 = glowLevel === "low" ? 6 : glowLevel === "high" ? 22 : 14;
  const glow = selected
    ? `drop-shadow(0 0 ${glowPx + 2}px ${color}) drop-shadow(0 0 ${glowPx2 + 4}px ${color})`
    : `drop-shadow(0 0 ${glowPx}px ${color})`;
  const fill = `${color}18`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        filter: glow,
        overflow: "visible",
        display: "block",
        flexShrink: 0,
      }}
    >
      {type === "triangle" && (
        <polygon
          points={`${c},3 ${size - 3},${size - 3} 3,${size - 3}`}
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}
      {type === "square" && (
        <rect
          x={3}
          y={3}
          width={size - 6}
          height={size - 6}
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          rx={2}
        />
      )}
      {type === "circle" && (
        <circle
          cx={c}
          cy={c}
          r={c - 3}
          fill={fill}
          stroke={color}
          strokeWidth={sw}
        />
      )}
      {type === "diamond" && (
        <polygon
          points={`${c},3 ${size - 3},${c} ${c},${size - 3} 3,${c}`}
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}
      {type === "pentagon" && (
        <polygon
          points={pentagonPts(c, c, c - 3)}
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}
      {type === "line" && (
        <>
          <rect
            x={2}
            y={c - 5}
            width={size - 4}
            height={10}
            fill={fill}
            stroke={color}
            strokeWidth={sw}
            rx={4}
          />
          <line
            x1={c}
            y1={c - 2}
            x2={c}
            y2={c + 2}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
          />
        </>
      )}
      {team && (
        <circle
          cx={c}
          cy={c}
          r={3.2}
          fill={team === "A" ? "#00f5ff" : "#ff2d9b"}
          opacity={0.9}
        />
      )}
      {selected && (
        <>
          <circle
            cx={c}
            cy={c}
            r={c - 1}
            fill="none"
            stroke={color}
            strokeWidth={1.2}
            strokeDasharray="4 3"
            opacity={0.7}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${c} ${c}`}
              to={`360 ${c} ${c}`}
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={c}
            cy={c}
            r={c + 3}
            fill="none"
            stroke={color}
            strokeWidth={0.6}
            opacity={0.3}
          />
        </>
      )}
    </svg>
  );
}
