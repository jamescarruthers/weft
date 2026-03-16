import { NodeState, ExecutionStep } from '../types';
import { DagResult } from './dag';

function compileStep(code: string, symbolsWritten: string[]): ((scope: Record<string, any>) => Record<string, any>) | null {
  try {
    const returnObj = symbolsWritten.length > 0
      ? `return { ${symbolsWritten.map(s => `${JSON.stringify(s)}: typeof ${s} !== 'undefined' ? ${s} : undefined`).join(', ')} };`
      : '';

    const fnBody = `with(__scope__) { ${code}; ${returnObj} }`;
    return new Function('__scope__', fnBody) as any;
  } catch {
    return null;
  }
}

export function buildSequence(
  nodes: Map<string, NodeState>,
  dag: DagResult,
  granularity: 'lines' | 'nodes'
): ExecutionStep[] {
  const steps: ExecutionStep[] = [];

  for (const nodeId of dag.order) {
    const node = nodes.get(nodeId);
    if (!node) continue;

    if (granularity === 'nodes') {
      // One step per node
      const allWritten: string[] = [];
      const allRead: string[] = [];
      const allCode: string[] = [];

      for (const row of node.parsedRows) {
        if (row.name && !row.name.startsWith('_expr_') && !row.name.startsWith('_block_')) {
          allWritten.push(row.name);
        }
        allRead.push(...row.references);
        allCode.push(row.code);
      }

      const code = node.code;
      steps.push({
        nodeId,
        lineIndex: -1,
        code,
        compiledFn: compileStep(code, allWritten),
        symbolsWritten: allWritten,
        symbolsRead: [...new Set(allRead)],
        status: 'pending',
      });
    } else {
      // One step per row/line
      for (let i = 0; i < node.parsedRows.length; i++) {
        const row = node.parsedRows[i];
        const symbolsWritten = row.name && !row.name.startsWith('_expr_') && !row.name.startsWith('_block_')
          ? [row.name]
          : [];

        steps.push({
          nodeId,
          lineIndex: i,
          code: row.code,
          compiledFn: compileStep(row.code, symbolsWritten),
          symbolsWritten,
          symbolsRead: [...row.references],
          status: 'pending',
        });
      }
    }
  }

  return steps;
}
