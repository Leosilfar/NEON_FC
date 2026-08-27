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

  const toRad = (d: number) => (d * Math.PI) / 180

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
      {[
        [2, 2, 0, 90],

        [w - 2, 2, 90, 180],

        [w - 2, h - 2, 180, 270],

        [2, h - 2, 270, 360],
      ].map(([cx, cy, a1, a2], i) => (
        <path
          key={i}
          d={`M ${cx + 14 * Math.cos(toRad(a1 as number))} ${cy + 14 * Math.sin(toRad(a1 as number))} A 14 14 0 0 1 ${cx + 14 * Math.cos(toRad(a2 as number))} ${cy + 14 * Math.sin(toRad(a2 as number))}`}
          fill="none"
          stroke={color}
          strokeWidth={lw}
        />
      ))}
    </svg>
  )
}
