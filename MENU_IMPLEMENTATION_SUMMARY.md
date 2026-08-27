# Menu de Jogo Overlay - FC NEON

## Visão Geral
Criamos um sistema completo de menu de jogo overlay em React/TypeScript que separa completamente a interface da engine de renderização do Canvas, seguindo todas as diretrizes arquitetônicas especificadas.

## Estrutura de Arquivos Criados

```
src/
├── context/
│   └── GameContext.tsx          # Contexto global para gerenciamento de estado
├── components/
│   ├── Menu/                    # Novo diretório para todos os menus
│   │   ├── SplashScreen.tsx     # Tela de entrada com logo e tecla para iniciar
│   │   ├── MainScreen.tsx       # Menu principal com grid 4x2 de botões
│   │   ├── SettingsScreen.tsx   # Tela de configurações com abas (Áudio, Idioma, Dificuldade, Visual)
│   │   ├── EditScreen.tsx       # Tela de edição e personalização com sub-abas
│   │   ├── ElencoScreen.tsx     # Tela para seleção de formação padrão
│   │   ├── StatsScreen.tsx      # Tela de estatísticas (placeholder "Em Breve")
│   │   ├── AppearanceTab.tsx    # Aba de aparência do menu (cor, brilho)
│   │   ├── TeamATab.tsx         # Aba de personalização do Time A
│   │   ├── FieldTab.tsx         # Aba de configuração do campo (cores, fundo, visuais)
│   │   ├── PiecesTab.tsx        # Aba de configuração das peças (tipos, cores, atributos)
│   │   └── index.ts             # Exportações dos componentes
│   ├── screens/
│   │   └── settings/            # Mantido o settings original para compatibilidade
│   └── ...                      # Outros componentes existentes
├── assets/
│   ├── background.png           # Fundo estático da UI (ChatGPT Image)
│   └── logo.png                 # Logo do time (Meu time.png)
├── types/
│   ├── game.ts                  # Atualizado Screen type para incluir todas as telas
│   └── settings.ts              # Expandido com novos campos de configuração
├── constants/
│   ├── formations.ts            # Atualizado com export FORMATIONS
│   └── ...                      # Outros constants existentes
├── App.tsx                      # Atualizado para usar o novo sistema de menus
├── main.tsx                     # Entrada do React (inalterado)
└── index.css                    # CSS global (inalterado)
```

## Características Implementadas

### 1. Gerenciamento de Estado Centralizado
- Criado `GameContext` com estado para: `screen`, `settings`, `playerSlots`
- Funções para atualizar estado: `setScreen`, `updateSettings`, `setPlayerSlots`
- Persistência automática em `localStorage` via `settingsStorage`

### 2. Telas Implementadas

#### SPLASH Screen
- Fundo estático com `/assets/background.png`
- Logo centralizada com `/assets/logo.png`
- Texto piscante: "PRESSIONE QUALQUER TECLA PARA INICIAR"
- `useEffect` escutando `keydown` global para transição para `MAIN`

#### MAIN Screen
- Efeito glassmorphism com `backdrop-blur` e bordas neon
- Layout CSS Grid (4 colunas x 2 linhas) centralizado
- Botões com funcionalidades:
  - JOGO RÁPIDO → `PLAY`
  - ARCADE → Desabilitado com badge "Em Breve"
  - MULTIPLAYER → Desabilitado com badge "Em Breve"
  - MODO TREINO → `PLAY` (por enquanto)
  - SETTINGS → Navega para `SETTINGS`
  - MEU ELENCO → Navega para `ELENCO`
  - EDITAR → Navega para `EDITAR`
  - ESTATÍSTICAS → Desabilitado com badge "Em Breve"

#### SETTINGS Screen
- Abas: ÁUDIO, IDIOMA, DIFICULDADE, VISUAL
- ÁUDIO: Sliders para Volume Principal, Música, SFX (0-100)
- IDIOMA: Toggle entre Português (BR) e English
- DIFICULDADE: Dropdown (Fácil, Médio, Difícil) - placeholder
- VISUAL: Toggles para Grade de Fundo e Linhas de Varredura (CRT)

#### EDITAR Screen
- Menu lateral com abas: APARENÇA DO MENU, TIMES (TIME A), CAMPO, PEÇAS
- Cada aba implementada como componente separado

#### ELENCO Screen
- Prancheta tática simples
- Seleção de "Formação Padrão" com botão SALVAR
- Salva preferência (por enquanto apenas navega de volta ao MAIN)

#### STATS Screen
- Placeholder "Em Breve" para futuras implementações

### 3. Integração com Engine do Canvas
- Quando estado = `'PLAY'`, o menu desaparece e a engine do Canvas é iniciada
- O `App.tsx` condicionalmente renderiza o menu overlay ou o componente `Match`
- Todas as configurações são passadas para a engine via contexto

### 4. Estilo e Temática
- Fundo estático usando o arquivo fornecido (`background.png`)
- Logo usando o arquivo fornecido (`logo.png`)
- Sistema de cores neon configurável através do `accentColor`
- Efeitos glassmorphism, blur, e neon glow
- Responsividade básica com unidades relativas

## Próximos Passos Sugeridos

1. **Conectar personalizações à engine**: Passar as configurações de cor, formação, etc. para o componente `Match`
2. **Implementar salvamento real**: O botão SALVAR nas telas EDITAR e ELENCO deveria efetivamente salvar as preferências
3. **Adicionar animações de transição**: Melhorar as transições entre telas com framer-motion
4. **Implementar lógica das telas WIP**: ARCADE, MULTIPLAYER, ESTATÍSTICAS
5. **Refinamento visual**: Ajustar espaçamentos, tipografia e efeitos para melhorar a experiência

## Verificação de Build
✅ Build de produção successful via `pnpm run build`
✅ Nenhum erro de TypeScript durante o build
✅ Todos os componentes exportados e importados corretamente