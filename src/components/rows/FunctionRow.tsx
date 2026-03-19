import React from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';

interface Props {
  row: ParsedRow;
}

export const FunctionRow: React.FC<Props> = ({ row }) => {
  const stripe = stripeColor(row.kind, row.pragmas.colour);

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '0 10px',
      height: '32px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ color: theme.text, fontSize: '12px', fontWeight: 500, fontFamily: 'inherit' }}>
        {row.name}
      </span>
      <span style={{ color: theme.subtext0, fontSize: '11px' }}>
        → ƒ {row.name}
      </span>
    </div>
  );
};
