import React, { useId } from 'react';
import { theme } from '../theme/catppuccin-frappe';

interface Point {
  x: number;
  y: number;
}

interface Props {
  points: Point[];
  width: number;
  height: number;
  xLabel?: string;
  yLabel?: string;
}

const PADDING = { top: 4, right: 8, bottom: 14, left: 28 };

export const Graph: React.FC<Props> = ({ points, width, height, xLabel, yLabel }) => {
  if (points.length < 2) {
    return (
      <div style={{
        width, height,
        background: theme.crust,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.overlay0,
        fontSize: '9px',
      }}>
        waiting for data…
      </div>
    );
  }

  const clipId = useId();
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  // Prevent zero-range
  if (xMax === xMin) { xMin -= 1; xMax += 1; }
  if (yMax === yMin) { yMin -= 1; yMax += 1; }

  // Add 5% padding to y range
  const yPad = (yMax - yMin) * 0.05;
  yMin -= yPad;
  yMax += yPad;

  const toSvgX = (v: number) => PADDING.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (v: number) => PADDING.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const polyline = points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');

  // Tick formatting
  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toExponential(0);
    if (Number.isInteger(v)) return v.toString();
    return v.toPrecision(3);
  };

  // Grid lines (3 horizontal, 2 vertical)
  const yTicks = [0, 0.5, 1].map(f => yMin + f * (yMax - yMin));
  const xTicks = [0, 1].map(f => xMin + f * (xMax - xMin));

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} rx={4} fill={theme.crust} />

      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={`yg${i}`}>
          <line
            x1={PADDING.left} y1={toSvgY(v)}
            x2={width - PADDING.right} y2={toSvgY(v)}
            stroke={theme.surface0} strokeWidth={0.5}
          />
          <text
            x={PADDING.left - 3} y={toSvgY(v) + 3}
            fill={theme.overlay0} fontSize={7} textAnchor="end"
            fontFamily="'JetBrains Mono', monospace"
          >
            {fmt(v)}
          </text>
        </g>
      ))}

      {/* X axis ticks */}
      {xTicks.map((v, i) => (
        <text
          key={`xt${i}`}
          x={toSvgX(v)} y={height - 2}
          fill={theme.overlay0} fontSize={7} textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
        >
          {fmt(v)}
        </text>
      ))}

      {/* Axis labels */}
      {xLabel && (
        <text
          x={PADDING.left + plotW / 2} y={height - 1}
          fill={theme.subtext0} fontSize={7} textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
        >
          {xLabel}
        </text>
      )}

      {/* Plot area border */}
      <rect
        x={PADDING.left} y={PADDING.top}
        width={plotW} height={plotH}
        fill="none" stroke={theme.surface0} strokeWidth={0.5}
      />

      {/* Data line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={theme.blue}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        clipPath={`url(#${clipId})`}
      />

      <defs>
        <clipPath id={clipId}>
          <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>
    </svg>
  );
};
