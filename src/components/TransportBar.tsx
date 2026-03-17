import React from 'react';
import { theme } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';

export const TransportBar: React.FC = () => {
  const execution = useCanvasStore(s => s.execution);
  const {
    setExecutionMode, setGranularity, stepForward, stepBack,
    setPlaying, setLooping, setMaxLoops, setStepsPerSecond, jumpToStart, jumpToEnd,
  } = useCanvasStore();

  const total = execution.sequence.length;
  const current = execution.currentStep;

  const btn = (label: string, onClick: () => void, active?: boolean) => (
    <button
      onClick={onClick}
      style={{
        background: active ? theme.surface2 : theme.surface0,
        color: theme.text,
        border: `1px solid ${theme.surface1}`,
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: 500,
        minWidth: '28px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '44px',
      background: theme.crust,
      borderTop: `1px solid ${theme.surface0}`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 16px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: theme.text,
      zIndex: 100,
    }}>
      {/* Mode toggle */}
      {btn(execution.mode === 'live' ? 'Live' : 'Step', () => {
        setExecutionMode(execution.mode === 'live' ? 'stepped' : 'live');
      }, true)}

      <div style={{ width: '1px', height: '24px', background: theme.surface1 }} />

      {/* Transport controls */}
      {btn('⏮', jumpToStart)}
      {btn('◀', stepBack)}
      {btn(execution.playing ? '⏸' : '▶', () => setPlaying(!execution.playing))}
      {btn('▶', stepForward)}
      {btn('⏭', jumpToEnd)}

      <div style={{ width: '1px', height: '24px', background: theme.surface1 }} />

      {/* Step counter */}
      <span style={{ color: theme.subtext0, minWidth: '80px' }}>
        Step {current} / {total}
      </span>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={total}
        value={current}
        onChange={(e) => {
          const store = useCanvasStore.getState();
          store.jumpToStep(parseInt(e.target.value));
        }}
        style={{
          flex: 1,
          maxWidth: '200px',
          height: '4px',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: theme.surface0,
          borderRadius: '2px',
          outline: 'none',
        }}
      />

      <div style={{ width: '1px', height: '24px', background: theme.surface1 }} />

      {/* Granularity */}
      {btn(execution.granularity === 'nodes' ? 'Nodes' : 'Lines', () => {
        setGranularity(execution.granularity === 'nodes' ? 'lines' : 'nodes');
      })}

      {/* Loop */}
      {btn(execution.looping ? '🔁' : '↻', () => setLooping(!execution.looping), execution.looping)}
      {execution.looping && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.subtext0, fontSize: '10px' }}>
            {execution.loopCount}{execution.maxLoops > 0 ? `/${execution.maxLoops}` : ''}
          </span>
          <span style={{ color: theme.overlay0, fontSize: '10px' }}>max:</span>
          <input
            type="number"
            min={0}
            value={execution.maxLoops}
            onChange={e => setMaxLoops(parseInt(e.target.value) || 0)}
            title="Max loops (0 = infinite)"
            style={{
              width: '36px', background: theme.surface0, color: theme.text,
              border: `1px solid ${theme.surface1}`, borderRadius: '4px',
              fontSize: '10px', fontFamily: 'inherit', padding: '2px 4px',
              outline: 'none', textAlign: 'center',
            }}
          />
        </div>
      )}

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => setStepsPerSecond(execution.stepsPerSecond / 2)} style={{
          background: 'none', border: 'none', color: theme.subtext0, cursor: 'pointer', fontSize: '12px',
        }}>-</button>
        <span style={{ color: theme.subtext0, minWidth: '40px', textAlign: 'center' }}>
          {execution.stepsPerSecond} sps
        </span>
        <button onClick={() => setStepsPerSecond(execution.stepsPerSecond * 2)} style={{
          background: 'none', border: 'none', color: theme.subtext0, cursor: 'pointer', fontSize: '12px',
        }}>+</button>
      </div>
    </div>
  );
};
