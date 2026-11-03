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
  engine/
    simulation.ts # Coordena as fases de um passo fixo da partida
    physics.ts    # Geometria, SAT, contatos e limites do campo
    collision.ts # Contatos entre peças, bola e paredes
    combat/
      kicks.ts    # Execução dos chutes do jogador e da IA
    state.ts      # Cria o estado inicial e os elencos
    ai.ts         # Entrada pública e orquestração da IA
    ai/
      difficulty.ts # Perfis de dificuldade por equipe
      perception.ts # Leitura da bola e estimativa de posse
      goalkeeper.ts # Posicionamento e previsão do goleiro
      positioning.ts # Formação e posicionamento de campo
      strategy/     # Contexto, coordenação, alvos e escolha de ações
      steering.ts   # Aceleração, movimento e separação
      kicking.ts    # Escolha do alvo de chute e orientação da peça
      harness.ts    # Métricas headless para análise da IA
    rules/
      matchFlow.ts  # Entrada estável para eventos e reinícios
      goalEvents.ts # Transições e efeitos de gol
      kickoff/      # Planejamento, movimento, recuperação e reinício
    fx/
      particles.ts  # Partículas e efeitos de colisão
  components/
    Menu/
      settings/   # Tipos, traduções e painéis por aba
    match/        # Canvas, HUD e renderização da partida
    common/       # Componentes reutilizáveis
    team-builder/ # Montagem do elenco e formação
  context/        # Estado compartilhado da interface
  hooks/          # Integração do motor com React e controles
  utils/          # Áudio, canvas, táticas e persistência
  constants/      # Dimensões físicas e configurações padrão
  types/          # Tipos de estado, configurações e interface
vite/
  figmaPlugins.ts # Plugins de preview e metadados do Figma Make
```

### Limites entre módulos

- O motor é dono do estado da partida (`GS`). `simulation.ts` coordena os passos e delega regras a módulos especializados.
- `simulation.ts` controla a ordem temporal; `collision.ts`, `combat/kicks.ts` e `rules/kickoff/` executam suas respectivas fases.
- Componentes e renderizadores exibem o estado e encaminham comandos; regras físicas e táticas vivem no engine.
- A IA separa percepção, dificuldade, goleiro, posicionamento, coordenação coletiva, seleção de ações, movimento e execução de chutes. `engine/ai.ts` mantém a entrada pública do motor.
- Cada aba das configurações tem um painel próprio; `SettingsScreen.tsx` mantém o estado temporário e decide qual painel renderizar.
- `constants/physics.ts` é a fonte única das dimensões do campo. Alterar escala ou número de jogadores exige atualizar motor, táticas e interface em conjunto.
- Plugins do Figma ficam em `vite/`, fora do código do jogo.

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
