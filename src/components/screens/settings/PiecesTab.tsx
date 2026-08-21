import { ALL_PIECE_TYPES, PIECE_LABEL, PIECE_ROLE } from "@/constants";
import type { GameSettings, PieceType } from "@/types";
import { AttrSlider, ColorPicker, PieceSVG } from "@/components/common";

export default function PiecesTab({
  draft,
  selPiece,
  setSelPiece,
  updPieceColor,
  updAttr,
}: {
  draft: GameSettings;
  selPiece: PieceType;
  setSelPiece: (t: PieceType) => void;
  updPieceColor: (t: PieceType, c: string) => void;
  updAttr: (t: PieceType, k: "speed" | "power" | "rebound", v: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 24, height: "100%", minHeight: 0 }}>
      <div style={{ width: 180, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(155,79,255,0.7)",
            letterSpacing: "0.22em",
            marginBottom: 8,
          }}
        >
          TIPOS DE PEÇA
        </div>
        {ALL_PIECE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelPiece(t)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
              background: selPiece === t ? `${draft.pieceColors[t]}14` : "rgba(255,255,255,0.02)",
              border: `1px solid ${selPiece === t ? draft.pieceColors[t] + "55" : "rgba(255,255,255,0.07)"}`,
              boxShadow: selPiece === t ? `0 0 12px ${draft.pieceColors[t]}33` : "none",
              textAlign: "left",
            }}
          >
            <PieceSVG type={t} size={22} color={draft.pieceColors[t]} glowLevel={draft.glowIntensity} />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: selPiece === t ? draft.pieceColors[t] : "rgba(200,220,255,0.5)",
                  letterSpacing: "0.1em",
                }}
              >
                {PIECE_LABEL[t]}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "rgba(180,210,240,0.35)" }}>
                {PIECE_ROLE[t].split(" · ")[0]}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 24px",
            borderRadius: 12,
            background: `${draft.pieceColors[selPiece]}08`,
            border: `1px solid ${draft.pieceColors[selPiece]}33`,
          }}
        >
          <PieceSVG
            type={selPiece}
            size={52}
            color={draft.pieceColors[selPiece]}
            selected
            glowLevel={draft.glowIntensity}
          />
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 900,
                color: draft.pieceColors[selPiece],
                textShadow: `0 0 12px ${draft.pieceColors[selPiece]}`,
                letterSpacing: "0.14em",
                marginBottom: 4,
              }}
            >
              {PIECE_LABEL[selPiece]}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(180,210,240,0.5)" }}>
              {PIECE_ROLE[selPiece]}
            </div>
          </div>
        </div>

        <ColorPicker
          label="COR DA PEÇA"
          value={draft.pieceColors[selPiece]}
          onChange={(c) => updPieceColor(selPiece, c)}
        />

        <div
          style={{
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(77,214,255,0.18),transparent)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(155,79,255,0.7)",
              letterSpacing: "0.22em",
            }}
          >
            ATRIBUTOS
          </div>
          <AttrSlider
            label="VELOCIDADE"
            value={draft.attrs[selPiece].speed}
            color="#f5e642"
            onChange={(v) => updAttr(selPiece, "speed", v)}
          />
          <AttrSlider
            label="FORÇA"
            value={draft.attrs[selPiece].power}
            color="#ff2d9b"
            onChange={(v) => updAttr(selPiece, "power", v)}
          />
          <AttrSlider
            label="REBOTE"
            value={draft.attrs[selPiece].rebound}
            color="#39ff5a"
            onChange={(v) => updAttr(selPiece, "rebound", v)}
          />
        </div>
      </div>
    </div>
  );
}
