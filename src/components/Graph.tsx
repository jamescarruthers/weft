import React, { useId } from 'react';
import { theme } from '../theme/catppuccin-frappe';

interface Point {
  x: number;
  y: number;
}

export interface GraphSeries {
  label: string;
  points: Point[];
  color: string;
}

interface Props {
  series: GraphSeries[];
  width: number;
  height: number;
  xLabel?: string;
}

const SERIES_COLORS = [
  theme.blue,
  theme.green,
  theme.peach,
  theme.mauve,
  theme.pink,
  theme.teal,
  theme.red,
  theme.yellow,
];

const PADDING = { top: 4, right: 8, bottom: 14, left: 28 };

export function getSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const Graph: React.FC<Props> = ({ series, width, height, xLabel }) => {
  const clipId = useId();

  const allPoints = series.flatMap(s => s.points);
  if (allPoints.length < 2) {
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

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (xMax === xMin) { xMin -= 1; xMax += 1; }
  if (yMax === yMin) { yMin -= 1; yMax += 1; }

  const yPad = (yMax - yMin) * 0.05;
  yMin -= yPad;
  yMax += yPad;

  const toSvgX = (v: number) => PADDING.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (v: number) => PADDING.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toExponential(0);
    if (Number.isInteger(v)) return v.toString();
    return v.toPrecision(3);
  };

  const yTicks = [0, 0.5, 1].map(f => yMin + f * (yMax - yMin));
  const xTicks = [0, 1].map(f => xMin + f * (xMax - xMin));

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
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

      {/* X axis label */}
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

      {/* Data lines */}
      {series.map((s, si) => {
        if (s.points.length < 2) return null;
        const polyline = s.points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');
        return (
          <polyline
            key={si}
            points={polyline}
            fill="none"
            stroke={s.color}
            strokeWidth={1.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#${clipId})`}
          />
        );
      })}

      {/* Legend (if multiple series) */}
      {series.length > 1 && series.map((s, si) => (
        <g key={`legend${si}`}>
          <line
            x1={PADDING.left + 4}
            y1={PADDING.top + 6 + si * 10}
            x2={PADDING.left + 14}
            y2={PADDING.top + 6 + si * 10}
            stroke={s.color} strokeWidth={1.5}
          />
          <text
            x={PADDING.left + 17}
            y={PADDING.top + 9 + si * 10}
            fill={theme.subtext0} fontSize={7}
            fontFamily="'JetBrains Mono', monospace"
          >
            {s.label}
          </text>
        </g>
      ))}

      <defs>
        <clipPath id={clipId}>
          <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>
    </svg>
  );
};
