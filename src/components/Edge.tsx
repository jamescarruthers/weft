import React from 'react';
import { EdgeInfo, NodeState } from '../types';
import { stripeColor } from '../theme/catppuccin-frappe';

interface Props {
  edge: EdgeInfo;
  nodes: Map<string, NodeState>;
  glowing?: 'user' | 'time' | false;
}

const COMMENT_HEIGHT = 17;
const DIVIDER_HEIGHT = 1;
const NODE_BORDER = 1;

// Header: 4px padding top + ~14px content + 4px padding bottom + 1px border-bottom
const HEADER_HEIGHT = 23;

// Row: 6px padding top + ~16px content + 6px padding bottom
const SIMPLE_ROW_HEIGHT = 28;

// Slider row: 6px padding top + ~16px name line + 4px gap + ~12px slider + 6px padding bottom
const SLIDER_ROW_HEIGHT = 44;

// Sparkline: 0px top padding + 14px sparkline + 2px bottom padding
const SPARKLINE_HEIGHT = 16;

// Graph: 2px top padding + 72px graph + 4px bottom padding
const GRAPH_HEIGHT = 78;

function getRowY(node: NodeState, rowIndex: number): number {
  // Start after the node's top border and header
  let y = NODE_BORDER + HEADER_HEIGHT;

  for (let i = 0; i < rowIndex && i < node.parsedRows.length; i++) {
    // Divider before each row except the first
    if (i > 0) {
      y += DIVIDER_HEIGHT;
    }

    const row = node.parsedRows[i];
    const isSlider = (row.kind === 'var' || row.kind === 'let') && row.valueType === 'number';
    y += isSlider ? SLIDER_ROW_HEIGHT : SIMPLE_ROW_HEIGHT;

    // Sparkline below the row
    if (row.pragmas.sparkline) {
      y += SPARKLINE_HEIGHT;
    }

    // Graph below the row
    if (row.pragmas.graphs && row.pragmas.graphs.length > 0) {
      y += GRAPH_HEIGHT;
    }

    // Comment below the row
    if (row.comment) {
      y += COMMENT_HEIGHT;
    }
  }

  // Divider before this row (if not first)
  if (rowIndex > 0) {
    y += DIVIDER_HEIGHT;
  }

  // Center vertically within this row
  const row = node.parsedRows[rowIndex];
  if (row) {
    const isSlider = (row.kind === 'var' || row.kind === 'let') && row.valueType === 'number';
    const rowH = isSlider ? SLIDER_ROW_HEIGHT : SIMPLE_ROW_HEIGHT;
    y += rowH / 2;
  }

  return y;
}

export const EdgeComponent: React.FC<Props> = ({ edge, nodes, glowing }) => {
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

  const isUser = glowing === 'user';
  const isTime = glowing === 'time';

  return (
    <g>
      {/* Glow layer */}
      {isUser && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeOpacity={0.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={isUser ? 2.5 : isTime ? 1.8 : 1.5}
        strokeOpacity={isUser ? 1 : isTime ? 0.8 : 0.6}
      />
      {/* Source port */}
      <circle cx={srcX} cy={srcY} r={isUser ? 4 : 3} fill={color} fillOpacity={isUser ? 1 : 0.8} />
      {/* Target port */}
      <circle cx={tgtX} cy={tgtY} r={isUser ? 4 : 3} fill="none" stroke={color} strokeWidth={isUser ? 2 : 1.5} strokeOpacity={isUser ? 1 : 0.8} />
    </g>
  );
};
