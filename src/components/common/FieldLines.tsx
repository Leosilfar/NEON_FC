import { CORNER_RADIUS, VW } from "@/constants/physics"

export function FieldLines({
  w,

  h,

  color,
}: {
  w: number

  h: number

  color: string
}) {
  if (w < 10 || h < 10) return null

  const lw = 1.4

  const gkW = w * 0.065

  const gkH = h * 0.24

  const penW = w * 0.155

  const penH = h * 0.435

  const cr = (CORNER_RADIUS / VW) * w

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: "absolute",

        inset: 0,

        pointerEvents: "none",

        filter: `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 12px ${color}55)`,
      }}
    >
      <rect
        x={2}
        y={2}
        width={w - 4}
        height={h - 4}
        rx={cr}
        ry={cr}
        fill={`${color}08`}
        stroke={color}
        strokeWidth={lw}
      />
      <line
        x1={w / 2}
        y1={2}
        x2={w / 2}
        y2={h - 2}
        stroke={color}
        strokeWidth={lw}
      />
      <circle
        cx={w / 2}
        cy={h / 2}
        r={h * 0.18}
        fill="none"
        stroke={color}
        strokeWidth={lw}
      />
      <circle cx={w / 2} cy={h / 2} r={3.5} fill={color} />
      <rect
        x={2}
        y={(h - gkH) / 2}
        width={gkW}
        height={gkH}
        fill="none"
        stroke={color}
        strokeWidth={lw}
      />
      <rect
        x={2}
        y={(h - penH) / 2}
        width={penW}
        height={penH}
        fill="none"
        stroke={color}
        strokeWidth={lw}
      />
      <rect
        x={-8}
        y={(h - gkH * 0.48) / 2}
        width={10}
        height={gkH * 0.48}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={lw}
      />
      <rect
        x={w - 2 - gkW}
        y={(h - gkH) / 2}
        width={gkW}
        height={gkH}
        fill="none"
        stroke={color}
        strokeWidth={lw}
      />
      <rect
        x={w - 2 - penW}
        y={(h - penH) / 2}
        width={penW}
        height={penH}
        fill="none"
        stroke={color}
        strokeWidth={lw}
      />
      <rect
        x={w - 2}
        y={(h - gkH * 0.48) / 2}
        width={10}
        height={gkH * 0.48}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={lw}
      />
      <circle cx={penW * 0.74} cy={h / 2} r={2.5} fill={color} />
      <circle cx={w - penW * 0.74} cy={h / 2} r={2.5} fill={color} />
    </svg>
  )
}
