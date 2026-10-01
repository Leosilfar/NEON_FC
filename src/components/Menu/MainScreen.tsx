import { useContext, useState, useEffect } from "react"
import { GameContext } from "@/context/GameContext"
import type { MatchMode, Screen } from "@/types"

type MenuCard = {
  label: string
  screen: Screen | null
  matchMode?: MatchMode
  disabled: boolean
}

export default function MainScreen() {
  const [visible, setVisible] = useState(false)
  useEffect(() => setVisible(true), [])
  const { setMatchMode, setScreen } = useContext(GameContext)!
  const topCards: MenuCard[] = [
    { label: "JOGO RÁPIDO", screen: "PLAY", matchMode: "normal", disabled: false },
    { label: "ARCADE", screen: null, disabled: true },
    { label: "MULTIPLAYER", screen: null, disabled: true },
    { label: "MODO TREINO", screen: "PLAY", matchMode: "training", disabled: false },
  ]
  const bottomCards: MenuCard[] = [
    { label: "SETTINGS", screen: "SETTINGS", disabled: false },
    { label: "MEU ELENCO", screen: "ELENCO", disabled: false },
    { label: "EDITAR", screen: "EDITAR", disabled: false },
    { label: "ESTATÍSTICAS", screen: null, disabled: true },
  ]

  return (
    <div
      className={`fixed inset-0 bg-[url('/background.png')] bg-cover bg-center flex flex-col items-center justify-center min-h-screen w-full px-8 relative z-10 transition-all duration-700 ease-out transform-gpu ${
        visible ? "opacity-100 scale-100 animate-neon-on" : "opacity-0 scale-95"
      }`}
    >
      {/* Light left overlay for performance */}

      {/* Top-left logo */}
      <img
        src="/logo.png"
        alt="Logo"
        className="absolute top-8 left-10 w-36 h-auto drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]"
      />

      {/* Grid container centered vertically */}
      <div className="flex flex-col items-end justify-end h-full w-full pb-16 pr-16 pl-[20%]">
        <div className="grid grid-cols-4 gap-6 w-full max-w-6xl py-6">
          {/* Top row cards (Magenta) */}
          {topCards.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                if (!c.screen) return
                if (c.matchMode) setMatchMode(c.matchMode)
                setScreen(c.screen)
              }}
              disabled={c.disabled}
              className={`relative flex items-center justify-center h-[340px] rounded-3xl border border-[#ff007f] bg-white/5 shadow-[0_0_25px_rgba(255,0,127,0.5)] backdrop-blur-sm font-sans uppercase tracking-widest group transition-all duration-300 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.02] ${
                c.disabled ? "opacity-50 cursor-not-allowed" : ""
              } hover:shadow-[0_0_40px_rgba(255,0,127,0.8)] hover:border-white/80`}
            >
              <div className="absolute top-4 right-4 w-7 h-7 bg-[#00f0ff] rounded-full flex items-center justify-center font-extrabold text-xs select-none shadow-md pointer-events-none group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300">
                <span className="leading-none block translate-y-[-0.5px]">
                  +
                </span>
              </div>
              <span className="text-white font-bold tracking-wider text-center text-lg uppercase">
                {c.label}
              </span>
            </button>
          ))}
          {/* Bottom row cards (Cyan) */}
          {bottomCards.map((c, i) => (
            <button
              key={i + 4}
              onClick={() => c.screen && setScreen(c.screen)}
              disabled={c.disabled}
              className={`relative flex items-center justify-center h-[340px] rounded-3xl bg-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.6)] font-sans uppercase tracking-widest group transition-all duration-300 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.02] cursor-pointer ${
                c.disabled ? "opacity-50 cursor-not-allowed" : ""
              } hover:shadow-[0_0_40px_rgba(0,240,255,0.9)] hover:brightness-115`}
            >
              <div className="absolute top-4 right-4 w-7 h-7 bg-[#ff007f] rounded-full flex items-center justify-center font-extrabold text-xs select-none shadow-md pointer-events-none group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300">
                <span className="leading-none block translate-y-[-0.5px]">
                  +
                </span>
              </div>
              <span className="text-[#030712] font-extrabold tracking-wider text-center text-lg uppercase">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
