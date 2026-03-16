export interface ParsedRow {
  kind: 'var' | 'let' | 'const' | 'expression' | 'function' | 'complex';
  name: string;
  valueType: 'number' | 'string' | 'boolean' | 'array' | 'object' | 'function' | 'unknown';
  initialValue: any;
  currentValue: any;
  references: string[];
  range?: { min: number; max: number; step: number; log?: boolean };
  pragmas: Record<string, any>;
  code: string;
}

export interface NodeState {
  id: string;
  code: string;
  position: { x: number; y: number };
  width: number;
  title: string;
  collapsed: boolean;
  colorTag: string | null;
  parsedRows: ParsedRow[];
  editing: boolean;
  status: 'ok' | 'error' | 'computing';
  errors: string[];
}

export interface EdgeInfo {
  sourceNodeId: string;
  sourceRowIndex: number;
  targetNodeId: string;
  targetRowIndex: number;
  symbol: string;
}

export interface ExecutionStep {
  nodeId: string;
  lineIndex: number;
  code: string;
  compiledFn: ((scope: Record<string, any>) => Record<string, any>) | null;
  symbolsWritten: string[];
  symbolsRead: string[];
  status: 'pending' | 'active' | 'evaluated' | 'error';
  error?: string;
}

export interface ExecutionState {
  mode: 'live' | 'stepped';
  granularity: 'nodes' | 'lines';
  sequence: ExecutionStep[];
  currentStep: number;
  playing: boolean;
  looping: boolean;
  stepsPerSecond: number;
  loopCount: number;
  snapshots: Map<number, Record<string, any>>;
  snapshotInterval: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SaveFormat {
  version: number;
  viewport: CanvasViewport;
  nodes: {
    id: string;
    code: string;
    position: { x: number; y: number };
    width: number;
    title: string;
    collapsed: boolean;
    colorTag: string | null;
  }[];
}
