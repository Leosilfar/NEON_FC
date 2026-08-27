import { useContext, useState } from "react";
import { GameContext } from "@/context/GameContext";
import type { GameSettings } from "@/types";

const translations = {
  PT: {
    settings: "SETTINGS",
    voltar: "VOLTAR",
    audio: "ÁUDIO",
    musica: "MÚSICA",
    sfx: "SFX",
    idioma: "IDIOMA",
    ptbr: "PTBR",
    ingles: "INGLÊS",
    fpsToggle: "ATIVAR CONTADOR DE FPS",
    elementosVisuais: "ELEMENTOS VISUAIS",
    gridSutil: "ATIVAR GRID SUTIL SOBRE O FUNDO",
    scanlines: "ATIVAR EFEITO CRT RETRO SCANLINES",
    dificuldade: "DIFICULDADE",
    facil: "FÁCIL",
    medio: "MÉDIO",
    dificil: "DIFÍCIL",
  },
  EN: {
    settings: "SETTINGS",
    voltar: "BACK",
    audio: "AUDIO",
    musica: "MUSIC",
    sfx: "SFX",
    idioma: "LANGUAGE",
    ptbr: "PT-BR",
    ingles: "ENGLISH",
    fpsToggle: "ENABLE FPS COUNTER",
    elementosVisuais: "VISUAL ELEMENTS",
    gridSutil: "ENABLE SUBTLE BACKGROUND GRID",
    scanlines: "ENABLE CRT RETRO SCANLINES",
    dificuldade: "DIFFICULTY",
    facil: "EASY",
    medio: "MEDIUM",
    dificil: "HARD",
  },
};

export default function SettingsScreen({ onBack, showFps, setShowFps }: { onBack: () => void; showFps: boolean; setShowFps: (v: boolean) => void }) {
  const { settings, updateSettings } = useContext(GameContext)!;
  const [draft, setDraft] = useState<GameSettings>(() => ({ ...settings }));
  const languageKey = settings.language?.startsWith('pt') ? 'PT' : 'EN';
  const t = translations[languageKey];

  const handleSave = () => {
    updateSettings(draft);
    onBack();
  };

  const setMusicVolume = (v: number) => setDraft(p => ({ ...p, musicVolume: v }));
  const setSfxVolume = (v: number) => setDraft(p => ({ ...p, sfxVolume: v }));

  return (
    <div className="animate-neon-on flex flex-col items-center justify-center min-h-screen w-full px-8 py-6 relative z-20">
      {/* Header */}
      <div className="w-full max-w-7xl bg-[#00f0ff] text-black font-extrabold px-10 py-6 rounded-3xl flex items-center justify-between shadow-[0_0_20px_rgba(0,240,255,0.6)] mb-10">
        <h1 className="text-3xl tracking-widest">{t.settings}</h1>
<button onClick={onBack} className="bg-[#ff007f] text-white font-extrabold tracking-widest text-sm px-8 py-2 rounded-full shadow-[0_0_15px_rgba(255,0,127,0.8)] hover:scale-105 hover:brightness-125 transition-all mr-2">
              {t.voltar}
            </button>
        <button onClick={handleSave} className="bg-[#ff007f] text-white font-extrabold tracking-widest text-sm px-8 py-2 rounded-full shadow-[0_0_15px_rgba(255,0,127,0.8)] hover:scale-105 hover:brightness-125 transition-all">
          SALVAR
        </button>
      </div>

      {/* Grid Content */}
      <div className="w-full max-w-7xl grid grid-cols-2 gap-24 font-mono text-white text-base">
        {/* Left Column */}
        <div className="space-y-10">
          {/* Audio */}
          <div>
            <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">{t.audio}</h2>
            <div className="space-y-4">
              {/* Music */}
              <div>
                <span className="block text-sm text-gray-300 mb-2">{t.musica}</span>
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draft.musicVolume ?? 80}
                    onChange={e => setMusicVolume(Number(e.target.value))}
                    className="w-full max-w-sm h-3 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-[#ff007f]"
                    style={{ background: `linear-gradient(to right, #ff007f ${draft.musicVolume ?? 80}%, #374151 ${draft.musicVolume ?? 80}%)` }}
                  />
                </div>
              </div>
              {/* SFX */}
              <div>
                <span className="block text-sm text-gray-300 mb-2">{t.sfx}</span>
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draft.sfxVolume ?? 80}
                    onChange={e => setSfxVolume(Number(e.target.value))}
                    className="w-full max-w-sm h-3 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-[#ff007f]"
                    style={{ background: `linear-gradient(to right, #ff007f ${draft.sfxVolume ?? 80}%, #374151 ${draft.sfxVolume ?? 80}%)` }}
                  />
                </div>
</div>
         {/* Controls */}
         <div>
           <h2 className="text-cyan-400 font-bold tracking-widest text-sm mb-3">CONTROLES</h2>
           <div className="space-y-3">
             {[{action:'Move Up',key:'W'},{action:'Move Down',key:'S'},{action:'Move Left',key:'A'},{action:'Move Right',key:'D'},{action:'Action / Shoot',key:'SPACE'}].map(c=>(
               <div key={c.action} className="flex justify-between items-center mb-2">
                 <span className="text-cyan-300">{c.action}</span>
                 <button className="border border-cyan-500 text-cyan-300 font-mono px-2 rounded">{c.key}</button>
               </div>
             ))}
           </div>
         </div>
         </div>
          </div>

          {/* Visual Elements */}
          <div>
            <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">{t.elementosVisuais}</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${draft.showGrid ? 'border-[#ff007f] shadow-[0_0_10px_#ff007f]' : 'border-purple-900 bg-black/60'}`}>
                  {draft.showGrid && <span className="text-[#ff007f] font-bold text-xs">✓</span>}
                </div>
                <input type="checkbox" checked={draft.showGrid} onChange={e => setDraft(p => ({ ...p, showGrid: e.target.checked }))} className="hidden" />
                <span className="text-sm group-hover:text-cyan-300 transition-colors">{t.gridSutil}</span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${draft.showScanlines ? 'border-[#ff007f] shadow-[0_0_10px_#ff007f]' : 'border-purple-900 bg-black/60'}`}>
                  {draft.showScanlines && <span className="text-[#ff007f] font-bold text-xs">✓</span>}
                </div>
                <input type="checkbox" checked={draft.showScanlines} onChange={e => setDraft(p => ({ ...p, showScanlines: e.target.checked }))} className="hidden" />
                <span className="text-sm group-hover:text-cyan-300 transition-colors">{t.scanlines}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Language */}
          <div>
            <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">{t.idioma}</h2>
            <div className="space-y-3">
              {['PT', 'EN'].map(langKey => (
                <label key={langKey} className="flex items-center gap-4 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(settings.language?.startsWith('pt') && langKey === 'PT') || (settings.language?.startsWith('en') && langKey === 'EN') ? 'border-[#ff007f] shadow-[0_0_10px_#ff007f]' : 'border-purple-900 bg-black/60'}`}>
                    {(settings.language?.startsWith('pt') && langKey === 'PT') || (settings.language?.startsWith('en') && langKey === 'EN') ? <span className="text-[#ff007f] font-bold text-xs">✓</span> : null}
                  </div>
                  <input type="radio" name="language" checked={settings.language?.startsWith(langKey.toLowerCase())} onChange={() => setDraft(p => ({ ...p, language: langKey === 'PT' ? 'pt-BR' : 'en' }))} className="hidden" />
                  <span className="text-sm group-hover:text-cyan-300 transition-colors">{langKey === 'PT' ? t.ptbr : t.ingles}</span>
                </label>
              ))}
            </div>
          </div>

          {/* FPS Toggle */}
          <div>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${showFps ? 'border-[#ff007f] shadow-[0_0_10px_#ff007f]' : 'border-purple-900 bg-black/60'}`}>
                {showFps && <span className="text-[#ff007f] font-bold text-xs">✓</span>}
              </div>
              <input type="checkbox" checked={showFps} onChange={() => setShowFps(!showFps)} className="hidden" />
              <span className="text-sm font-bold tracking-wider group-hover:text-cyan-300 transition-colors">{t.fpsToggle}</span>
            </label>
          </div>

          {/* Difficulty */}
          <div>
            <h2 className="text-cyan-400 font-bold tracking-widest text-lg mb-4">{t.dificuldade}</h2>
            <div className="space-y-3">
              {['FACIL', 'MEDIO', 'DIFICIL'].map(diff => (
                <label key={diff} className="flex items-center gap-4 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${draft.difficulty?.toUpperCase() === diff ? 'border-[#ff007f] shadow-[0_0_10px_#ff007f]' : 'border-purple-900 bg-black/60'}`}>
                    {draft.difficulty?.toUpperCase() === diff && <span className="text-[#ff007f] font-bold text-xs">✓</span>}
                  </div>
                  <input type="radio" name="difficulty" checked={draft.difficulty?.toUpperCase() === diff} onChange={() => setDraft(p => ({ ...p, difficulty: diff.toLowerCase() as any }))} className="hidden" />
                  <span className="text-sm group-hover:text-cyan-300 transition-colors">
                    {diff === 'FACIL' ? t.facil : diff === 'MEDIO' ? t.medio : t.dificil}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
