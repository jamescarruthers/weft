import React, { useCallback, useState, useRef } from 'react';
import { ParsedRow } from '../../types';
import { theme, stripeColor } from '../../theme/catppuccin-frappe';
import { formatNumber } from '../../utils/numberFormat';

interface Props {
  row: ParsedRow;
  onChange: (value: number) => void;
}

export const SliderRow: React.FC<Props> = ({ row, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const range = row.range || { min: 0, max: 100, step: 1 };
  const isNull = row.currentValue === null;
  const value = isNull ? (row.initialValue ?? 0) : (row.currentValue ?? row.initialValue ?? 0);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const handleValueClick = () => {
    setEditing(true);
    setEditValue(String(value));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) onChange(num);
    setEditing(false);
  };

  const stripe = stripeColor(row.kind, row.pragmas.colour);
  const fillPct = ((value - range.min) / (range.max - range.min)) * 100;

  return (
    <div style={{
      borderLeft: `3px solid ${stripe}`,
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: theme.text, fontSize: '12px', fontWeight: 500 }}>{row.name}</span>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
            style={{
              width: '60px', textAlign: 'right', background: theme.surface0,
              color: theme.peach, border: `1px solid ${theme.surface2}`, borderRadius: '4px',
              fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', padding: '1px 4px',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{ color: isNull ? theme.overlay0 : theme.peach, fontSize: '12px', fontWeight: 600, cursor: isNull ? 'default' : 'pointer', fontStyle: isNull ? 'italic' : 'normal' }}
            onClick={isNull ? undefined : handleValueClick}
          >
            {isNull ? 'null' : <>{formatNumber(value)}{row.pragmas.unit ? <span style={{ color: theme.overlay0, fontWeight: 400, marginLeft: '3px' }}>{row.pragmas.unit}</span> : null}</>}
          </span>
        )}
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={handleSlider}
        disabled={isNull}
        style={{
          width: '100%',
          height: '4px',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: isNull
            ? theme.surface0
            : `linear-gradient(to right, ${theme.green} ${fillPct}%, ${theme.surface0} ${fillPct}%)`,
          borderRadius: '2px',
          outline: 'none',
          cursor: isNull ? 'default' : 'pointer',
          opacity: isNull ? 0.4 : 1,
        }}
      />
    </div>
  );
};
