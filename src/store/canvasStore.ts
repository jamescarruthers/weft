import { create } from 'zustand';
import { NodeState, EdgeInfo, CanvasViewport, ExecutionState, ExecutionStep } from '../types';
import { parseNodeCode } from '../parser/parseNode';
import { buildDag, DagResult } from '../parser/dag';
import { buildSequence } from '../parser/sequencer';
import { snapToGrid, GRID, HEADER_HEIGHT, ROW_HEIGHT } from '../theme/catppuccin-frappe';

interface UndoEntry {
  nodes: Map<string, NodeState>;
  scope: Record<string, any>;
}

interface CanvasStore {
  // File
  fileName: string;
  setFileName: (name: string) => void;

  // Nodes
  nodes: Map<string, NodeState>;
  viewport: CanvasViewport;
  scope: Record<string, any>;
  edges: EdgeInfo[];
  dag: DagResult | null;
  selectedNodeIds: Set<string>;
  nextNodeNum: number;

  // Time
  timeRunning: boolean;
  timeT: number;
  timeDt: number;
  lastTimestamp: number;

  // Execution
  execution: ExecutionState;

  // Sparkline & Graph
  sparklineHistory: Map<string, number[]>;
  graphHistory: Map<string, { x: number; y: number }[]>;

  // Edge glow: key → 'user' (strong) or 'time' (subtle)
  glowingEdges: Map<string, 'user' | 'time'>;

  // Measured row Y positions: "nodeId:rowIndex" → Y offset from node top
  rowYPositions: Map<string, number>;
  setRowYPosition: (nodeId: string, rowIndex: number, y: number) => void;

  // Undo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  // Actions
  addNode: (x: number, y: number) => string;
  deleteNode: (id: string) => void;
  updateNodeCode: (id: string, code: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeWidth: (id: string, width: number) => void;
  setNodeEditing: (id: string, editing: boolean) => void;
  setNodeTitle: (id: string, title: string) => void;
  updateValue: (nodeId: string, rowIndex: number, value: any) => void;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  clearCanvas: () => void;
  duplicateSelected: () => void;

  // Viewport
  setViewport: (vp: Partial<CanvasViewport>) => void;
  zoomToExtents: () => void;

  // Evaluation
  rebuildGraph: () => void;
  evaluateAll: (source?: 'user' | 'time') => void;
  evaluateFrom: (stepIndex: number) => void;

  // Execution controls
  setExecutionMode: (mode: 'live' | 'stepped') => void;
  setGranularity: (g: 'nodes' | 'lines') => void;
  stepForward: () => void;
  stepBack: () => void;
  jumpToStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  setLooping: (looping: boolean) => void;
  setMaxLoops: (maxLoops: number) => void;
  setStepsPerSecond: (sps: number) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;

  // Time
  setTimeRunning: (running: boolean) => void;
  resetTime: () => void;
  tick: (timestamp: number) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

function cloneScope(scope: Record<string, any>): Record<string, any> {
  const clone: Record<string, any> = {};
  for (const key of Object.keys(scope)) {
    const val = scope[key];
    if (typeof val === 'function') {
      clone[key] = val;
    } else {
      try { clone[key] = structuredClone(val); } catch { clone[key] = val; }
    }
  }
  return clone;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  fileName: 'Untitled',
  setFileName: (name: string) => set({ fileName: name || 'Untitled' }),

  nodes: new Map(),
  viewport: { x: 0, y: 0, zoom: 1 },
  scope: {},
  edges: [],
  dag: null,
  selectedNodeIds: new Set(),
  nextNodeNum: 1,

  timeRunning: false,
  timeT: 0,
  timeDt: 0,
  lastTimestamp: 0,

  sparklineHistory: new Map(),
  graphHistory: new Map(),
  glowingEdges: new Map(),
  rowYPositions: new Map(),

  setRowYPosition: (nodeId: string, rowIndex: number, y: number) => {
    const state = get();
    const key = `${nodeId}:${rowIndex}`;
    const current = state.rowYPositions.get(key);
    if (current === y) return; // avoid unnecessary updates
    const newMap = new Map(state.rowYPositions);
    newMap.set(key, y);
    set({ rowYPositions: newMap });
  },

  execution: {
    mode: 'live',
    granularity: 'lines',
    sequence: [],
    currentStep: 0,
    playing: false,
    looping: false,
    stepsPerSecond: 4,
    loopCount: 0,
    maxLoops: 0,
    snapshots: new Map(),
    snapshotInterval: 1,
  },

  undoStack: [],
  redoStack: [],

  addNode: (x: number, y: number) => {
    const state = get();
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const num = state.nextNodeNum;
    const node: NodeState = {
      id,
      code: '',
      position: { x: snapToGrid(x), y: snapToGrid(y) },
      width: 256,
      title: `Node ${num}`,
      collapsed: false,
      colorTag: null,
      parsedRows: [],
      editing: true,
      status: 'ok',
      errors: [],
    };
    const newNodes = new Map(state.nodes);
    newNodes.set(id, node);
    set({ nodes: newNodes, nextNodeNum: num + 1 });
    return id;
  },

  deleteNode: (id: string) => {
    const state = get();
    state.pushUndo();
    const newNodes = new Map(state.nodes);
    newNodes.delete(id);
    const sel = new Set(state.selectedNodeIds);
    sel.delete(id);
    set({ nodes: newNodes, selectedNodeIds: sel });
    get().rebuildGraph();
    get().evaluateAll();
  },

  updateNodeCode: (id: string, code: string) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;

    const { rows, errors, title: commentTitle, noteText } = parseNodeCode(code);
    const autoTitle = commentTitle
      ? commentTitle
      : rows.length === 1 && rows[0].name && !rows[0].name.startsWith('_')
        ? rows[0].name
        : node.title;

    const newNode: NodeState = {
      ...node,
      code,
      parsedRows: rows,
      noteText,
      status: errors.length > 0 ? 'error' : 'ok',
      errors,
      title: commentTitle ? commentTitle : (node.title.startsWith('Node ') ? autoTitle : node.title),
    };

    const newNodes = new Map(state.nodes);
    newNodes.set(id, newNode);
    set({ nodes: newNodes });
    get().rebuildGraph();
    get().evaluateAll();
  },

  updateNodePosition: (id: string, x: number, y: number) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, position: { x: snapToGrid(x), y: snapToGrid(y) } });
    set({ nodes: newNodes });
  },

  updateNodeWidth: (id: string, width: number) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, width: snapToGrid(Math.max(192, Math.min(400, width))) });
    set({ nodes: newNodes });
  },

  setNodeEditing: (id: string, editing: boolean) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, editing });
    set({ nodes: newNodes });
  },

  setNodeTitle: (id: string, title: string) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, title });
    set({ nodes: newNodes });
  },

  updateValue: (nodeId: string, rowIndex: number, value: any) => {
    const state = get();
    const node = state.nodes.get(nodeId);
    if (!node) return;

    const newRows = [...node.parsedRows];
    newRows[rowIndex] = { ...newRows[rowIndex], currentValue: value };

    const newNodes = new Map(state.nodes);
    newNodes.set(nodeId, { ...node, parsedRows: newRows });

    // Don't update scope here — let evaluateAll detect the change
    set({ nodes: newNodes });

    // Re-evaluate downstream
    if (state.execution.mode === 'live') {
      get().evaluateAll();
    }
  },

  selectNode: (id: string, multi?: boolean) => {
    const state = get();
    const sel = multi ? new Set(state.selectedNodeIds) : new Set<string>();
    if (sel.has(id)) {
      sel.delete(id);
    } else {
      sel.add(id);
    }
    set({ selectedNodeIds: sel });
  },

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  clearCanvas: () => {
    set({
      nodes: new Map(),
      scope: {},
      edges: [],
      dag: null,
      selectedNodeIds: new Set(),
      nextNodeNum: 1,
      sparklineHistory: new Map(),
      graphHistory: new Map(),
      glowingEdges: new Map(),
      rowYPositions: new Map(),
      undoStack: [],
      redoStack: [],
      timeT: 0,
      timeDt: 0,
    });
  },

  duplicateSelected: () => {
    const state = get();
    const newNodes = new Map(state.nodes);
    const newSel = new Set<string>();
    let num = state.nextNodeNum;

    for (const id of state.selectedNodeIds) {
      const node = state.nodes.get(id);
      if (!node) continue;
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const dup: NodeState = {
        ...node,
        id: newId,
        position: { x: node.position.x + 20, y: node.position.y + 20 },
        title: `Node ${num}`,
        editing: false,
      };
      newNodes.set(newId, dup);
      newSel.add(newId);
      num++;
    }

    set({ nodes: newNodes, selectedNodeIds: newSel, nextNodeNum: num });
    get().rebuildGraph();
    get().evaluateAll();
  },

  setViewport: (vp: Partial<CanvasViewport>) => {
    const state = get();
    set({ viewport: { ...state.viewport, ...vp } });
  },

  zoomToExtents: () => {
    const state = get();
    const nodes = Array.from(state.nodes.values());
    if (nodes.length === 0) return;

    // Estimate node heights (~80px default)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.width);
      const rowCount = Math.max(1, n.parsedRows.length);
      const estimatedH = HEADER_HEIGHT + rowCount * ROW_HEIGHT + (n.noteText ? 48 : 0);
      maxY = Math.max(maxY, n.position.y + estimatedH);
    }

    const padding = 60;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    // Toolbar is 36px top, transport bar is 44px bottom
    const viewW = window.innerWidth;
    const viewH = window.innerHeight - 36 - 44;

    const zoom = Math.min(1.5, Math.min(viewW / contentW, viewH / contentH));
    const x = (viewW - contentW * zoom) / 2 - minX * zoom;
    const y = 36 + (viewH - contentH * zoom) / 2 - minY * zoom;

    set({ viewport: { x, y, zoom } });
  },

  rebuildGraph: () => {
    const state = get();
    const dag = buildDag(state.nodes);
    const sequence = buildSequence(state.nodes, dag, state.execution.granularity);

    // Build edges
    const edges: EdgeInfo[] = [];
    for (const e of dag.edges) {
      const srcNode = state.nodes.get(e.source);
      const tgtNode = state.nodes.get(e.target);
      if (!srcNode || !tgtNode) continue;

      const srcRowIdx = srcNode.parsedRows.findIndex(r => r.name === e.symbol);
      const tgtRowIdx = tgtNode.parsedRows.findIndex(r => r.references.includes(e.symbol));

      edges.push({
        sourceNodeId: e.source,
        sourceRowIndex: Math.max(0, srcRowIdx),
        targetNodeId: e.target,
        targetRowIndex: Math.max(0, tgtRowIdx),
        symbol: e.symbol,
      });
    }

    // Mark cycle errors
    const newNodes = new Map(state.nodes);
    for (const cycle of dag.cycles) {
      for (const nodeId of cycle) {
        const node = newNodes.get(nodeId);
        if (node) {
          newNodes.set(nodeId, {
            ...node,
            status: 'error',
            errors: [...node.errors, 'Circular dependency detected'],
          });
        }
      }
    }

    set({
      dag,
      edges,
      nodes: newNodes,
      execution: {
        ...state.execution,
        sequence,
        currentStep: 0,
        snapshots: new Map(),
      },
    });
  },

  evaluateAll: (source?: 'user' | 'time') => {
    const state = get();
    if (!state.dag) return;

    const scope: Record<string, any> = {
      t: state.timeT,
      dt: state.timeDt,
    };
    const newNodes = new Map(state.nodes);

    for (const nodeId of state.dag.order) {
      const node = newNodes.get(nodeId);
      if (!node) continue;

      try {
        // Build the code and execute
        const symbolsWritten: string[] = [];
        const interactiveVars = new Map<string, any>();
        for (const row of node.parsedRows) {
          if (row.name && !row.name.startsWith('_expr_') && !row.name.startsWith('_block_')) {
            // If row has a user-set currentValue (interactive scalar), inject it into scope
            if ((row.kind === 'var' || row.kind === 'let') && row.currentValue !== undefined && row.initialValue !== undefined
                && (row.valueType === 'number' || row.valueType === 'string' || row.valueType === 'boolean')) {
              interactiveVars.set(row.name, row.currentValue);
              scope[row.name] = row.currentValue;
            }
            symbolsWritten.push(row.name);
          }
        }

        // Build executable code: for interactive vars, replace their
        // initializer so they read from scope instead of re-initializing.
        // Process line by line to safely handle trailing comments.
        const lines = node.code.split('\n');
        const execLines: string[] = [];
        for (const line of lines) {
          let replaced = false;
          for (const [varName, varValue] of interactiveVars) {
            // Match: var/let varName = <something>
            const re = new RegExp(`^(\\s*(?:var|let)\\s+)${varName}(\\s*=\\s*)(.+)$`);
            const m = line.match(re);
            if (m) {
              // Replace the initializer value, keep everything else (including trailing comments)
              const valueAndComment = m[3];
              // Find where the value ends and comment begins
              const commentIdx = valueAndComment.search(/\/\//);
              const comment = commentIdx >= 0 ? ' ' + valueAndComment.slice(commentIdx) : '';
              const replacement = typeof varValue === 'string'
                ? JSON.stringify(varValue)
                : String(varValue);
              execLines.push(`${m[1]}${varName}${m[2]}${replacement}${comment}`);
              replaced = true;
              break;
            }
          }
          if (!replaced) {
            execLines.push(line);
          }
        }
        const execCode = execLines.join('\n');

        const returnObj = symbolsWritten.length > 0
          ? `\nreturn { ${symbolsWritten.map(s => `"${s}": typeof ${s} !== 'undefined' ? ${s} : undefined`).join(', ')} };`
          : '';

        const fn = new Function('__scope__', `with(__scope__) { ${execCode}\n${returnObj} }`);
        const result = fn(scope);

        if (result) {
          Object.assign(scope, result);
        }

        // Update row values
        const newRows = node.parsedRows.map(row => {
          if (row.name in scope) {
            return { ...row, currentValue: scope[row.name] };
          }
          return row;
        });

        newNodes.set(nodeId, { ...node, parsedRows: newRows, status: 'ok', errors: [] });
      } catch (e: any) {
        newNodes.set(nodeId, {
          ...node,
          status: 'error',
          errors: [e.message],
        });
      }
    }

    // Record sparkline history
    const sparklineHistory = new Map(state.sparklineHistory);
    for (const [nodeId, node] of newNodes) {
      for (const row of node.parsedRows) {
        if (row.pragmas.sparkline && typeof row.currentValue === 'number') {
          const key = `${nodeId}:${row.name}`;
          const hist = sparklineHistory.get(key) || [];
          const updated = [...hist, row.currentValue];
          sparklineHistory.set(key, updated.length > 50 ? updated.slice(-50) : updated);
        }
      }
    }

    // Record graph history
    const graphHistory = new Map(state.graphHistory);
    for (const [nodeId, node] of newNodes) {
      for (const row of node.parsedRows) {
        if (row.pragmas.graphs) {
          for (const g of row.pragmas.graphs) {
            const xVal = g.x === null ? state.timeT : scope[g.x];
            const yVal = scope[g.y];
            if (typeof xVal === 'number' && typeof yVal === 'number' && isFinite(xVal) && isFinite(yVal)) {
              const key = `${nodeId}:${row.name}:graph:${g.y}`;
              const hist = graphHistory.get(key) || [];
              const updated = [...hist, { x: xVal, y: yVal }];
              graphHistory.set(key, updated.length > 200 ? updated.slice(-200) : updated);
            }
          }
        }
      }
    }

    // Detect changed symbols and activate edge glow
    const changedSymbols = new Set<string>();
    const oldScope = state.scope;
    for (const key of Object.keys(scope)) {
      if (key === 't' || key === 'dt') continue;
      if (oldScope[key] !== scope[key]) {
        changedSymbols.add(key);
      }
    }

    const glowType = source || 'user';
    if (changedSymbols.size > 0) {
      const newGlowing = new Map(state.glowingEdges);
      for (const edge of state.edges) {
        if (changedSymbols.has(edge.symbol)) {
          const key = `${edge.sourceNodeId}-${edge.targetNodeId}-${edge.symbol}`;
          // Don't downgrade a 'user' glow to 'time'
          if (!newGlowing.has(key) || newGlowing.get(key) !== 'user') {
            newGlowing.set(key, glowType);
          }
        }
      }
      set({ nodes: newNodes, scope, sparklineHistory, graphHistory, glowingEdges: newGlowing });

      // Clear glow after 500ms
      setTimeout(() => {
        const current = get().glowingEdges;
        if (current.size > 0) {
          set({ glowingEdges: new Map() });
        }
      }, 500);
    } else {
      set({ nodes: newNodes, scope, sparklineHistory, graphHistory });
    }
  },

  evaluateFrom: (_stepIndex: number) => {
    // For live mode, just re-evaluate all
    get().evaluateAll();
  },

  setExecutionMode: (mode) => {
    const state = get();
    if (mode === 'stepped') {
      // Null out all currentValues so uncomputed vars show as null
      const newNodes = new Map(state.nodes);
      for (const [id, node] of newNodes) {
        const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
        newNodes.set(id, { ...node, parsedRows: newRows });
      }
      const resetSequence = state.execution.sequence.map(s => ({ ...s, status: 'pending' as const }));
      set({
        nodes: newNodes,
        scope: {},
        execution: { ...state.execution, mode, currentStep: 0, playing: false, loopCount: 0, sequence: resetSequence, snapshots: new Map() },
      });
    } else {
      set({ execution: { ...state.execution, mode, currentStep: 0, playing: false } });
      get().evaluateAll();
    }
  },

  setGranularity: (g) => {
    const state = get();
    set({ execution: { ...state.execution, granularity: g } });
    get().rebuildGraph();
  },

  stepForward: () => {
    const state = get();
    const exec = state.execution;
    if (exec.currentStep >= exec.sequence.length) {
      if (exec.looping && (exec.maxLoops === 0 || exec.loopCount + 1 < exec.maxLoops)) {
        // Reset rows to null and restart
        const newNodes = new Map(state.nodes);
        for (const [id, node] of newNodes) {
          const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
          newNodes.set(id, { ...node, parsedRows: newRows });
        }
        const resetSequence = exec.sequence.map(s => ({ ...s, status: 'pending' as const }));
        set({
          scope: {},
          nodes: newNodes,
          execution: {
            ...exec,
            currentStep: 0,
            loopCount: exec.loopCount + 1,
            sequence: resetSequence,
            snapshots: new Map(),
          },
        });
        return;
      }
      return;
    }

    const step = exec.sequence[exec.currentStep];
    if (!step || !step.compiledFn) {
      set({ execution: { ...exec, currentStep: exec.currentStep + 1 } });
      return;
    }

    const scope = { ...state.scope };
    // Inject time variables for stepped mode
    if (exec.mode === 'stepped') {
      const totalSteps = exec.sequence.length;
      scope.t = exec.looping
        ? exec.loopCount * totalSteps + exec.currentStep
        : exec.currentStep;
      scope.dt = exec.stepsPerSecond > 0 ? 1 / exec.stepsPerSecond : 0;
    }
    try {
      const result = step.compiledFn(scope);
      if (result) Object.assign(scope, result);

      const newSequence = [...exec.sequence];
      newSequence[exec.currentStep] = { ...step, status: 'evaluated' };
      if (exec.currentStep + 1 < newSequence.length) {
        newSequence[exec.currentStep + 1] = { ...newSequence[exec.currentStep + 1], status: 'active' };
      }

      // Update node row values
      const newNodes = new Map(state.nodes);
      const node = newNodes.get(step.nodeId);
      if (node) {
        const newRows = node.parsedRows.map(row => {
          if (row.name in scope) {
            return { ...row, currentValue: scope[row.name] };
          }
          return row;
        });
        newNodes.set(step.nodeId, { ...node, parsedRows: newRows });
      }

      // Take snapshot
      const snapshots = new Map(exec.snapshots);
      snapshots.set(exec.currentStep, cloneScope(scope));

      set({
        scope,
        nodes: newNodes,
        execution: {
          ...exec,
          sequence: newSequence,
          currentStep: exec.currentStep + 1,
          snapshots,
        },
      });
    } catch (e: any) {
      const newSequence = [...exec.sequence];
      newSequence[exec.currentStep] = { ...step, status: 'error', error: e.message };
      set({
        execution: { ...exec, sequence: newSequence, playing: false },
      });
    }
  },

  stepBack: () => {
    const state = get();
    const exec = state.execution;
    if (exec.currentStep <= 0) return;

    const newStep = exec.currentStep - 1;
    // Re-evaluate from start to newStep (ensures node rows are correctly updated)
    get().jumpToStep(newStep);
  },

  jumpToStep: (step: number) => {
    const state = get();
    const exec = state.execution;
    const targetStep = Math.max(0, Math.min(step, exec.sequence.length));

    // Null out all values and reset statuses
    const newNodes = new Map(state.nodes);
    for (const [id, node] of newNodes) {
      const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
      newNodes.set(id, { ...node, parsedRows: newRows });
    }
    const resetSequence = exec.sequence.map(s => ({ ...s, status: 'pending' as const }));
    set({
      scope: {},
      nodes: newNodes,
      execution: { ...exec, currentStep: 0, sequence: resetSequence, snapshots: new Map() },
    });
    for (let i = 0; i < targetStep; i++) {
      get().stepForward();
    }
  },

  setPlaying: (playing) => {
    const state = get();
    set({ execution: { ...state.execution, playing } });
  },

  setLooping: (looping) => {
    const state = get();
    set({ execution: { ...state.execution, looping } });
  },

  setMaxLoops: (maxLoops: number) => {
    const state = get();
    set({ execution: { ...state.execution, maxLoops: Math.max(0, maxLoops) } });
  },

  setStepsPerSecond: (sps) => {
    const state = get();
    set({ execution: { ...state.execution, stepsPerSecond: Math.max(0.5, Math.min(60, sps)) } });
  },

  jumpToStart: () => {
    const state = get();
    // Null out all currentValues so uncomputed vars show as null
    const newNodes = new Map(state.nodes);
    for (const [id, node] of newNodes) {
      const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
      newNodes.set(id, { ...node, parsedRows: newRows });
    }
    const resetSequence = state.execution.sequence.map(s => ({ ...s, status: 'pending' as const }));
    set({
      scope: {},
      nodes: newNodes,
      execution: { ...state.execution, currentStep: 0, playing: false, loopCount: 0, sequence: resetSequence, snapshots: new Map() },
    });
  },

  jumpToEnd: () => {
    const state = get();
    const exec = state.execution;
    const newNodes = new Map(state.nodes);
    for (const [id, node] of newNodes) {
      const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
      newNodes.set(id, { ...node, parsedRows: newRows });
    }
    const resetSequence = exec.sequence.map(s => ({ ...s, status: 'pending' as const }));
    set({
      scope: {},
      nodes: newNodes,
      execution: { ...exec, currentStep: 0, sequence: resetSequence, snapshots: new Map() },
    });
    for (let i = 0; i < exec.sequence.length; i++) {
      get().stepForward();
    }
    set({ execution: { ...get().execution, playing: false } });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const entry = state.undoStack[state.undoStack.length - 1];
    const newUndo = state.undoStack.slice(0, -1);
    const newRedo = [...state.redoStack, { nodes: state.nodes, scope: state.scope }];
    set({ nodes: entry.nodes, scope: entry.scope, undoStack: newUndo, redoStack: newRedo });
    get().rebuildGraph();
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const entry = state.redoStack[state.redoStack.length - 1];
    const newRedo = state.redoStack.slice(0, -1);
    const newUndo = [...state.undoStack, { nodes: state.nodes, scope: state.scope }];
    set({ nodes: entry.nodes, scope: entry.scope, undoStack: newUndo, redoStack: newRedo });
    get().rebuildGraph();
  },

  pushUndo: () => {
    const state = get();
    set({
      undoStack: [...state.undoStack.slice(-50), { nodes: new Map(state.nodes), scope: { ...state.scope } }],
      redoStack: [],
    });
  },

  setTimeRunning: (running: boolean) => {
    const state = get();
    if (running && !state.timeRunning) {
      set({ timeRunning: true, lastTimestamp: performance.now() });
    } else if (!running) {
      set({ timeRunning: false });
    }
  },

  resetTime: () => {
    set({ timeT: 0, timeDt: 0, lastTimestamp: performance.now(), sparklineHistory: new Map(), graphHistory: new Map() });
    get().evaluateAll();
  },

  tick: (timestamp: number) => {
    const state = get();
    if (!state.timeRunning) return;

    const dt = state.lastTimestamp > 0 ? (timestamp - state.lastTimestamp) / 1000 : 0;
    const newT = state.timeT + dt;

    // Check if any node uses t or dt — skip re-eval if not needed
    let usesTime = false;
    for (const [, node] of state.nodes) {
      for (const row of node.parsedRows) {
        if (row.references.includes('t') || row.references.includes('dt')) {
          usesTime = true;
          break;
        }
      }
      if (usesTime) break;
    }

    set({ timeT: newT, timeDt: dt, lastTimestamp: timestamp });

    if (usesTime) {
      get().evaluateAll('time');
    }
  },

  saveToLocalStorage: () => {
    const state = get();
    const data = {
      version: 1,
      fileName: state.fileName,
      viewport: state.viewport,
      nodes: Array.from(state.nodes.values()).map(n => ({
        id: n.id,
        code: n.code,
        position: n.position,
        width: n.width,
        title: n.title,
        collapsed: n.collapsed,
        colorTag: n.colorTag,
      })),
    };
    localStorage.setItem('reactive-canvas', JSON.stringify(data));
  },

  loadFromLocalStorage: () => {
    try {
      const raw = localStorage.getItem('reactive-canvas');
      if (!raw) return;
      get().importJSON(raw);
    } catch { /* ignore */ }
  },

  exportJSON: () => {
    const state = get();
    return JSON.stringify({
      version: 1,
      fileName: state.fileName,
      viewport: state.viewport,
      nodes: Array.from(state.nodes.values()).map(n => ({
        id: n.id,
        code: n.code,
        position: n.position,
        width: n.width,
        title: n.title,
        collapsed: n.collapsed,
        colorTag: n.colorTag,
      })),
    }, null, 2);
  },

  importJSON: (json: string) => {
    try {
      const data = JSON.parse(json);
      const newNodes = new Map<string, NodeState>();
      for (const n of data.nodes) {
        const { rows, errors, title: commentTitle, noteText } = parseNodeCode(n.code);
        newNodes.set(n.id, {
          id: n.id,
          code: n.code,
          position: { x: snapToGrid(n.position.x), y: snapToGrid(n.position.y) },
          width: snapToGrid(n.width || 256),
          title: commentTitle || n.title || 'Node',
          collapsed: n.collapsed || false,
          colorTag: n.colorTag || null,
          parsedRows: rows,
          noteText,
          editing: false,
          status: errors.length > 0 ? 'error' : 'ok',
          errors,
        });
      }
      set({
        nodes: newNodes,
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        fileName: data.fileName || 'Untitled',
        nextNodeNum: newNodes.size + 1,
      });
      get().rebuildGraph();
      get().evaluateAll();
    } catch { /* ignore */ }
  },
}));
