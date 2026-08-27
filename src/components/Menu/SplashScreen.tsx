import { useEffect, useState } from "react";
import { useContext } from "react";
import { GameContext } from "@/context/GameContext";

export default function SplashScreen() {
  const [exiting, setExiting] = useState(false);
  const { setScreen } = useContext(GameContext)!;

  useEffect(() => {
    const handleKeyDown = () => {
      setExiting(true);
      setTimeout(() => setScreen("MAIN"), 500);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setScreen]);

  return (
    <div className={`fixed inset-0 flex flex-col text-white transition-opacity duration-500 ease-out ${exiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Top-left header */}
      <div className="absolute top-4 left-4 flex items-center space-x-2">
        <img src="/logo.png" alt="Logo" className="h-8 w-8" />
        <span className="text-cyan-400 text-2xl font-bold tracking-widest">NEON FC</span>
      </div>

      {/* Center logo */}
      <div className="flex-1 flex items-center justify-center">
        <img src="/logo.png" alt="FC NEON Logo" className="h-48 w-auto" />
      </div>

      {/* Bottom pill */}
      <div className="flex justify-center mb-4">
        <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-full px-8 py-3 animate-pulse">
          <span className="text-cyan-300 font-mono">PRESSIONE QUALQUER TECLA PARA INICIAR</span>
        </div>
      </div>

      {/* Bottom-right subtle text */}
      <div className="absolute bottom-2 right-4 text-xs text-gray-400">202P - HASHI LABS</div>
    </div>
  );
}