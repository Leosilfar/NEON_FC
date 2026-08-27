import { useContext, useState, useEffect } from 'react';
import { GameContext } from '@/context/GameContext';
import Match from './components/match/Match';
import SplashScreen from './components/Menu/SplashScreen';
import MainScreen from './components/Menu/MainScreen';
import SettingsScreen from './components/Menu/SettingsScreen';
import EditMenu from './components/Menu/EditScreen';
import ElencoScreen from './components/Menu/ElencoScreen';
import StatsScreen from './components/Menu/StatsScreen';

const FpsCounter = () => {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;
    const update = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);
  return (
    <div className="fixed top-4 left-4 z-50 font-mono text-xs font-bold text-[#00f0ff] bg-black/80 px-3 py-1 rounded border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
      FPS: {fps}
    </div>
  );
};

export default function App() {
  const { screen, setScreen, settings, playerSlots } = useContext(GameContext)!;
  const [showFps, setShowFps] = useState(false);

  let menuContent = null;
  switch (screen) {
    case 'SPLASH':
      menuContent = <SplashScreen />;
      break;
    case 'MAIN':
      menuContent = <MainScreen />;
      break;
    case 'SETTINGS':
      menuContent = <SettingsScreen onBack={() => setScreen('MAIN')} showFps={showFps} setShowFps={setShowFps} />;
      break;
    case 'EDITAR':
      menuContent = <EditMenu onBack={() => setScreen('MAIN')} />;
      break;
    case 'ELENCO':
      menuContent = <ElencoScreen onBack={() => setScreen('MAIN')} />;
      break;
    case 'STATS':
      menuContent = <StatsScreen onBack={() => setScreen('MAIN')} />;
      break;
    default:
      menuContent = <MainScreen />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {showFps && <FpsCounter />}
      {screen !== 'PLAY' && (
        <>
          <div className="absolute inset-0 bg-[url('/background.png')] bg-cover bg-center z-0 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent pointer-events-none z-10"></div>
          <div className="relative z-20 w-full h-full">{menuContent}</div>
          {settings.showGrid && (
            <div className="fixed inset-0 pointer-events-none z-40 bg-[linear-gradient(to_right,rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}
          {settings.showScanlines && (
            <div
              className="fixed inset-0 pointer-events-none z-50 opacity-30"
              style={{
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
                backgroundSize: '100% 4px',
              }}
            />
          )}
        </>
      )}
      {screen === 'PLAY' && <Match playerSlots={playerSlots} settings={settings} onExit={() => setScreen('MAIN')} />}
    </div>
  );
}
