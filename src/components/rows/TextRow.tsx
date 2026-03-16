import React, { useCallback, useRef } from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';

interface Props {
  row: ParsedRow;
  onChange: (value: string) => void;
}

export const TextRow: React.FC<Props> = ({ row, onChange }) => {
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stripe = stripeColor(row.kind, row.pragmas.colour);
  const value = row.currentValue ?? row.initialValue ?? '';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChange(val), 150);
  }, [onChange]);

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '6px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ color: theme.text, fontSize: '12px', fontWeight: 500 }}>{row.name}</span>
      <input
        defaultValue={value}
        onChange={handleChange}
        style={{
          maxWidth: '120px', background: theme.surface0, color: theme.text,
          border: `1px solid ${theme.surface2}`, borderRadius: '4px',
          fontSize: '12px', fontFamily: 'inherit', padding: '2px 6px',
          outline: 'none',
        }}
      />
    </div>
  );
};
