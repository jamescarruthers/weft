import { create } from 'zustand';
import { NodeState, EdgeInfo, CanvasViewport, ExecutionState, ExecutionStep } from '../types';
import { parseNodeCode } from '../parser/parseNode';
import { buildDag, DagResult } from '../parser/dag';
import { buildSequence } from '../parser/sequencer';

interface UndoEntry {
  nodes: Map<string, NodeState>;
  scope: Record<string, any>;
}

interface CanvasStore {
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
  duplicateSelected: () => void;

  // Viewport
  setViewport: (vp: Partial<CanvasViewport>) => void;

  // Evaluation
  rebuildGraph: () => void;
  evaluateAll: () => void;
  evaluateFrom: (stepIndex: number) => void;

  // Execution controls
  setExecutionMode: (mode: 'live' | 'stepped') => void;
  setGranularity: (g: 'nodes' | 'lines') => void;
  stepForward: () => void;
  stepBack: () => void;
  jumpToStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  setLooping: (looping: boolean) => void;
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

  execution: {
    mode: 'live',
    granularity: 'lines',
    sequence: [],
    currentStep: 0,
    playing: false,
    looping: false,
    stepsPerSecond: 4,
    loopCount: 0,
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
      position: { x, y },
      width: 260,
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

    const { rows, errors, title: commentTitle } = parseNodeCode(code);
    const autoTitle = commentTitle
      ? commentTitle
      : rows.length === 1 && rows[0].name && !rows[0].name.startsWith('_')
        ? rows[0].name
        : node.title;

    const newNode: NodeState = {
      ...node,
      code,
      parsedRows: rows,
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
    newNodes.set(id, { ...node, position: { x, y } });
    set({ nodes: newNodes });
  },

  updateNodeWidth: (id: string, width: number) => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, width: Math.max(200, Math.min(400, width)) });
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

    // Update scope
    const newScope = { ...state.scope };
    newScope[newRows[rowIndex].name] = value;

    set({ nodes: newNodes, scope: newScope });

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

  evaluateAll: () => {
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
        for (const row of node.parsedRows) {
          if (row.name && !row.name.startsWith('_expr_') && !row.name.startsWith('_block_')) {
            // If row has a user-set currentValue (interactive), use it
            if ((row.kind === 'var' || row.kind === 'let') && row.currentValue !== undefined && row.initialValue !== undefined) {
              scope[row.name] = row.currentValue;
            }
            symbolsWritten.push(row.name);
          }
        }

        const returnObj = symbolsWritten.length > 0
          ? `\nreturn { ${symbolsWritten.map(s => `"${s}": typeof ${s} !== 'undefined' ? ${s} : undefined`).join(', ')} };`
          : '';

        const fn = new Function('__scope__', `with(__scope__) { ${node.code}\n${returnObj} }`);
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

    set({ nodes: newNodes, scope, sparklineHistory, graphHistory });
  },

  evaluateFrom: (_stepIndex: number) => {
    // For live mode, just re-evaluate all
    get().evaluateAll();
  },

  setExecutionMode: (mode) => {
    const state = get();
    set({ execution: { ...state.execution, mode, currentStep: 0, playing: false } });
    if (mode === 'live') {
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
      if (exec.looping) {
        set({
          execution: {
            ...exec,
            currentStep: 0,
            loopCount: exec.loopCount + 1,
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
    // Restore from snapshot or re-evaluate from start
    const snapshot = exec.snapshots.get(newStep - 1);
    if (snapshot) {
      set({
        scope: cloneScope(snapshot),
        execution: { ...exec, currentStep: newStep },
      });
    } else {
      // Re-evaluate from start up to newStep
      set({ execution: { ...exec, currentStep: 0 } });
      for (let i = 0; i < newStep; i++) {
        get().stepForward();
      }
    }
  },

  jumpToStep: (step: number) => {
    const state = get();
    const exec = state.execution;
    const targetStep = Math.max(0, Math.min(step, exec.sequence.length));

    // Reset and replay
    set({
      scope: {},
      execution: { ...exec, currentStep: 0 },
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

  setStepsPerSecond: (sps) => {
    const state = get();
    set({ execution: { ...state.execution, stepsPerSecond: Math.max(0.5, Math.min(60, sps)) } });
  },

  jumpToStart: () => {
    const state = get();
    set({
      scope: {},
      execution: { ...state.execution, currentStep: 0, playing: false },
    });
  },

  jumpToEnd: () => {
    const state = get();
    const exec = state.execution;
    set({
      scope: {},
      execution: { ...exec, currentStep: 0 },
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
      get().evaluateAll();
    }
  },

  saveToLocalStorage: () => {
    const state = get();
    const data = {
      version: 1,
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
        const { rows, errors, title: commentTitle } = parseNodeCode(n.code);
        newNodes.set(n.id, {
          id: n.id,
          code: n.code,
          position: n.position,
          width: n.width || 260,
          title: commentTitle || n.title || 'Node',
          collapsed: n.collapsed || false,
          colorTag: n.colorTag || null,
          parsedRows: rows,
          editing: false,
          status: errors.length > 0 ? 'error' : 'ok',
          errors,
        });
      }
      set({
        nodes: newNodes,
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        nextNodeNum: newNodes.size + 1,
      });
      get().rebuildGraph();
      get().evaluateAll();
    } catch { /* ignore */ }
  },
}));
