import { motion, AnimatePresence } from "framer-motion";
import { ALL_ROLES } from "@/constants";
import type { GameSettings, PieceType, Role, SlotPiece } from "@/types";
import { PieceSVG } from "@/components/common";
import { computeTacticalUiPositions } from "@/utils/tactics";
import { countGKs } from "@/utils/validators";

export default function TacticalField({
  slots,
  roles,
  selectedType,
  settings,
  onPlace,
  onRemove,
  onChangeRole,
}: {
  slots: (SlotPiece | null)[];
  roles: Role[];
  selectedType: PieceType | null;
  settings: GameSettings;
  onPlace: (index: number, type: PieceType) => void;
  onRemove: (index: number) => void;
  onChangeRole: (index: number, role: Role) => void;
}) {
  const ac = settings.accentColor;
  const nodes = computeTacticalUiPositions(roles);
  const gkCount = countGKs(roles);

  // Pega a imagem do settings (se houver) ou usa o gradiente padrão como fallback
  const backgroundStyle = settings.background
    ? {
        backgroundImage: `url(${settings.background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: "linear-gradient(180deg,rgba(5,8,20,0.94),rgba(5,2,18,0.98))",
      };

  return (
    <div
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          minWidth: "480px",
          maxWidth: "600px",
          height: "calc(100vh - 280px)",
          minHeight: "450px",
          margin: "0 auto",
          borderRadius: "var(--rounded-xl)",
          border: `1px solid ${ac}22`,
          boxShadow: `0 0 28px ${ac}18, inset 0 0 34px ${ac}04`,
          padding: 20,
          paddingBottom: 32,
          overflow: "hidden",
          ...backgroundStyle, // Aplica o wallpaper selecionado
        }}
      >
        {/* Camada sutil para escurecer ligeiramente o wallpaper e destacar os elementos neon */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(5, 8, 20, 0.45)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: 16,
            boxShadow: `0 0 28px ${ac}12, inset 0 0 60px ${ac}06`,
            background: `linear-gradient(180deg,transparent 18%, ${ac}08 50%, transparent 82%)`,
            pointerEvents: "none",
          }}
        />

        {nodes.map((pos, i) => {
          const piece = slots[i];
          const color = piece ? settings.pieceColors[piece.type] : ac;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%,-50%)",
                width: 80,
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <motion.div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const t = e.dataTransfer.getData("pieceType") as PieceType;
                  if (t) onPlace(i, t);
                }}
                onClick={() => {
                  if (selectedType && !slots[i]) onPlace(i, selectedType);
                  else if (slots[i]) onRemove(i);
                }}
                initial={false}
                animate={
                  piece
                    ? {
                        scale: [0.8, 1.25, 1],
                        boxShadow: [
                          `0 0 0px transparent, inset 0 0 0px transparent`,
                          `0 0 50px ${color}, 0 0 100px ${color}, inset 0 0 30px #ffffff`,
                          `0 0 25px ${color}88, 0 10px 20px rgba(0,0,0,0.8), inset 0 0 15px ${color}44`,
                        ],
                        borderColor: ["#ffffff", color, color],
                        backgroundColor: [
                          "rgba(255,255,255,1)",
                          `${color}66`,
                          `${color}22`,
                        ],
                      }
                    : {
                        scale: 1,
                        boxShadow: `0 6px 12px rgba(0,0,0,0.5), 0 0 12px ${ac}14`,
                        borderColor: `${ac}28`,
                        backgroundColor: "rgba(5, 8, 20, 0.65)", // Ajustado para ter boa visibilidade sobre wallpapers
                      }
                }
                transition={{
                  duration: 0.5,
                  times: [0, 0.3, 1],
                  ease: "backOut",
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: "var(--rounded-lg)",
                  padding: "6px 4px",
                  borderWidth: 2,
                  borderStyle: "solid",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  overflow: "visible",
                }}
              >
                {/* Halo pulsante ao redor do slot preenchido */}
                {piece && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.8, 0.3, 0.8], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "calc(var(--rounded-lg) + 4px)",
                      border: `1.5px solid ${color}`,
                      boxShadow: `0 0 15px ${color}`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Ícone da peça / Sinal de + */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {piece ? (
                      <motion.div
                        key="piece"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <PieceSVG
                          type={piece.type}
                          size={22}
                          color={settings.pieceColors[piece.type]}
                          glowLevel={Math.max(settings.glowIntensity, 1.5)}
                        />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="plus"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 16,
                          color: "rgba(255,255,255,0.4)",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Seletor de Posição (Role) */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <select
                    value={roles[i]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onChangeRole(i, e.target.value as Role)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.75)",
                      color: "white",
                      border: `1px solid ${piece ? color : ac + "33"}`,
                      height: 22,
                      cursor: "pointer",
                    }}
                  >
                    {ALL_ROLES.map((r) => {
                      const disableG = r === "GOL" && gkCount > 0 && roles[i] !== "GOL";
                      return (
                        <option key={r} value={r} disabled={disableG}>
                          {r}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}