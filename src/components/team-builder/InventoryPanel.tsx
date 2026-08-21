import { ALL_PIECE_TYPES, PIECE_LABEL, PIECE_ROLE, TEAM_B_PRESET } from "@/constants";
import type { GameSettings, PieceType } from "@/types";
import { LogoSVG, PieceSVG } from "@/components/common";
import TeamStatsSummary from "./TeamStatsSummary";
import type { PieceAttrs } from "@/types";

export default function InventoryPanel({
  settings,
  avg,
  onPick,
}: {
  settings: GameSettings;
  avg: (k: keyof PieceAttrs) => number;
  onPick: (type: PieceType) => void;
}) {
  const ac = settings.accentColor;

  return (
    <div
      style={{
        width: 320,
        padding: "12px",
        overflowY: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: `linear-gradient(90deg, rgba(255,255,255,0.02), ${ac}06)`,
            border: `1px solid ${ac}22`,
            boxShadow: `0 8px 14px ${ac}06`,
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 800,
            color: ac,
            letterSpacing: "0.18em",
          }}
        >
          INVENTÁRIO
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {ALL_PIECE_TYPES.map((t) => {
          const col = settings.pieceColors[t];
          return (
            <div
              key={t}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("pieceType", t)}
              onClick={() => onPick(t)}
              style={{
                padding: "6px 8px",
                borderRadius: 10,
                background: `${col}06`,
                border: `1px solid ${col}18`,
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = `${col}12`;
                el.style.boxShadow = `0 0 10px ${col}30`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = `${col}06`;
                el.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <PieceSVG type={t} size={22} color={col} glowLevel={settings.glowIntensity} />
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      fontWeight: 800,
                      color: col,
                      letterSpacing: "0.08em",
                      textShadow: `0 0 6px ${col}`,
                      textTransform: "uppercase",
                    }}
                  >
                    {PIECE_LABEL[t]}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 9,
                      color: "rgba(200,220,255,0.38)",
                    }}
                  >
                    {PIECE_ROLE[t]}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                  {(
                    [
                      { l: "VEL", v: settings.attrs[t].speed, c: "#f5e642" },
                      { l: "FOR", v: settings.attrs[t].power, c: "#ff2d9b" },
                      { l: "REB", v: settings.attrs[t].rebound, c: "#39ff5a" },
                    ] as const
                  ).map(({ l, v, c }) => (
                    <div
                      key={l}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        padding: "2px 4px",
                        borderRadius: 999,
                        background: `${c}12`,
                        border: `1px solid ${c}40`,
                        color: c,
                        textShadow: `0 0 4px ${c}`,
                      }}
                    >
                      {l} {v}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(77,214,255,0.12),transparent)",
        }}
      />

      <TeamStatsSummary accentColor={ac} avg={avg} />

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid " + settings.teamB.color + "14",
            boxShadow: "0 8px 22px " + settings.teamB.color + "06",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background:
                "linear-gradient(90deg, " +
                settings.teamB.color +
                "08, rgba(255,255,255,0.02))",
              border: "1px solid " + settings.teamB.color + "22",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 800,
              color: settings.teamB.color,
            }}
          >
            TIME ADVERSÁRIO · {settings.teamB.name}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <LogoSVG id={settings.teamB.logo} size={32} color={settings.teamB.color} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {TEAM_B_PRESET.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      border: "1.4px solid " + settings.pieceColors[p.type] + "44",
                      background: settings.pieceColors[p.type] + "0a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PieceSVG
                      type={p.type}
                      size={20}
                      color={settings.pieceColors[p.type]}
                      team="B"
                      glowLevel={settings.glowIntensity}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
