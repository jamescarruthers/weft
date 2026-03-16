import React from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';

interface Props {
  row: ParsedRow;
  onEdit: () => void;
}

export const ArrayRow: React.FC<Props> = ({ row, onEdit }) => {
  const stripe = stripeColor(row.kind, row.pragmas.colour);
  const value = row.currentValue ?? row.initialValue ?? [];
  let display: string;
  try { display = JSON.stringify(value); } catch { display = String(value); }

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '6px 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: theme.text, fontSize: '12px', fontWeight: 500 }}>{row.name}</span>
        <span style={{
          color: theme.subtext0, fontSize: '12px', fontWeight: 600,
          maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {display}
        </span>
      </div>
      <div style={{ textAlign: 'right', marginTop: '2px' }}>
        <button onClick={onEdit} style={{
          background: 'none', border: 'none', color: theme.blue,
          fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ✎ edit
        </button>
      </div>
    </div>
  );
};
