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
      padding: '6px 10px',
    }}>
      <div style={{ color: theme.text, fontSize: '12px', fontWeight: 500, fontFamily: 'inherit' }}>
        {row.name}
      </div>
      <div style={{ color: theme.subtext0, fontSize: '11px', marginTop: '2px' }}>
        → ƒ {row.name}
      </div>
    </div>
  );
};
