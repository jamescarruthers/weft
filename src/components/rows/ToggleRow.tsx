import React from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';

interface Props {
  row: ParsedRow;
  onChange: (value: boolean) => void;
}

export const ToggleRow: React.FC<Props> = ({ row, onChange }) => {
  const stripe = stripeColor(row.kind, row.pragmas.colour);
  const value = row.currentValue ?? row.initialValue ?? false;

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '6px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ color: theme.text, fontSize: '12px', fontWeight: 500 }}>{row.name}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '10px', border: 'none',
          background: value ? theme.green : theme.surface2,
          cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '2px',
          left: value ? '18px' : '2px',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
};
