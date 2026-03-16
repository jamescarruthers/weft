import React from 'react';
import { theme } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  visible: boolean;
}

export const Minimap: React.FC<Props> = ({ visible }) => {
  const nodes = useCanvasStore(s => s.nodes);
  const viewport = useCanvasStore(s => s.viewport);

  if (!visible || nodes.size === 0) return null;

  const allNodes = Array.from(nodes.values());
  const minX = Math.min(...allNodes.map(n => n.position.x)) - 50;
  const minY = Math.min(...allNodes.map(n => n.position.y)) - 50;
  const maxX = Math.max(...allNodes.map(n => n.position.x + n.width)) + 50;
  const maxY = Math.max(...allNodes.map(n => n.position.y + 100)) + 50;

  const width = maxX - minX || 400;
  const height = maxY - minY || 300;
  const scale = Math.min(180 / width, 120 / height);

  return (
    <div style={{
      position: 'fixed',
      bottom: '52px',
      right: '8px',
      width: '180px',
      height: '120px',
      background: theme.crust,
      border: `1px solid ${theme.surface0}`,
      borderRadius: '6px',
      overflow: 'hidden',
      zIndex: 80,
    }}>
      <svg width="180" height="120">
        {allNodes.map(n => (
          <rect
            key={n.id}
            x={(n.position.x - minX) * scale}
            y={(n.position.y - minY) * scale}
            width={n.width * scale}
            height={40 * scale}
            fill={theme.surface0}
            stroke={theme.surface1}
            strokeWidth={0.5}
            rx={2}
          />
        ))}
        {/* Viewport indicator */}
        <rect
          x={(-viewport.x / viewport.zoom - minX) * scale}
          y={(-viewport.y / viewport.zoom - minY) * scale}
          width={(window.innerWidth / viewport.zoom) * scale}
          height={(window.innerHeight / viewport.zoom) * scale}
          fill="none"
          stroke={theme.sapphire}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </svg>
    </div>
  );
};
