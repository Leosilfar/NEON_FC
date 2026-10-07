import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"

import { ALL_ROLES } from "@/constants"

import type { GameSettings, PieceType, Role, SlotPiece } from "@/types"

import { PieceSVG } from "@/components/common"

import { computeTacticalUiPositions } from "@/utils/tactics"

import { countGKs } from "@/utils/validators"

export default function TacticalField({
  slots,
  roles,
  selectedType,
  settings,
  onPlace,
  onRemove,
  onChangeRole,
  onSlotClick,
}: {
  slots: (SlotPiece | null)[]
  roles: Role[]
  selectedType: PieceType | null
  settings: GameSettings
  onPlace: (index: number, type: PieceType) => void
  onRemove: (index: number) => void
  onChangeRole: (index: number, role: Role) => void
  onSlotClick?: (index: number) => void
}) {
  const [openRoleIndex, setOpenRoleIndex] = useState<number | null>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const ac = settings.accentColor

  const nodes = computeTacticalUiPositions(roles)

  const gkCount = countGKs(roles)
  const previewGlow =
    typeof settings.glowIntensity === "number"
      ? Math.max(settings.glowIntensity, 1.5)
      : settings.glowIntensity

  const backgroundStyle = {
    background: "linear-gradient(180deg,rgba(5,8,20,0.94),rgba(5,2,18,0.98))",
  }

  useEffect(() => {
    if (openRoleIndex === null) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !roleDropdownRef.current?.contains(event.target)
      ) {
        setOpenRoleIndex(null)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenRoleIndex(null)
    }

    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [openRoleIndex])

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "560px",
          height: "100%",
          maxHeight: "100%",
          minHeight: "400px",
          margin: "0 auto",
          borderRadius: "var(--rounded-xl)",
          border: `1px solid ${ac}22`,
          boxShadow: `0 0 28px ${ac}18, inset 0 0 34px ${ac}04`,
          padding: 20,
          paddingBottom: 32,
          overflow: "hidden",
          ...backgroundStyle,
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
          const piece = slots[i]
          const color = piece ? settings.pieceColors[piece.type] : ac

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%,-50%)",
                zIndex: openRoleIndex === i ? 40 : 1,
                width: "clamp(62px, 14%, 82px)",
                height: "clamp(56px, 11%, 68px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <motion.div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const t = e.dataTransfer.getData("pieceType") as PieceType
                  if (t) onPlace(i, t)
                }}
                onClick={() => {
                  if (onSlotClick) onSlotClick(i)
                  if (selectedType && !slots[i]) onPlace(i, selectedType)
                  else if (slots[i]) onRemove(i)
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault()
                    if (onSlotClick) onSlotClick(i)
                    if (selectedType && !slots[i]) onPlace(i, selectedType)
                    else if (slots[i]) onRemove(i)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Slot ${i + 1}, ${roles[i]}${
                  piece ? ", ocupado" : ", vazio"
                }`}
                data-ui-sound={
                  selectedType && !piece ? "slot-place" : undefined
                }
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
                        backgroundColor: "rgba(5, 8, 20, 0.65)",
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
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
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
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        <PieceSVG
                          type={piece.type}
                          size={22}
                          color={settings.pieceColors[piece.type]}
                          glowLevel={previewGlow}
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

                <div
                  ref={openRoleIndex === i ? roleDropdownRef : undefined}
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={openRoleIndex === i}
                    aria-label={`Alterar posição: ${roles[i]}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenRoleIndex(openRoleIndex === i ? null : i)
                    }}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "3px 10px",
                      borderRadius: 999,
                      background:
                        openRoleIndex === i ? `${ac}35` : "rgba(0,0,0,0.8)",
                      color: piece ? color : "#e0f7ff",
                      border: `1px solid ${
                        openRoleIndex === i ? ac : piece ? color : `${ac}66`
                      }`,
                      boxShadow:
                        openRoleIndex === i
                          ? `0 0 12px ${ac}88`
                          : `0 0 7px ${ac}33`,
                      minHeight: 24,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {roles[i]}
                    <span
                      aria-hidden="true"
                      style={{ marginLeft: 5, opacity: 0.7 }}
                    >
                      ▾
                    </span>
                  </button>
                  <AnimatePresence>
                    {openRoleIndex === i && (
                      <motion.div
                        role="listbox"
                        aria-label="Posições disponíveis"
                        initial={{ opacity: 0, y: -5, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.14 }}
                        style={{
                          position: "absolute",
                          top: pos.y > 68 ? "auto" : "calc(100% + 5px)",
                          bottom: pos.y > 68 ? "calc(100% + 5px)" : "auto",
                          left: "calc(50% - 43px)",
                          minWidth: 86,
                          width: 86,
                          padding: 4,
                          borderRadius: 12,
                          border: `1px solid ${ac}aa`,
                          background: "rgba(5, 8, 20, 0.97)",
                          boxShadow: `0 0 18px ${ac}55, inset 0 0 14px ${ac}12`,
                          backdropFilter: "blur(12px)",
                          zIndex: 60,
                        }}
                      >
                        {ALL_ROLES.map((role) => {
                          const goalKeeperUnavailable =
                            role === "GOL" && gkCount > 0 && roles[i] !== "GOL"
                          return (
                            <button
                              key={role}
                              type="button"
                              role="option"
                              aria-selected={roles[i] === role}
                              disabled={goalKeeperUnavailable}
                              onClick={(event) => {
                                event.stopPropagation()
                                onChangeRole(i, role)
                                setOpenRoleIndex(null)
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "5px 9px",
                                border: 0,
                                borderRadius: 8,
                                background:
                                  roles[i] === role ? `${ac}35` : "transparent",
                                color:
                                  roles[i] === role
                                    ? ac
                                    : goalKeeperUnavailable
                                      ? "rgba(255,255,255,0.28)"
                                      : "#e0f7ff",
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textAlign: "left",
                                cursor: goalKeeperUnavailable
                                  ? "not-allowed"
                                  : "pointer",
                                textShadow:
                                  roles[i] === role ? `0 0 8px ${ac}` : "none",
                              }}
                            >
                              {role}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
