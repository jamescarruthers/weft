import React from 'react';
import { EdgeInfo, NodeState } from '../types';
import { stripeColor } from '../theme/catppuccin-frappe';

interface Props {
  edge: EdgeInfo;
  nodes: Map<string, NodeState>;
  glowing?: 'user' | 'time' | false;
  rowYPositions: Map<string, number>;
}

// Fallback: header(23) + border(1) + half simple row(14)
const FALLBACK_Y = 38;

export const EdgeComponent: React.FC<Props> = ({ edge, nodes, glowing, rowYPositions }) => {
  const sourceNode = nodes.get(edge.sourceNodeId);
  const targetNode = nodes.get(edge.targetNodeId);
  if (!sourceNode || !targetNode) return null;

  const srcYOffset = rowYPositions.get(`${edge.sourceNodeId}:${edge.sourceRowIndex}`) ?? FALLBACK_Y;
  const tgtYOffset = rowYPositions.get(`${edge.targetNodeId}:${edge.targetRowIndex}`) ?? FALLBACK_Y;

  const srcX = sourceNode.position.x + sourceNode.width;
  const srcY = sourceNode.position.y + srcYOffset;
  const tgtX = targetNode.position.x;
  const tgtY = targetNode.position.y + tgtYOffset;

  const dx = Math.abs(tgtX - srcX);
  const cpOffset = Math.max(50, dx * 0.4);

  const sourceRow = sourceNode.parsedRows[edge.sourceRowIndex];
  const color = sourceRow ? stripeColor(sourceRow.kind, sourceRow.pragmas.colour) : '#8caaee';

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
