# Weft

A reactive, spatial JavaScript parameter exploration environment. Create nodes containing JavaScript code on an infinite canvas — variables become interactive controls, expressions compute live, and dependencies draw themselves as visual curves.

## What is Weft?

Weft is an interactive canvas where you write JavaScript in small, connected nodes. Declare a variable and it becomes a slider, toggle, or text input. Reference that variable in another node and a dependency edge appears automatically. Change a value and everything downstream updates instantly.

Use it for parameter exploration, live visualization, computational sketching, or teaching how data flows through code.

## Features

**Reactive canvas**
- Automatic dependency detection — no manual wiring
- Topological evaluation ensures correct computation order
- Pan, zoom (25%–400%), minimap navigation

**Interactive controls**
- `var`/`let` + number → slider
- `var`/`let` + boolean → toggle
- `var`/`let` + string → text input
- `const` / expressions → display-only

**Pragmas**
- `// @range(min, max, step)` — custom slider range
- `// @log` — logarithmic slider
- `// @int` — integer-only slider
- `// @color` — color picker
- `// @hidden` — hide from display
- `// @sparkline` — mini line chart tracking value over time
- `// @graph(x, y)` — multi-series plot

**Execution modes**
- **Live** — fully reactive, updates on every change
- **Stepped** — pause, play, scrub, and step through execution at line or node granularity
- Time variables (`t`, `dt`) injected into scope

**Visual feedback**
- Colored type stripes per row
- Bézier edges with data-pulse animations
- Sparklines and graphs
- Edge glow on value propagation

**Persistence**
- Auto-saves to localStorage every 2 seconds
- Export / import as JSON
- Editable filename in the toolbar

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/weft/`.

## Build

```bash
npm run build    # production bundle → dist/
npm run preview  # preview the production build
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `N` | New node |
| Double-click canvas | New node at cursor |
| Double-click node | Edit code |
| `Escape` | Stop editing / deselect |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+D` | Duplicate selection |
| `Delete` / `Backspace` | Delete selection |
| `Space` | Play/pause (stepped) or pan (live) |
| `.` / `,` | Step forward / back |
| `Home` / `End` | Jump to start / end |
| `T` | Toggle live / stepped mode |
| `G` | Toggle line / node granularity |
| `L` | Toggle loop |
| `[` / `]` | Adjust playback speed |
| `M` | Toggle minimap |
| `E` | Toggle execution panel |

## Project structure

```
src/
├── store/canvasStore.ts     # Zustand state + actions
├── parser/
│   ├── parseNode.ts         # Acorn-based code → ParsedRow[]
│   ├── pragmas.ts           # @range, @log, etc.
│   ├── dag.ts               # Dependency graph + topo sort
│   └── sequencer.ts         # DAG → ExecutionStep[]
├── components/
│   ├── Canvas.tsx            # Pan/zoom container
│   ├── Node.tsx              # Node shell
│   ├── NodeEditor.tsx        # CodeMirror editor
│   ├── Edge.tsx              # Bézier edges
│   ├── Toolbar.tsx           # Top bar
│   ├── TransportBar.tsx      # Playback controls
│   ├── ExecutionPanel.tsx    # Execution step list
│   ├── Minimap.tsx           # Canvas overview
│   ├── Sparkline.tsx         # Mini line chart
│   ├── Graph.tsx             # Multi-series chart
│   └── rows/                 # Row renderers (slider, toggle, etc.)
├── theme/catppuccin-frappe.ts
└── utils/
```

## Tech stack

- **React 19** + **TypeScript**
- **Zustand** for state management
- **Acorn** for JavaScript parsing
- **CodeMirror 6** for code editing
- **Vite** for dev/build
- **Catppuccin Frappé** color theme

## License

MIT
