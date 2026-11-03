import { useEffect, useState } from "react"
import { useContext } from "react"
import { GameContext } from "@/context/GameContext"
import { translations } from "./settings/translations"

export default function SplashScreen() {
  const [exiting, setExiting] = useState(false)
  const { settings, setScreen } = useContext(GameContext)!
  const t = translations[settings.language?.startsWith("pt") ? "PT" : "EN"]

  useEffect(() => {
    const handleKeyDown = () => {
      setExiting(true)
      setTimeout(() => setScreen("MAIN"), 500)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setScreen])

  return (
    <div
      className={`fixed inset-0 flex flex-col text-white transition-opacity duration-500 ease-out ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Center logo */}
      <div className="flex-1 flex items-center justify-center">
        <img
          src="./logo.png"
          alt="NEON FC"
          className="h-48 w-auto animate-logo-slow-zoom"
        />
      </div>

      {/* Bottom pill */}
      <div className="flex justify-center mb-4">
        <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-full px-8 py-3 animate-pulse">
          <span className="text-cyan-300 font-mono">
            {t.splashPrompt}
          </span>
        </div>
      </div>

      {/* Bottom-right subtle text */}
      <div className="absolute bottom-2 right-4 text-xs text-gray-400">
        202P - HASHI LABS
      </div>
    </div>
  )
}
