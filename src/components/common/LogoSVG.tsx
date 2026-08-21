import type { LogoId } from "@/types";

export function LogoSVG({
  id,
  size = 28,
  color = "#00f5ff",
}: {
  id: LogoId;
  size?: number;
  color?: string;
}) {
  const c = size / 2;
  const r = size * 0.42;
  const glow = `drop-shadow(0 0 4px ${color})`;
  const props = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };

  switch (id) {
    case "shield": {
      const w = size * 0.7;
      const h = size * 0.82;
      const x0 = c - w / 2;
      const y0 = size * 0.1;
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <path
            d={`M ${c} ${y0} L ${x0 + w} ${y0 + h * 0.28} L ${x0 + w} ${y0 + h * 0.52} Q ${x0 + w} ${y0 + h} ${c} ${y0 + h} Q ${x0} ${y0 + h} ${x0} ${y0 + h * 0.52} L ${x0} ${y0 + h * 0.28} Z`}
            {...props}
            fill={`${color}22`}
          />
        </svg>
      );
    }
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 - 90) * (Math.PI / 180);
        const rr = i % 2 === 0 ? r : r * 0.45;
        return `${c + rr * Math.cos(a)},${c + rr * Math.sin(a)}`;
      }).join(" ");
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <polygon points={pts} {...props} fill={`${color}22`} />
        </svg>
      );
    }
    case "lightning": {
      const s = size * 0.14;
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <polygon
            points={`${c - s},${size * 0.1} ${c + s * 1.4},${c - s * 0.5} ${c},${c} ${c + s * 1.8},${size * 0.9} ${c - s * 1.4},${c + s * 0.5} ${c},${c}`}
            {...props}
            fill={`${color}22`}
          />
        </svg>
      );
    }
    case "crown": {
      const bY = size * 0.7;
      const tY = size * 0.2;
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <path
            d={`M ${size * 0.12} ${bY} L ${size * 0.12} ${tY * 0.9} L ${c} ${bY * 0.55} L ${size * 0.88} ${tY * 0.9} L ${size * 0.88} ${bY} Z`}
            {...props}
            fill={`${color}22`}
          />
          <circle cx={size * 0.12} cy={tY * 0.9} r={2.5} fill={color} />
          <circle cx={c} cy={bY * 0.55} r={2.5} fill={color} />
          <circle cx={size * 0.88} cy={tY * 0.9} r={2.5} fill={color} />
        </svg>
      );
    }
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 90) * (Math.PI / 180);
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
      }).join(" ");
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <polygon points={pts} {...props} fill={`${color}22`} />
        </svg>
      );
    }
    case "target":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <circle cx={c} cy={c} r={r} {...props} fill="none" />
          <circle cx={c} cy={c} r={r * 0.58} {...props} fill="none" />
          <circle cx={c} cy={c} r={2.5} fill={color} />
          <line
            x1={c - r}
            y1={c}
            x2={c + r}
            y2={c}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
          />
          <line
            x1={c}
            y1={c - r}
            x2={c}
            y2={c + r}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
          />
        </svg>
      );
    case "cross": {
      const t = size * 0.15;
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <path
            d={`M ${c - t} ${size * 0.1} H ${c + t} V ${c - t} H ${size * 0.9} V ${c + t} H ${c + t} V ${size * 0.9} H ${c - t} V ${c + t} H ${size * 0.1} V ${c - t} H ${c - t} Z`}
            {...props}
            fill={`${color}22`}
          />
        </svg>
      );
    }
    case "bolt2":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: glow }}
        >
          <path
            d={`M ${size * 0.6} ${size * 0.08} L ${size * 0.22} ${size * 0.52} L ${size * 0.48} ${size * 0.52} L ${size * 0.4} ${size * 0.92} L ${size * 0.78} ${size * 0.48} L ${size * 0.52} ${size * 0.48} Z`}
            {...props}
            fill={`${color}22`}
          />
        </svg>
      );
  }
  return null;
}
