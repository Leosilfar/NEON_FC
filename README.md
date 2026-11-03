# NEON FC

NEON FC é um jogo de futebol 2D com estética neon e peças geométricas que se movimentam, giram e chutam a bola. Cada equipe tem até cinco peças. O campo tem paredes arredondadas, zonas de gol nas extremidades e uma câmera que acompanha a bola.

## Recursos

- Partidas rápidas e modo de treino.
- Montagem de equipes, escolha de formações e definição de funções por peça.
- IA tática com níveis de dificuldade, posicionamento por função, pressão, antecipação, passes e finalizações.
- Controle direto de uma peça, com seleção de companheiro durante a partida.
- Configurações de idioma, controles, áudio, campo e aparência.
- Efeitos visuais neon, animações, música e efeitos sonoros.
- Versão web com Vite e versão desktop para Windows com Electron.

## Tecnologias

- **React 19** para menus, configurações e HUD.
- **Canvas 2D** para desenhar peças, bola, efeitos e depuração da IA.
- **TypeScript 5.7** e **Vite 8**.
- **Electron** para empacotar a versão desktop.
- **Howler** para música e efeitos sonoros.
- **Framer Motion** para animações de interface.

## Começar

Requisitos: Node.js, pnpm e Git.

```bash
git clone https://github.com/Leosilfar/NEON_FC.git
cd NEON_FC
pnpm install --frozen-lockfile
pnpm dev
```

O servidor de desenvolvimento do Vite fica disponível em `http://localhost:5173`.

## Comandos

```bash
pnpm dev             # iniciar o servidor de desenvolvimento
pnpm typecheck       # verificar os tipos TypeScript
pnpm build           # gerar a versão web em dist/
pnpm preview         # visualizar localmente a versão web gerada
pnpm desktop:run     # gerar o build web e abrir no Electron
pnpm build:desktop   # gerar instalador e versão portátil para Windows
```

## Controles padrão

| Ação | Tecla |
| --- | --- |
| Mover a peça selecionada | W, A, S, D |
| Girar a peça | Q / E |
| Chutar ou passar | Espaço |
| Selecionar a peça aliada mais próxima da bola | Tab |
| Pausar ou continuar | Esc |
| Mostrar ou ocultar depuração da IA | F3 |

Os controles podem ser alterados nas configurações.

## Estrutura do projeto

```text
src/
  components/
    Menu/                 # telas do menu e configurações
      settings/            # painéis, tipos e traduções das configurações
    match/                 # canvas, HUD, sobreposições e renderização
    team-builder/          # montagem de elenco e formação
    common/                # componentes compartilhados e linhas do campo
  constants/               # dimensões do campo e configurações padrão
  context/                 # estado compartilhado da interface
  engine/
    simulation.ts          # coordena cada passo da partida
    state.ts               # cria o estado inicial e as equipes
    physics.ts             # geometria, SAT e limites do campo
    collision.ts           # contatos entre peças, bola e paredes
    combat/kicks.ts        # chutes do jogador e da IA
    ai.ts                  # entrada pública e orquestração da IA
    ai/                    # percepção, estratégia, goleiros e movimento
    rules/                 # gols, reinícios e fases de partida
    fx/                    # partículas e efeitos de colisão
  hooks/                   # loop de renderização e entrada do jogador
  types/                   # tipos compartilhados do jogo e da interface
  utils/                   # câmera, áudio, desenho, táticas e persistência
electron/                  # processo principal e janela desktop
vite/                      # plugins de preview e metadados do Figma Make
```

### Limites entre módulos

- `GS` é o estado compartilhado da partida. `simulation.ts` controla a ordem dos passos e delega tarefas para física, colisões, chutes e regras.
- A física roda com passo fixo de **120 Hz**, dividido em subpassos para resolver movimento e contatos. As decisões táticas da IA são atualizadas a **30 Hz**.
- A IA separa percepção, dificuldade, coordenação de equipe, posicionamento, ações, movimento e execução dos chutes.
- As formações iniciais usam posições normalizadas, calculadas a partir das funções das peças.
- `constants/physics.ts` é a fonte única das dimensões do campo: **1800 × 900** unidades. A câmera acompanha a bola e mantém o HUD fixo na tela.
- React cuida da interface e encaminha entradas; o motor da partida é executado no Canvas 2D.

## Licença

MIT. Consulte o arquivo [`LICENSE`](LICENSE).
