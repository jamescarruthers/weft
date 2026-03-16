import React from 'react';
import { theme } from '../theme/catppuccin-frappe';

interface Props {
  history: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const Sparkline: React.FC<Props> = ({
  history,
  width = 40,
  height = 12,
  color = theme.blue,
}) => {
  if (history.length < 2) return null;

  const values = history.slice(-50); // last 50 samples
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      style={{ flexShrink: 0, opacity: 0.8 }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
