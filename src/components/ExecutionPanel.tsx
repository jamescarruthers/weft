import React from 'react';
import { theme } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  visible: boolean;
}

export const ExecutionPanel: React.FC<Props> = ({ visible }) => {
  const execution = useCanvasStore(s => s.execution);
  const nodes = useCanvasStore(s => s.nodes);
  const dag = useCanvasStore(s => s.dag);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: '44px',
      width: '280px',
      background: theme.crust,
      borderLeft: `1px solid ${theme.surface0}`,
      overflow: 'auto',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: theme.text,
      zIndex: 90,
    }}>
      <div style={{ padding: '12px', borderBottom: `1px solid ${theme.surface0}`, fontWeight: 600, fontSize: '12px' }}>
        Execution Order
      </div>

      {execution.sequence.map((step, i) => {
        const node = nodes.get(step.nodeId);
        const isActive = i === execution.currentStep;
        const isEvaluated = i < execution.currentStep;
        const isError = step.status === 'error';

        return (
          <div
            key={i}
            onClick={() => useCanvasStore.getState().jumpToStep(i)}
            style={{
              padding: '6px 12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              cursor: 'pointer',
              background: isActive ? `${theme.sapphire}22` : 'transparent',
              borderLeft: isEvaluated ? `2px solid ${theme.sapphire}` : '2px solid transparent',
              opacity: !isEvaluated && !isActive ? 0.5 : 1,
            }}
          >
            <span style={{ color: theme.overlay0, width: '20px', textAlign: 'right' }}>{i + 1}</span>
            <span style={{
              color: isError ? theme.red : isActive ? theme.sapphire : isEvaluated ? theme.green : theme.overlay0,
              fontSize: '10px',
            }}>
              {isError ? '✗' : isActive ? '●' : isEvaluated ? '✓' : '○'}
            </span>
            <span style={{ color: theme.subtext0 }}>{node?.title || step.nodeId}</span>
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: theme.overlay0,
            }}>
              {step.code.slice(0, 30)}
            </span>
          </div>
        );
      })}

      <div style={{
        padding: '12px', borderTop: `1px solid ${theme.surface0}`,
        color: theme.subtext0,
      }}>
        <div>Nodes: {nodes.size} &nbsp; Lines: {execution.sequence.length}</div>
        <div>Cycles: {dag?.cycles.length ? `${dag.cycles.length} detected` : 'none'}</div>
      </div>
    </div>
  );
};
