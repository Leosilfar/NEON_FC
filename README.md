# NEON FC

Jogo de futebol 2D com estética neon. Cinco jogadores por time, arena fechada com paredes, peças geométricas que giram e chutam a bola.

## Stack

- **React 19** — menus e HUD
- **Canvas 2D** — loop da partida (120 Hz timestep fixo, física com SAT)
- **Vite 8 + TypeScript 5.7**
- **Electron** — empacotamento desktop (Windows)
- **Howler** — áudio
- **Framer Motion** — animações de menu

## Estrutura

```
src/
  engine/         # Loop de simulação, física, IA
    simulation.ts # Passo principal da partida
    ai.ts         # Comportamento dos adversários
    physics.ts    # Colisão SAT e movimento
    state.ts      # makeGS — estado inicial da partida
  components/
    match/        # Render do canvas e HUD
    screens/      # Telas do jogo (menu, elenco, etc.)
    common/       # Componentes reutilizáveis
    team-builder/ # Montagem do elenco
  hooks/
    useMatch.ts      # Loop RAF e integração com React
    useMatchInput.ts # Entrada de teclado e touch
  utils/
    audio.ts      # SFX e música (Howler)
    tactics.ts    # Formações e posicionamento
  constants/
    physics.ts    # Constantes do campo e física
    settings.ts   # Configurações padrão e paleta neon
  types/          # Tipos TypeScript do domínio
```

## Comandos

```bash
pnpm install       # instalar dependências
pnpm dev           # servidor de desenvolvimento
pnpm build         # build web
pnpm typecheck     # verificação de tipos
pnpm build:desktop # build Electron (Windows)
```

## Controles padrão

| Ação | Tecla |
|------|-------|
| Mover | W A S D |
| Girar | Q / E |
| Selecionar mais próximo da bola | Tab |
| Pausar | Esc |

## Licença

MIT — © Leosilfar
