import { ALL_LOGOS } from "@/constants";
import type { GameSettings } from "@/types";
import { ColorPicker, LogoSVG } from "@/components/common";

export default function TeamsTab({
  draft,
  updTeam,
}: {
  draft: GameSettings;
  updTeam: (team: "teamA" | "teamB", patch: Partial<GameSettings["teamA"]>) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {(["teamA", "teamB"] as const).map((teamKey) => {
        const team = draft[teamKey];
        const label = teamKey === "teamA" ? "TIME A" : "TIME B";
        return (
          <div
            key={teamKey}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              padding: "20px 20px",
              borderRadius: 12,
              background: `${team.color}08`,
              border: `1px solid ${team.color}33`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 700,
                color: team.color,
                textShadow: `0 0 10px ${team.color}`,
                letterSpacing: "0.2em",
              }}
            >
              {label}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "rgba(155,79,255,0.6)",
                  letterSpacing: "0.2em",
                }}
              >
                NOME DO TIME
              </div>
              <input
                type="text"
                className="neon-input"
                value={team.name}
                maxLength={12}
                onChange={(e) => updTeam(teamKey, { name: e.target.value.toUpperCase() })}
                style={{ "--neon-line-color": team.color } as React.CSSProperties}
              />
            </div>

            <ColorPicker
              label="COR DO TIME"
              value={team.color}
              onChange={(c) => updTeam(teamKey, { color: c })}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "rgba(155,79,255,0.6)",
                  letterSpacing: "0.2em",
                }}
              >
                EMBLEMA
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {ALL_LOGOS.map((logo) => (
                  <button
                    key={logo}
                    onClick={() => updTeam(teamKey, { logo })}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: team.logo === logo ? `${team.color}18` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${team.logo === logo ? team.color + "88" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: team.logo === logo ? `0 0 10px ${team.color}44` : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <LogoSVG
                      id={logo}
                      size={26}
                      color={team.logo === logo ? team.color : "rgba(200,220,255,0.3)"}
                    />
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${team.color}22`,
                }}
              >
                <LogoSVG id={team.logo} size={32} color={team.color} />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: team.color,
                      textShadow: `0 0 8px ${team.color}`,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {team.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "rgba(200,220,255,0.35)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    PREVIEW DO HUD
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
