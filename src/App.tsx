import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameSettings, Screen, SlotPiece } from "@/types";
import { loadSettings, saveSettings } from "@/utils/settingsStorage";
import Background from "@/components/Background";
import MainMenu from "@/components/screens/MainMenu";
import SettingsScreen from "@/components/screens/SettingsScreen";
import TeamBuilder from "@/components/team-builder/TeamBuilder";
import Match from "@/components/match/Match";

// Animações de transição suavizadas
const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 1.03,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [playerSlots, setPlayerSlots] = useState<SlotPiece[]>([]);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  function handleSave(s: GameSettings) {
    setSettings(s);
    saveSettings(s);
  }

  const bg =
    "radial-gradient(1200px 600px at 10% 20%, rgba(255,0,128,0.06), transparent 12%), radial-gradient(800px 500px at 85% 80%, rgba(0,240,255,0.05), transparent 10%), linear-gradient(180deg, #0d102d 0%, #120c38 60%, #060818 100%)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: bg,
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Background animado ativo APENAS nas telas de menu e configurações */}
      {screen !== "match" && screen !== "builder" && <Background />}

      {/* Grade embutida desativada na partida e no montador de time */}
      {settings.showGrid && screen !== "match" && screen !== "builder" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage: `linear-gradient(${settings.accentColor}28 1px,transparent 1px),linear-gradient(90deg,${settings.accentColor}28 1px,transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      )}

      {settings.showScanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 99,
            background:
              "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.065) 3px,rgba(0,0,0,0.065) 4px)",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <AnimatePresence mode="wait">
          {screen === "menu" && (
            <motion.div
              key="menu"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <MainMenu
                onStart={() => setScreen("builder")}
                onSettings={() => setScreen("settings")}
                settings={settings}
              />
            </motion.div>
          )}

          {screen === "settings" && (
            <motion.div
              key="settings"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <SettingsScreen
                settings={settings}
                onSave={handleSave}
                onBack={() => setScreen("menu")}
              />
            </motion.div>
          )}

          {screen === "builder" && (
            <motion.div
              key="builder"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <TeamBuilder
                onBack={() => setScreen("menu")}
                onStart={(s) => {
                  setPlayerSlots(s);
                  setScreen("match");
                }}
                settings={settings}
              />
            </motion.div>
          )}

          {screen === "match" && (
            <motion.div
              key="match"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <Match
                playerSlots={playerSlots}
                onExit={() => setScreen("menu")}
                settings={settings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}