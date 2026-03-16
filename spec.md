# Reactive Canvas — Specification

**A spatial, reactive JavaScript parameter exploration environment.**

Double-click a canvas to create nodes. Type JavaScript inside them. Variables become interactive controls. Expressions compute live. Dependencies draw themselves as curves.

---

## 1. Core Concepts

### 1.1 The Canvas

An infinite pannable, zoomable 2D canvas. The background is a subtle dot grid (Catppuccin Frappé `surface0` dots on `base` background) to aid spatial orientation.

- **Pan:** Middle-click drag, or Space + left-click drag
- **Zoom:** Scroll wheel, pinch. Range: 25%–400%, snaps to 100% on double-tap of zoom control
- **Minimap:** Optional small inset (bottom-right) showing all nodes at a glance

### 1.2 The Reactive Graph

All nodes exist in a single shared scope. When a node declares `var x = 10`, the symbol `x` is available to every other node. When `x` changes (via slider interaction), every node that references `x` recomputes.

This forms a **directed acyclic graph (DAG)** of dependencies. Cycles are detected and flagged as errors rather than causing infinite loops.

---

## 2. Nodes

### 2.1 Creating a Node

- **Double-click** on empty canvas → creates a new node at that position
- Node appears in **edit mode** immediately: a minimal code editor (monospace textarea) with syntax highlighting
- The node has a subtle drop shadow and a `surface1` background with a 1px `surface2` border, rounded corners (8px)

### 2.2 Edit Mode

While editing, the node is a raw text input area using **Monaspace Argon** at 13px. Minimal syntax highlighting within the editor:

| Token         | Colour                          |
|---------------|---------------------------------|
| `var`         | Catppuccin Frappé `green`       |
| `const`       | Catppuccin Frappé `mauve`       |
| `let`         | Catppuccin Frappé `peach`       |
| identifier    | Catppuccin Frappé `text`        |
| number        | Catppuccin Frappé `peach`       |
| string        | Catppuccin Frappé `green`       |
| operator      | Catppuccin Frappé `sky`         |
| comment       | Catppuccin Frappé `overlay0`    |
| keyword       | Catppuccin Frappé `mauve`       |
| function call | Catppuccin Frappé `blue`        |
| error         | Catppuccin Frappé `red`         |

Pressing **Escape** or **clicking outside** the node exits edit mode and triggers rendering.

**Double-clicking** a rendered node re-enters edit mode.

### 2.3 Rendered Mode

When a node exits edit mode, the raw code is parsed and the node transforms into a **rendered card**. The card displays one **row** per statement, stacked vertically.

Each row follows this structure:

```
┌─────────────────────────────────────────────┐
│ ▎ type stripe                               │  ← 3px left border, colour = declaration type
│ name                                  value  │  ← left-aligned name, right-aligned value
│ ═══════════════════════════════════════════  │  ← slider (if var + number)
└─────────────────────────────────────────────┘
```

The **type stripe** (3px vertical bar on the left edge of each row) is coloured by declaration kind:

| Declaration | Stripe Colour                  | Meaning                    |
|-------------|--------------------------------|----------------------------|
| `var`       | Catppuccin Frappé `green`      | Mutable, interactive       |
| `const`     | Catppuccin Frappé `mauve`      | Immutable, display only    |
| `let`       | Catppuccin Frappé `peach`      | Mutable, interactive       |
| expression  | Catppuccin Frappé `blue`       | Computed output            |

Rows are separated by a 1px `surface2` divider line.

### 2.4 Row Rendering Rules

The rendering of each row depends on the declaration type and value type:

#### `var` (or `let`) + number

```
┌──────────────────────────────────┐
│ ▎ slip_threshold             20  │
│ ▎ ◄══════════════●══════════════►│
└──────────────────────────────────┘
```

- Name on the left in `text` colour
- Current value on the right in `peach`, **editable** (click to type a precise value)
- Horizontal slider below, styled as a thin track (`surface2`) with a `green` filled portion and a `green` thumb
- **Slider range heuristic** (see §2.5)
- Dragging the slider updates the value in real time and triggers downstream recomputation

#### `var` (or `let`) + string

```
┌──────────────────────────────────┐
│ ▎ label          [ my string  ]  │
└──────────────────────────────────┘
```

- Name on the left
- Inline text input on the right, styled with `surface0` background, 1px `surface2` border, rounded 4px
- Typing triggers downstream recomputation on each keystroke (debounced 150ms)

#### `var` (or `let`) + boolean

```
┌──────────────────────────────────┐
│ ▎ enabled                   [●]  │
└──────────────────────────────────┘
```

- Toggle switch on the right, `green` when on, `surface2` when off

#### `var` (or `let`) + array

```
┌──────────────────────────────────┐
│ ▎ weights         [0.2, 0.5, 1]  │
│ ▎                      ✎ edit    │
└──────────────────────────────────┘
```

- Displayed as formatted JSON string
- "✎ edit" link opens inline JSON editor or returns node to edit mode for that row

#### `const` + any type

```
┌──────────────────────────────────┐
│ ▎ PI                  3.14159…   │
└──────────────────────────────────┘
```

- Name on the left, value on the right
- **No interactive control.** Value is displayed in `subtext0` colour to visually distinguish from interactive rows
- Numbers formatted to reasonable precision; strings shown in quotes; booleans as `true`/`false`; objects/arrays as collapsed JSON

#### Expression (computed value, e.g. `c = a + b`)

```
┌──────────────────────────────────┐
│ ▎ c                         30   │  ← blue stripe, computed
└──────────────────────────────────┘
```

- Treated similarly to `const` — displays the computed result, no direct interaction
- Blue stripe indicates this is derived, not authored
- If the expression result is an **object or array**, render as collapsed JSON with expand toggle
- If the expression is a **bare expression** with no assignment (e.g. `a * 2`), display with name `_result` or `_expr_N`

#### Expression returning a visual (advanced, future)

If an expression returns a DOM element, Canvas, SVG, or a Plot/chart object, the node row expands to embed the visual inline. This enables e.g.:

```js
const chart = Plot.lineY(data, {x: "t", y: "v"})
```

...rendering a live chart inside the node that updates when `data` changes.

### 2.5 Slider Range Heuristic

When a `var` is a number and no explicit range is given, the slider range is inferred:

| Initial value `v` | Min           | Max           | Step          |
|-------------------|---------------|---------------|---------------|
| `v === 0`         | -1            | 1             | 0.01          |
| `v > 0`           | 0             | v × 2         | smart(v)      |
| `v < 0`           | v × 2         | 0             | smart(v)      |

Where `smart(v)` picks a step that gives ~200 discrete positions across the range (i.e. `(max - min) / 200`), rounded to a clean decimal.

**Explicit range override** — the user can annotate with a comment:

```js
var frequency = 440  // @range(20, 20000, 1)
```

The `@range(min, max, step)` pragma is parsed from trailing comments. Additional pragmas:

- `@log` — logarithmic slider scale
- `@int` — integer steps only
- `@color` — render as colour picker (for hex string values)
- `@hidden` — do not display this row (useful for intermediate calculations)

### 2.6 Node Header

Each node has a thin header bar above all rows:

```
┌──────────────────────────────────┐
│  ◉ Node 3                   ✕ ✎ │  ← header
├──────────────────────────────────┤
│  ▎ rows...                       │
└──────────────────────────────────┘
```

- **Drag handle:** the entire header is draggable to reposition the node
- **◉** Colour dot: `green` if all values are valid, `red` if any errors, `yellow` if stale / computing
- **Title:** auto-generated as "Node N" but editable (click to rename). If the node contains a single variable, auto-titles to that variable name
- **✕** Delete button (with confirmation if node has dependents)
- **✎** Edit button to re-enter edit mode

### 2.7 Node Sizing

- **Width:** min 200px, max 400px. Auto-expands to fit the longest name + value, or can be manually resized by dragging the right edge
- **Height:** determined by content (number of rows × row height)
- Row height: ~36px for simple values, ~52px for values with sliders

---

## 3. Connections (Dependency Edges)

### 3.1 Automatic Wiring

When a node references a symbol defined in another node, a **dependency edge** is drawn automatically. No manual wiring — the parser detects references.

Example:
- Node A: `var a = 10`
- Node B: `var b = 20`
- Node C: `const c = a + b`

Edges are drawn: A→C, B→C.

### 3.2 Edge Rendering

Edges are **cubic Bézier curves** connecting the source node's right edge to the target node's left edge.

```
Source node ─────╮
                  ╰──────── Target node
```

Specifically:
- **Start point:** right edge of the source row (vertically centred on the specific row that defines the symbol), with a small 6px circular **port dot**
- **End point:** left edge of the target row that references the symbol, with a matching port dot
- **Control points:** horizontal offset of `0.4 × distance` to create a smooth S-curve. At short distances the curve is gentle; at long distances it arcs more dramatically
- **Stroke:** 1.5px, colour is the **source row's stripe colour** at 60% opacity
- **Hover:** on hover, the edge thickens to 2.5px and goes to full opacity; both connected rows highlight with a subtle `surface2` background pulse
- **Animation:** when a value updates, a small dot (the stripe colour at full opacity) animates along the curve from source to target over 200ms — a "data pulse" showing the propagation

### 3.3 Port Dots

Each row that defines an exported symbol shows a small **output port** (6px circle) on its right edge. Each row that references an external symbol shows a small **input port** on its left edge.

- Output port: filled with the stripe colour
- Input port: ring (1.5px stroke) in the colour of the source symbol's stripe
- Hover on a port highlights all connected edges

### 3.4 Edge Routing

When nodes overlap or edges would cross many nodes, edges should route with a slight vertical offset to reduce visual clutter. A simple heuristic: if the straight-line path between two ports passes through another node's bounding box, add a vertical waypoint above or below the obstruction.

For v1, simple Bézier without avoidance routing is acceptable.

---

## 4. Execution Model

The canvas has two execution modes: **Live** (immediate reactivity) and **Stepped** (time-based playback). Both use the same underlying evaluation order, derived from the dependency graph.

### 4.1 Dependency Tracking & Evaluation Order

All nodes are parsed to extract:
1. **Declarations:** symbols this node defines (var/let/const + identifier + initial value)
2. **References:** symbols this node reads that it does not define (free variables)
3. **Expressions:** computed assignments

This forms a **directed acyclic graph (DAG)**. The evaluation order is determined by walking backwards up the graph from leaf nodes (those with no dependents) to root nodes (those with no dependencies). Concretely:

1. Build the DAG from all parsed references
2. Topologically sort: roots first, leaves last
3. Within a single node, lines execute top-to-bottom

This produces a **flat execution sequence** — an ordered list of every individual line across all nodes. Example:

```
Node A, line 1:   var a = 10           ← root (no dependencies)
Node A, line 2:   var b = 20           ← root
Node B, line 1:   const c = a + b      ← depends on A
Node B, line 2:   const d = c * 2      ← depends on B line 1
Node C, line 1:   const out = d + a    ← depends on A and B
```

The execution sequence is: `A:1 → A:2 → B:1 → B:2 → C:1`

This sequence is displayed in the **Execution Order Panel** (see §4.5) and is the basis for stepped playback.

### 4.2 Live Mode (Default)

In live mode, the canvas behaves as a fully reactive environment. When any value changes (slider drag, text input, toggle):

1. The changed row is marked dirty
2. All downstream rows (per the topological sort) are re-evaluated in order
3. Values update immediately
4. Data pulse animations fire on affected edges

This is the default mode for interactive parameter exploration. Slider drags must feel instant (<16ms per update).

### 4.3 Stepped Mode (Time-Based Playback)

Stepped mode replays the execution sequence at a controllable rate, making the evaluation order visible. This is essential for understanding *how* values propagate through the graph, debugging dependency issues, and teaching/presenting.

#### 4.3.1 Transport Controls

A transport bar sits at the bottom of the canvas (docked, always visible):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◄◄  ◄  ▶ / ❚❚  ►  ►►  │  Step 3 / 12  │  ●───────○─────────  │  10 sps  │
│  ↑    ↑    ↑       ↑  ↑      ↑               ↑ scrubber            ↑       │
│  start back play  fwd end  counter          position             speed     │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Control                | Action                                                |
|------------------------|-------------------------------------------------------|
| **◄◄** (Start)         | Jump to step 0 (all values at initial state)          |
| **◄** (Step back)      | Go back one step (undo the last evaluated line)       |
| **▶** (Play)           | Begin automatic playback at the set speed             |
| **❚❚** (Pause)         | Pause playback at the current step                    |
| **►** (Step forward)   | Advance one step (evaluate the next line)             |
| **►►** (End)           | Jump to final step (all values fully evaluated)       |
| **Scrubber**           | Drag to jump to any step in the sequence              |
| **Speed**              | Steps per second (sps). Range: 0.5 – 60 sps          |
| **Step counter**       | Shows `Step N / Total` with the current line's source |

#### 4.3.2 Granularity Toggle

The transport bar includes a granularity toggle:

```
[ Nodes ▼ ]  ←→  [ Lines ]
```

| Mode       | Behaviour                                                     |
|------------|---------------------------------------------------------------|
| **Nodes**  | Each "step" evaluates an entire node (all its lines at once)  |
| **Lines**  | Each "step" evaluates a single line within a node             |

In **Nodes** mode, the step count equals the number of nodes in topological order. In **Lines** mode, the step count equals the total number of executable lines across all nodes.

#### 4.3.3 Visual Feedback During Playback

As the execution pointer advances through the sequence:

1. **Active highlight:** The currently-executing row gets a `sapphire` background pulse (200ms fade-in, holds while active, 300ms fade-out when moving on). In Nodes mode, the entire node gets the highlight.

2. **Edge animation:** When a step consumes an input from another node, the connecting edge fires a data-pulse dot (the stripe colour, animated along the Bézier over 150ms) *before* the row evaluates. This shows data flowing in.

3. **Value reveal:** As each row evaluates, its value appears with a brief "typewriter" number-morph animation (50ms). Rows that haven't been reached yet show their values dimmed at 30% opacity with a `—` placeholder, or their previous-step value if re-evaluating.

4. **Trail:** Rows that have already been evaluated in the current playback get a subtle 2px left border in `sapphire` (in addition to their type stripe) to show the execution frontier — everything above the line is "done", everything below is "pending."

5. **Scope snapshot:** At each step, the global scope is captured. The scrubber can jump to any step and restore that snapshot, showing the exact state of all values at that point in the evaluation.

#### 4.3.4 Playback + Interaction

During stepped playback, sliders and inputs remain interactive. If the user changes a `var` value while paused mid-sequence:

- The execution resets to the step *after* the changed row
- All downstream steps are marked as stale (dimmed)
- The user can resume playback from the new state
- This allows "what if" exploration mid-execution: pause, tweak a parameter, continue

#### 4.3.5 Loop Mode

A toggle to loop playback continuously:

```
[ 🔁 Loop ]
```

When enabled, after reaching the final step, playback resets to step 0 and replays. Useful for visualising a recurring computation cycle — especially if a `t` (time) variable auto-increments on each loop (see §4.6).

### 4.4 Evaluation Internals

Each node is compiled into a function:

```js
function node_N(scope) {
  // declarations and expressions from the node's code
  // returns an object of all declared symbols
}
```

The global scope is an object. When node_N is evaluated, it reads from and writes to this scope.

For **line-level stepping**, each line within a node is compiled individually:

```js
// Node contains:
//   var a = 10
//   const b = a * 2

// Compiled as two step functions:
function node_N_line_0(scope) { scope.a = 10; return { a: 10 }; }
function node_N_line_1(scope) { const b = scope.a * 2; scope.b = b; return { b }; }
```

This allows the stepper to pause between lines within a single node.

### 4.5 Execution Order Panel

A collapsible side panel (right edge of canvas, toggle with `E` key) showing the flattened execution sequence:

```
┌─ Execution Order ──────────────┐
│                                │
│  1  ▎ A    var a = 10       ✓  │  ← green check: evaluated
│  2  ▎ A    var b = 20       ✓  │
│  3  ▎ B    const c = a + b  ●  │  ← sapphire dot: current step
│  4  ▎ B    const d = c * 2  ○  │  ← hollow: pending
│  5  ▎ C    const out = d+a  ○  │
│                                │
│  ─────────────────────────     │
│  Nodes: 3  Lines: 5           │
│  Cycle: none detected          │
└────────────────────────────────┘
```

Each row in the panel:
- Shows the step number, source node name (colour-coded to match node header), and the line of code (truncated)
- Clicking a row in the panel jumps playback to that step
- Hovering a row highlights the corresponding node and row on the canvas, plus all its incoming edges
- In Nodes granularity, rows are grouped under their node header

### 4.6 Time Variable (`t`)

A built-in global variable `t` is automatically available in scope. Its behaviour depends on mode:

| Mode                | `t` value                                                 |
|---------------------|-----------------------------------------------------------|
| Live mode           | Increments by `dt` on each reactive tick (tied to `requestAnimationFrame` or a configurable interval). Starts at 0 when the canvas loads. |
| Stepped mode        | Equals the current step index (0, 1, 2, ...). In loop mode, resets to 0 each loop. |
| Stepped + Loop      | Monotonically increasing: `loopCount * totalSteps + currentStep` |

The user can also declare their own `var t = 0` and it will shadow the built-in, giving them full control.

Additionally, `dt` is available as the time delta since the last evaluation tick (in seconds). In stepped mode, `dt = 1 / stepsPerSecond`.

### 4.7 Error Handling

- **Syntax errors** in a node: the node header dot turns `red`, the code area shows inline error with `red` underline and a tooltip. The node does not export any symbols; dependent nodes show their values as `⚠ undefined`
- **Reference errors** (symbol not found): the input port renders as a hollow `red` ring. The edge is drawn as a dashed line in `red`
- **Cycle detected:** all nodes in the cycle get a `red` header dot and an error banner: "Circular dependency detected." Evaluation stops for those nodes; unaffected nodes continue to work. The Execution Order Panel shows the cycle with a red highlight.
- **Runtime errors** (division by zero, type error, etc.): the specific row shows the error message in `red` below the row, value displays as `NaN` or `Error`
- **Step-level errors:** In stepped mode, if a step throws, playback pauses at that step. The error is shown inline on the row. The user can fix the code, and playback resumes from the corrected step.

### 4.8 Performance

- **Live mode:** Slider drags must feel instant (<16ms per full reactive chain update)
- **Stepped mode at high speed:** At 60 sps, visual updates are batched to requestAnimationFrame. The evaluation itself runs ahead and scope snapshots are captured, so the UI is never blocked.
- For expensive computations, debounce at 32ms and show a `yellow` status dot during computation
- Consider using a Web Worker for evaluation if the computation graph grows large
- Memoize nodes whose inputs have not changed (check by identity/equality)
- **Scope snapshots:** For scrubber support, store scope snapshots at each step. For graphs with <100 steps, store all snapshots. For larger graphs, store every Nth snapshot and replay forward from the nearest checkpoint.

---

## 5. Interaction Details

### 5.1 Selection

- **Click** a node to select it (blue `sapphire` outline, 2px)
- **Shift+Click** to multi-select
- **Drag** on empty canvas to rubber-band select
- **Delete/Backspace** deletes selected nodes (with confirmation if they have dependents)
- **Ctrl+D / Cmd+D** duplicates selected nodes (new node with same code, offset 20px down-right)

### 5.2 Copy / Paste

- **Ctrl+C** copies selected nodes' source code as JSON: `[{code: "var x = 10", position: {x, y}}, ...]`
- **Ctrl+V** pastes nodes at the cursor position
- Pasting plain text (not node JSON) creates a new node with that text as the code

### 5.3 Undo / Redo

Full undo/redo stack for:
- Node creation/deletion
- Code edits
- Value changes (coalesce rapid slider drags into a single undo entry — group changes within 500ms)
- Node position changes

### 5.4 Keyboard Shortcuts

| Action              | Shortcut              |
|---------------------|-----------------------|
| New node            | `N` (when no node is focused) |
| Edit selected node  | `Enter`               |
| Exit edit mode      | `Escape`              |
| Delete selected     | `Delete` / `Backspace`|
| Select all          | `Ctrl+A`              |
| Undo                | `Ctrl+Z`              |
| Redo                | `Ctrl+Shift+Z`        |
| Duplicate           | `Ctrl+D`              |
| Zoom to fit         | `Ctrl+0`              |
| Centre on selection | `Ctrl+.`              |
| Toggle minimap      | `M`                   |
| Search nodes        | `Ctrl+K`              |
| **Playback**        |                       |
| Play / Pause        | `Space` (when no node is focused) |
| Step forward         | `.` (period)          |
| Step back           | `,` (comma)           |
| Jump to start       | `Home`                |
| Jump to end         | `End`                 |
| Toggle Lines/Nodes  | `G`                   |
| Toggle exec panel   | `E`                   |
| Toggle loop         | `L`                   |
| Speed up            | `]`                   |
| Speed down          | `[`                   |
| Toggle Live/Stepped | `T`                   |

### 5.5 Context Menu

Right-click on empty canvas:
- New node here
- Paste
- Zoom to fit
- Toggle grid / minimap

Right-click on a node:
- Edit
- Duplicate
- Delete
- Collapse/Expand
- Set colour tag (for visual grouping — adds a thin coloured bar to the header)

---

## 6. Parsing

### 6.1 Supported Syntax

The editor should accept any valid JavaScript, but **specially handles** the following patterns:

```
var <name> = <literal>           → interactive control
let <name> = <literal>           → interactive control
const <name> = <literal>         → display only
const <name> = <expression>      → computed display
<name> = <expression>            → computed display (implicit assignment)
```

Where `<literal>` is a number, string, boolean, array literal, or object literal.

Where `<expression>` may reference symbols from other nodes.

### 6.2 Multi-line Nodes

A single node can contain multiple statements:

```js
var kp = 0.5
var ki = 0.1
var kd = 0.02
const sum = kp + ki + kd
```

This renders as four stacked rows, each with appropriate controls.

### 6.3 Complex Code Blocks

For code that isn't a simple declaration/expression (e.g. loops, conditionals, function definitions), the node renders the code block in a read-only highlighted view, and shows the final returned/assigned values as interactive rows below:

```js
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}
```

Renders as:
```
┌──────────────────────────────────┐
│  ◉ clamp                        │
├──────────────────────────────────┤
│  ▎ function clamp(val, min, max) │  ← code preview, blue stripe
│  ▎ → ƒ(val, min, max)           │  ← shows it's a callable function
└──────────────────────────────────┘
```

The function `clamp` is now available in scope for other nodes to call.

### 6.4 Destructuring & Imports

```js
const { sin, cos, PI } = Math
```

This exports `sin`, `cos`, and `PI` as separate rows in the node, each as a `const`.

---

## 7. Visual Design

### 7.1 Theme: Catppuccin Frappé

All colours sourced from the Catppuccin Frappé palette:

| Token       | Hex       | Usage                                  |
|-------------|-----------|----------------------------------------|
| `base`      | `#303446` | Canvas background                      |
| `mantle`    | `#292c3c` | Node background                        |
| `crust`     | `#232634` | Deepest background (minimap, panels)   |
| `surface0`  | `#414559` | Grid dots, track backgrounds, dividers |
| `surface1`  | `#51576d` | Borders, inactive elements             |
| `surface2`  | `#626880` | Hover states, secondary borders        |
| `overlay0`  | `#737994` | Comments, disabled text                |
| `overlay1`  | `#838ba7` | Placeholder text                       |
| `subtext0`  | `#a5adce` | Secondary text (const values)          |
| `subtext1`  | `#b5bfe2` | —                                      |
| `text`      | `#c6d0f5` | Primary text                           |
| `rosewater` | `#f2d5cf` | —                                      |
| `flamingo`  | `#eebebe` | —                                      |
| `pink`      | `#f4b8e4` | —                                      |
| `mauve`     | `#ca9ee6` | `const` stripe & keywords              |
| `red`       | `#e78284` | Errors, cycle detection                |
| `maroon`    | `#ea999c` | —                                      |
| `peach`     | `#ef9f76` | `let` stripe, number literals          |
| `yellow`    | `#e5c890` | Warnings, computing state              |
| `green`     | `#a6d189` | `var` stripe, strings, slider fill     |
| `teal`      | `#81c8be` | —                                      |
| `sky`       | `#99d1db` | Operators                              |
| `sapphire`  | `#85c1dc` | Selection outline                      |
| `blue`      | `#8caaee` | Expressions, computed values, links    |
| `lavender`  | `#babbf1` | —                                      |

### 7.2 Typography

| Element         | Font                  | Weight  | Size  |
|-----------------|-----------------------|---------|-------|
| Node code       | Monaspace Argon       | 400     | 13px  |
| Row name        | Monaspace Argon       | 500     | 12px  |
| Row value       | Monaspace Argon       | 600     | 12px  |
| Node header     | Monaspace Argon       | 600     | 11px  |
| Error messages  | Monaspace Argon       | 400     | 11px  |
| Minimap labels  | Monaspace Argon       | 400     | 9px   |
| Slider value    | Monaspace Argon       | 500     | 11px  |

Line height: 1.5 for code, 1.3 for UI labels.

### 7.3 Shadows & Depth

- Nodes: `0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)`
- Selected nodes lift: `0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)`
- Dragging nodes: additional 2px Y offset and slight scale (1.01) for a "picked up" feel
- Edges: no shadow, but data-pulse dots get a small glow: `0 0 6px <stripe-colour>`

### 7.4 Animations

| Action                 | Duration | Easing              |
|------------------------|----------|---------------------|
| Node appear            | 200ms    | ease-out            |
| Node delete            | 150ms    | ease-in (fade+scale)|
| Edit → Render          | 250ms    | ease-in-out         |
| Slider value update    | 0ms      | immediate           |
| Dependent value update | 50ms     | ease-out (number morphing) |
| Data pulse on edge     | 200ms    | linear              |
| Selection outline      | 150ms    | ease-out            |
| Zoom/Pan               | —        | inertial / spring   |

### 7.5 Node Layout Examples

**Simple single variable:**
```
┌──────────────────────────────────┐
│  ◉ slip_threshold            ✕ ✎ │
├──────────────────────────────────┤
│ ▎ slip_threshold            0.20 │
│ ▎ ◄═══════●════════════════════►│
└──────────────────────────────────┘
```

**Multi-variable node:**
```
┌──────────────────────────────────┐
│  ◉ PID Gains                 ✕ ✎ │
├──────────────────────────────────┤
│ ▎ kp                        0.50 │  ← green stripe (var)
│ ▎ ◄══════════●══════════════════►│
│──────────────────────────────────│
│ ▎ ki                        0.10 │  ← green stripe (var)
│ ▎ ◄══●══════════════════════════►│
│──────────────────────────────────│
│ ▎ kd                        0.02 │  ← green stripe (var)
│ ▎ ◄●════════════════════════════►│
│──────────────────────────────────│
│ ▎ sum                       0.62 │  ← blue stripe (computed)
└──────────────────────────────────┘
```

**Mixed const/var node:**
```
┌──────────────────────────────────┐
│  ◉ Physics                   ✕ ✎ │
├──────────────────────────────────┤
│ ▎ const mass              3.0 kg │  ← mauve stripe
│──────────────────────────────────│
│ ▎ var friction              0.80 │  ← green stripe
│ ▎ ◄══════════════●═════════════►│
│──────────────────────────────────│
│ ▎ const g                  9.81  │  ← mauve stripe
│──────────────────────────────────│
│ ▎ normalForce            29.43 N │  ← blue stripe (computed)
└──────────────────────────────────┘
```

---

## 8. Persistence & Serialisation

### 8.1 Save Format

The entire canvas state serialises to JSON:

```json
{
  "version": 1,
  "viewport": { "x": 0, "y": 0, "zoom": 1.0 },
  "nodes": [
    {
      "id": "node_1",
      "code": "var slip_threshold = 0.12  // @range(0, 0.5, 0.01)",
      "position": { "x": 100, "y": 200 },
      "width": 260,
      "title": "slip_threshold",
      "collapsed": false,
      "colorTag": null
    }
  ]
}
```

Edges are not stored — they are derived from the code at load time.

### 8.2 Storage

- **Auto-save** to `localStorage` every 2 seconds (debounced)
- **Export** as `.json` file
- **Import** from `.json` file (drag-and-drop onto canvas or file picker)
- **Share** via URL hash (for small graphs, base64-encoded state in URL fragment)

---

## 9. Advanced Features (v2+)

### 9.1 Groups / Frames

Drag to create a named rectangular frame behind nodes. Frames have a label, a background tint (from the colour tag palette), and move all contained nodes when dragged.

### 9.2 Collapse / Expand

Any node can be collapsed to show only its header and output ports. Edges remain connected. Useful for hiding implementation detail.

### 9.3 Presets / Snapshots

Save the current state of all `var` values as a named preset. Switch between presets to compare parameter configurations.

```
[Dry Road ▼]  [Wet Grass]  [Ice]  [+ Save]
```

### 9.4 Visual Outputs

Nodes that return a DOM element, SVG, or Canvas render that visual inline within the node, auto-sized. This enables:

```js
// A Plot chart that updates reactively
Plot.lineY(simData, {x: "t", y: "v", stroke: "white"})
```

### 9.5 Execution History / Replay Log

Record a full session (all slider interactions, code edits, and playback events) as a replayable log. Enables:
- Sharing a walkthrough as a file that replays the exact sequence of interactions
- "Time travel" debugging: scrub back through the entire session, not just the current evaluation sequence
- Exporting as a video or animated GIF of the canvas

### 9.6 Node Templates / Library

A sidebar panel with draggable pre-built nodes:
- **Trig:** `sin`, `cos`, `atan2` with input ports
- **Clamp:** `clamp(val, min, max)`
- **Lerp:** `lerp(a, b, t)`
- **Map Range:** `mapRange(val, inMin, inMax, outMin, outMax)`
- **Pacejka:** pre-built tyre model
- **PID:** pre-built PID controller with `kp`, `ki`, `kd` sliders

---

## 10. Technical Architecture

### 10.1 Recommended Stack

| Layer           | Technology                                  |
|-----------------|---------------------------------------------|
| Rendering       | HTML Canvas (via `@xyflow/react` / React Flow) or pure SVG |
| UI framework    | React 18+                                   |
| Code parsing    | Acorn (lightweight JS parser)               |
| Syntax highlight| Custom tokeniser or Lezer (CodeMirror's parser) |
| Code editor     | CodeMirror 6 (embedded in edit mode)        |
| Reactivity      | Custom topological-sort evaluator           |
| Charts (v2)     | Observable Plot or D3                       |
| State           | Zustand (lightweight, fits well)            |
| Persistence     | localStorage + file export                  |

### 10.2 Key Data Structures

```typescript
interface CanvasState {
  nodes: Map<string, NodeState>;
  viewport: { x: number; y: number; zoom: number };
  scope: Record<string, any>;       // current global scope values
  dag: Map<string, string[]>;       // nodeId → [dependent nodeIds]
  errors: Map<string, string[]>;    // nodeId → error messages
  execution: ExecutionState;        // stepper / playback state
}

interface ExecutionState {
  mode: "live" | "stepped";
  granularity: "nodes" | "lines";
  sequence: ExecutionStep[];        // flattened evaluation order
  currentStep: number;              // index into sequence (0-based)
  playing: boolean;
  looping: boolean;
  stepsPerSecond: number;           // 0.5 – 60
  loopCount: number;                // how many times the sequence has looped
  snapshots: Map<number, Record<string, any>>;  // step index → scope snapshot
  snapshotInterval: number;         // store every Nth snapshot (1 for small graphs)
}

interface ExecutionStep {
  nodeId: string;
  lineIndex: number;                // line within the node (0-based)
  code: string;                     // the source line
  compiledFn: (scope: Record<string, any>) => Record<string, any>;
  symbolsWritten: string[];         // symbols this step produces
  symbolsRead: string[];            // symbols this step consumes
  status: "pending" | "active" | "evaluated" | "error";
  error?: string;
}

interface NodeState {
  id: string;
  code: string;
  position: { x: number; y: number };
  width: number;
  title: string;
  collapsed: boolean;
  colorTag: string | null;
  parsedRows: ParsedRow[];          // derived from code
}

interface ParsedRow {
  kind: "var" | "let" | "const" | "expression" | "function" | "complex";
  name: string;
  valueType: "number" | "string" | "boolean" | "array" | "object" | "function" | "unknown";
  initialValue: any;
  currentValue: any;
  references: string[];             // symbols this row reads
  range?: { min: number; max: number; step: number; log?: boolean };
  pragmas: Record<string, any>;     // parsed from @range, @log, @int, etc.
}

interface Edge {
  sourceNodeId: string;
  sourceRowIndex: number;
  targetNodeId: string;
  targetRowIndex: number;
  symbol: string;                   // the variable name being passed
}
```

### 10.3 Evaluation Pipeline

**Building the execution sequence (on any code change):**

```
Node code changes (edit mode exit)
  → Parse all nodes with Acorn → extract declarations, references
  → Build DAG from symbol references
  → Detect cycles (flag errors, exclude from sequence)
  → Topologically sort nodes (roots first, leaves last)
  → Flatten to line-level sequence:
      For each node in topo order:
        For each line in the node (top to bottom):
          → Compile line into a step function
          → Record symbolsRead and symbolsWritten
          → Append to execution.sequence[]
  → Reset step counter to 0
  → Clear all scope snapshots
```

**Live mode — user changes a value:**

```
User interaction (slider drag)
  → Update node's ParsedRow.currentValue
  → Write to global scope
  → Find this step's index in the execution sequence
  → Re-evaluate all steps from that index forward (in order)
  → For each step:
      → Execute compiledFn(scope)
      → Update scope with returned symbols
      → Update the corresponding row's currentValue
      → Trigger row re-render with number morphing animation
      → Trigger data-pulse animation on affected incoming edges
```

**Stepped mode — advance one step:**

```
Step forward triggered (button, keyboard, or timer tick)
  → Read execution.currentStep
  → Snapshot current scope (if at a snapshot interval boundary)
  → Get step = execution.sequence[currentStep]
  → Set step.status = "active"
  → Animate data-pulse on all incoming edges (symbolsRead)
  → After pulse animation completes (150ms):
      → Execute step.compiledFn(scope)
      → Update scope
      → Update the corresponding row's currentValue with morph animation
      → Set step.status = "evaluated"
      → Increment execution.currentStep
      → If playing && currentStep < sequence.length:
          → Schedule next step at 1000/stepsPerSecond ms
      → If playing && currentStep >= sequence.length && looping:
          → Increment loopCount, reset currentStep to 0, continue
```

**Stepped mode — scrub / jump to step N:**

```
Scrubber moved to step N
  → Find nearest snapshot at or before N
  → Restore scope from that snapshot
  → Replay steps from snapshot index to N (silently, no animation)
  → Update all row values to match scope at step N
  → Set all steps 0..N-1 as "evaluated", N as "active", N+1..end as "pending"
  → Render current state
```

### 10.4 Compilation Strategy

Each node's code is wrapped in a function that receives the global scope:

```js
// For a node containing: const c = a + b
new Function('__scope__', `
  with (__scope__) {
    const c = a + b;
    return { c };
  }
`)
```

Note: `with` is used for ergonomic scoping but could be replaced with explicit destructuring for stricter environments. The `with` approach is simpler for v1 and matches the "everything is in one scope" mental model.

---

## 11. File Structure (Suggested)

```
reactive-canvas/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Canvas + providers
│   ├── store/
│   │   ├── canvasStore.ts          # Zustand store
│   │   ├── evaluator.ts           # Reactive evaluation engine
│   │   └── executionStore.ts      # Stepper state, play/pause, snapshots
│   ├── parser/
│   │   ├── parseNode.ts           # Acorn-based code → ParsedRow[]
│   │   ├── pragmas.ts             # @range, @log, @int parsing
│   │   ├── dag.ts                 # Dependency graph + topo sort
│   │   └── sequencer.ts          # DAG → flat ExecutionStep[] with line-level compilation
│   ├── components/
│   │   ├── Canvas.tsx             # Pan/zoom container
│   │   ├── Node.tsx               # Node shell (header + rows)
│   │   ├── NodeEditor.tsx         # CodeMirror edit mode
│   │   ├── rows/
│   │   │   ├── SliderRow.tsx      # var + number
│   │   │   ├── TextRow.tsx        # var + string
│   │   │   ├── ToggleRow.tsx      # var + boolean
│   │   │   ├── DisplayRow.tsx     # const / expression
│   │   │   ├── ArrayRow.tsx       # var + array
│   │   │   └── FunctionRow.tsx    # function definition
│   │   ├── Edge.tsx               # Bézier edge + data pulse
│   │   ├── PortDot.tsx            # Input/output port circles
│   │   ├── Minimap.tsx            # Minimap overlay
│   │   ├── Toolbar.tsx            # Top bar (zoom, presets, export)
│   │   ├── TransportBar.tsx       # Bottom playback controls
│   │   ├── ExecutionPanel.tsx     # Right-side execution order list
│   │   └── StepIndicator.tsx     # Per-row execution status (trail, highlight)
│   ├── theme/
│   │   └── catppuccin-frappe.ts   # Colour tokens + CSS variables
│   └── utils/
│       ├── sliderRange.ts         # Range heuristic
│       ├── numberFormat.ts        # Smart number display
│       └── scopeSnapshot.ts      # Scope cloning + checkpoint management
├── public/
│   └── fonts/
│       └── MonaspaceArgon-*.woff2
├── package.json
└── vite.config.ts
```
