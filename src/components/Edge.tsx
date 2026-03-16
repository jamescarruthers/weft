import React from 'react';
import { EdgeInfo, NodeState } from '../types';
import { stripeColor } from '../theme/catppuccin-frappe';

interface Props {
  edge: EdgeInfo;
  nodes: Map<string, NodeState>;
}

const ROW_HEIGHT = 36;
const SLIDER_ROW_HEIGHT = 52;
const HEADER_HEIGHT = 28;

function getRowY(node: NodeState, rowIndex: number): number {
  let y = HEADER_HEIGHT;
  for (let i = 0; i < rowIndex && i < node.parsedRows.length; i++) {
    const row = node.parsedRows[i];
    if ((row.kind === 'var' || row.kind === 'let') && row.valueType === 'number') {
      y += SLIDER_ROW_HEIGHT;
    } else {
      y += ROW_HEIGHT;
    }
  }
  const row = node.parsedRows[rowIndex];
  if (row && (row.kind === 'var' || row.kind === 'let') && row.valueType === 'number') {
    y += SLIDER_ROW_HEIGHT / 2;
  } else {
    y += ROW_HEIGHT / 2;
  }
  return y;
}

export const EdgeComponent: React.FC<Props> = ({ edge, nodes }) => {
  const sourceNode = nodes.get(edge.sourceNodeId);
  const targetNode = nodes.get(edge.targetNodeId);
  if (!sourceNode || !targetNode) return null;

  const srcX = sourceNode.position.x + sourceNode.width;
  const srcY = sourceNode.position.y + getRowY(sourceNode, edge.sourceRowIndex);
  const tgtX = targetNode.position.x;
  const tgtY = targetNode.position.y + getRowY(targetNode, edge.targetRowIndex);

  const dx = Math.abs(tgtX - srcX);
  const cpOffset = Math.max(50, dx * 0.4);

  const sourceRow = sourceNode.parsedRows[edge.sourceRowIndex];
  const color = sourceRow ? stripeColor(sourceRow.kind) : '#8caaee';

  const path = `M ${srcX} ${srcY} C ${srcX + cpOffset} ${srcY}, ${tgtX - cpOffset} ${tgtY}, ${tgtX} ${tgtY}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />
      {/* Source port */}
      <circle cx={srcX} cy={srcY} r={3} fill={color} />
      {/* Target port */}
      <circle cx={tgtX} cy={tgtY} r={3} fill="none" stroke={color} strokeWidth={1.5} />
    </g>
  );
};
