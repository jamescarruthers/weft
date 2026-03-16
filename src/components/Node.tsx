import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeState } from '../types';
import { theme, stripeColor } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';
import { NodeEditor } from './NodeEditor';
import { Sparkline } from './Sparkline';
import { Graph, getSeriesColor } from './Graph';
import type { GraphSeries } from './Graph';
import { SliderRow } from './rows/SliderRow';
import { TextRow } from './rows/TextRow';
import { ToggleRow } from './rows/ToggleRow';
import { DisplayRow } from './rows/DisplayRow';
import { ArrayRow } from './rows/ArrayRow';
import { FunctionRow } from './rows/FunctionRow';

interface Props {
  node: NodeState;
  selected: boolean;
  zoom: number;
}

export const CanvasNode: React.FC<Props> = ({ node, selected, zoom }) => {
  const {
    updateNodeCode, updateNodePosition, setNodeEditing, setNodeTitle,
    deleteNode, updateValue, selectNode, pushUndo, sparklineHistory, graphHistory,
    edges, glowingEdges, setRowYPosition,
  } = useCanvasStore();

  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);

  // Compute which row indices are glow targets and their intensity
  const glowingRows = useMemo(() => {
    const map = new Map<number, 'user' | 'time'>();
    for (const edge of edges) {
      if (edge.targetNodeId !== node.id) continue;
      const edgeKey = `${edge.sourceNodeId}-${edge.targetNodeId}-${edge.symbol}`;
      const glowType = glowingEdges.get(edgeKey);
      if (glowType) {
        const existing = map.get(edge.targetRowIndex);
        // Don't downgrade user to time
        if (!existing || existing !== 'user') {
          map.set(edge.targetRowIndex, glowType);
        }
      }
    }
    return map;
  }, [edges, glowingEdges, node.id]);

  // Map variable names to their graph series color
  const graphColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of node.parsedRows) {
      if (row.pragmas.graphs) {
        row.pragmas.graphs.forEach((g: { y: string }, gi: number) => {
          map.set(g.y, getSeriesColor(gi));
        });
      }
    }
    return map;
  }, [node.parsedRows]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;
    e.stopPropagation();
    selectNode(node.id, e.shiftKey);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      nodeX: node.position.x, nodeY: node.position.y,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      updateNodePosition(node.id, dragRef.current.nodeX + dx, dragRef.current.nodeY + dy);
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [node.id, node.position, zoom, selectNode, updateNodePosition]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    pushUndo();
    setNodeEditing(node.id, true);
  }, [node.id, pushUndo, setNodeEditing]);

  const handleSaveCode = useCallback((code: string) => {
    updateNodeCode(node.id, code);
    setNodeEditing(node.id, false);
  }, [node.id, updateNodeCode, setNodeEditing]);

  const handleCancelEdit = useCallback(() => {
    setNodeEditing(node.id, false);
  }, [node.id, setNodeEditing]);

  // Measure row Y positions after render
  useEffect(() => {
    const nodeEl = nodeRef.current;
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    const zoomRatio = nodeRect.width / node.width;
    if (zoomRatio === 0) return;
    for (const [idx, el] of rowRefs.current) {
      const rowRect = el.getBoundingClientRect();
      const y = Math.round((rowRect.top + rowRect.height / 2 - nodeRect.top) / zoomRatio);
      setRowYPosition(node.id, idx, y);
    }
  });

  const statusColor = node.status === 'error' ? theme.red : node.status === 'computing' ? theme.yellow : theme.green;

  const renderRow = (row: typeof node.parsedRows[0], index: number) => {
    if (row.pragmas.hidden) return null;

    const handleChange = (value: any) => {
      pushUndo();
      updateValue(node.id, index, value);
    };

    if ((row.kind === 'var' || row.kind === 'let') && row.valueType === 'number') {
      return <SliderRow key={index} row={row} onChange={handleChange} />;
    }
    if ((row.kind === 'var' || row.kind === 'let') && row.valueType === 'string') {
      return <TextRow key={index} row={row} onChange={handleChange} />;
    }
    if ((row.kind === 'var' || row.kind === 'let') && row.valueType === 'boolean') {
      return <ToggleRow key={index} row={row} onChange={handleChange} />;
    }
    if ((row.kind === 'var' || row.kind === 'let') && (row.valueType === 'array' || row.valueType === 'object')) {
      return <ArrayRow key={index} row={row} onEdit={() => setNodeEditing(node.id, true)} />;
    }
    if (row.kind === 'function') {
      return <FunctionRow key={index} row={row} />;
    }
    return <DisplayRow key={index} row={row} />;
  };

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        width: `${node.width}px`,
        background: theme.mantle,
        border: `1px solid ${selected ? theme.sapphire : theme.surface1}`,
        borderWidth: selected ? '2px' : '1px',
        borderRadius: '8px',
        boxShadow: selected
          ? `0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)`
          : `0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)`,
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'none',
        transition: 'box-shadow 0.15s',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 8px', background: theme.crust, borderBottom: `1px solid ${theme.surface0}`,
        cursor: 'grab', fontSize: '11px', fontWeight: 600,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: statusColor,
            flexShrink: 0,
          }} />
          {editingTitle ? (
            <input
              className="node-interactive"
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={() => { setNodeTitle(node.id, titleValue); setEditingTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { setNodeTitle(node.id, titleValue); setEditingTitle(false); } }}
              style={{
                background: theme.surface0, color: theme.text, border: 'none',
                fontSize: '11px', fontFamily: 'inherit', fontWeight: 600,
                padding: '0 4px', borderRadius: '2px', outline: 'none',
                width: '100%',
              }}
            />
          ) : (
            <span
              style={{ color: theme.text, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => { setEditingTitle(true); setTitleValue(node.title); }}
            >
              {node.title}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            className="node-interactive"
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
            style={{
              background: 'none', border: 'none', color: theme.overlay0,
              cursor: 'pointer', fontSize: '11px', padding: '0 2px',
            }}
          >✕</button>
          <button
            className="node-interactive"
            onClick={(e) => { e.stopPropagation(); pushUndo(); setNodeEditing(node.id, true); }}
            style={{
              background: 'none', border: 'none', color: theme.overlay0,
              cursor: 'pointer', fontSize: '11px', padding: '0 2px',
            }}
          >✎</button>
        </div>
      </div>

      {/* Body */}
      {node.editing ? (
        <div className="node-interactive">
          <NodeEditor
            code={node.code}
            onSave={handleSaveCode}
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        <div>
          {node.parsedRows.length === 0 && node.errors.length === 0 && (
            <div style={{ padding: '12px', color: theme.overlay0, fontSize: '11px', textAlign: 'center' }}>
              Double-click to edit
            </div>
          )}
          {node.parsedRows.map((row, i) => {
            const histKey = `${node.id}:${row.name}`;
            const hist = row.pragmas.sparkline ? sparklineHistory.get(histKey) : undefined;
            let graphSeries: GraphSeries[] | undefined;
            let graphXLabel: string | undefined;
            if (row.pragmas.graphs && row.pragmas.graphs.length > 0) {
              graphXLabel = row.pragmas.graphs[0].x || 't';
              const localNames = new Set(node.parsedRows.map(r => r.name));
              graphSeries = row.pragmas.graphs.map((g: { x: string | null; y: string }, gi: number) => ({
                label: g.y,
                points: graphHistory.get(`${node.id}:${row.name}:graph:${g.y}`) || [],
                color: getSeriesColor(gi),
                external: !localNames.has(g.y),
              }));
            }
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ height: '1px', background: theme.surface0 }} />}
                <div
                  className="node-interactive"
                  ref={el => { if (el) rowRefs.current.set(i, el); else rowRefs.current.delete(i); }}
                  style={{ position: 'relative' }}
                >
                  {renderRow(row, i)}
                  {glowingRows.has(i) && (() => {
                    const type = glowingRows.get(i)!;
                    const color = stripeColor(row.kind);
                    return (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: color,
                        boxShadow: type === 'user'
                          ? `0 0 8px 2px ${color}, 0 0 16px 4px ${color}`
                          : `0 0 4px 1px ${color}`,
                        pointerEvents: 'none',
                      }} />
                    );
                  })()}
                  {graphColorMap.has(row.name) && (
                    <div style={{
                      position: 'absolute',
                      left: '7px',
                      top: '9px',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: graphColorMap.get(row.name),
                    }} />
                  )}
                </div>
                {hist && hist.length >= 2 && (
                  <div style={{ padding: '0 10px 2px 16px' }}>
                    <Sparkline history={hist} width={node.width - 32} height={14} />
                  </div>
                )}
                {graphSeries && (
                  <div style={{ padding: '2px 6px 4px 6px' }}>
                    <Graph
                      series={graphSeries}
                      width={node.width - 18}
                      height={72}
                      xLabel={graphXLabel}
                    />
                  </div>
                )}
                {row.comment && (
                  <div style={{
                    padding: '0 10px 4px 16px',
                    color: theme.overlay0,
                    fontSize: '10px',
                    fontStyle: 'italic',
                    lineHeight: 1.3,
                  }}>
                    {row.comment}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {node.errors.map((err, i) => (
            <div key={`err-${i}`} style={{
              padding: '4px 8px', color: theme.red, fontSize: '11px', fontWeight: 400,
              borderTop: `1px solid ${theme.surface0}`,
            }}>
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
