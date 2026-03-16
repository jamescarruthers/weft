import { NodeState } from '../types';

export interface DagResult {
  order: string[];        // topologically sorted node IDs
  edges: { source: string; target: string; symbol: string }[];
  cycles: string[][];     // groups of node IDs forming cycles
  symbolMap: Map<string, { nodeId: string; rowIndex: number }>;
}

export function buildDag(nodes: Map<string, NodeState>): DagResult {
  // Build symbol → defining node map
  const symbolMap = new Map<string, { nodeId: string; rowIndex: number }>();
  for (const [nodeId, node] of nodes) {
    node.parsedRows.forEach((row, i) => {
      if (row.name && !row.name.startsWith('_expr_') && !row.name.startsWith('_block_')) {
        symbolMap.set(row.name, { nodeId, rowIndex: i });
      }
    });
  }

  // Build adjacency: nodeId → set of node IDs it depends on
  const deps = new Map<string, Set<string>>();
  const edges: { source: string; target: string; symbol: string }[] = [];

  for (const [nodeId, node] of nodes) {
    const nodeDeps = new Set<string>();
    deps.set(nodeId, nodeDeps);

    node.parsedRows.forEach((row) => {
      for (const ref of row.references) {
        const source = symbolMap.get(ref);
        if (source && source.nodeId !== nodeId) {
          nodeDeps.add(source.nodeId);
          edges.push({ source: source.nodeId, target: nodeId, symbol: ref });
        }
      }
    });
  }

  // Topological sort using Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const id of nodes.keys()) inDegree.set(id, 0);
  for (const [, d] of deps) {
    for (const dep of d) {
      inDegree.set(dep, (inDegree.get(dep) || 0)); // dep exists as a node
    }
  }
  // Count how many nodes depend on each node
  const reverseDeps = new Map<string, Set<string>>();
  for (const [nodeId, d] of deps) {
    for (const dep of d) {
      if (!reverseDeps.has(dep)) reverseDeps.set(dep, new Set());
      reverseDeps.get(dep)!.add(nodeId);
    }
  }

  // Kahn's
  const inDeg = new Map<string, number>();
  for (const id of nodes.keys()) inDeg.set(id, 0);
  for (const [, d] of deps) {
    // Each dep is a dependency OF this node, meaning this node depends on dep
    // So for topo sort: edges go dep → this node
  }
  // Actually rebuild inDegree correctly
  for (const id of nodes.keys()) inDeg.set(id, 0);
  for (const [nodeId, d] of deps) {
    inDeg.set(nodeId, d.size);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    visited.add(id);

    // Find all nodes that depend on this one
    const dependents = reverseDeps.get(id) || new Set();
    for (const depId of dependents) {
      const newDeg = (inDeg.get(depId) || 1) - 1;
      inDeg.set(depId, newDeg);
      if (newDeg === 0) queue.push(depId);
    }
  }

  // Detect cycles: any unvisited nodes are in cycles
  const cycles: string[][] = [];
  const unvisited = Array.from(nodes.keys()).filter(id => !visited.has(id));
  if (unvisited.length > 0) {
    cycles.push(unvisited);
  }

  return { order, edges, cycles, symbolMap };
}
