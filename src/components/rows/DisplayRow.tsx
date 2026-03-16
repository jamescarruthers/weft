import React from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';
import { formatValue } from '../../utils/numberFormat';

interface Props {
  row: ParsedRow;
}

export const DisplayRow: React.FC<Props> = ({ row }) => {
  const stripe = stripeColor(row.kind, row.pragmas.colour);
  const value = row.currentValue ?? row.initialValue;
  const isConst = row.kind === 'const';

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '6px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{
        color: theme.text, fontSize: '12px', fontWeight: 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {row.name}
      </span>
      <span style={{
        color: isConst ? theme.subtext0 : theme.text,
        fontSize: '12px', fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '150px',
      }}>
        {formatValue(value)}{row.pragmas.unit ? <span style={{ color: theme.overlay0, fontWeight: 400, marginLeft: '3px' }}>{row.pragmas.unit}</span> : null}
      </span>
    </div>
  );
};
