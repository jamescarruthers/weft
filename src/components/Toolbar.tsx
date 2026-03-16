import React, { useRef, useState } from 'react';
import { theme } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';
import { demoCanvas } from '../demo';

interface Props {
  minimapVisible: boolean;
  onToggleMinimap: () => void;
  execPanelVisible: boolean;
  onToggleExecPanel: () => void;
}

export const Toolbar: React.FC<Props> = ({ minimapVisible, onToggleMinimap, execPanelVisible, onToggleExecPanel }) => {
  const { viewport, setViewport, zoomToExtents, exportJSON, importJSON, clearCanvas, timeRunning, setTimeRunning, resetTime, timeT, fileName, setFileName } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(fileName);

  const zoomIn = () => setViewport({ zoom: Math.min(4, viewport.zoom * 1.2) });
  const zoomOut = () => setViewport({ zoom: Math.max(0.25, viewport.zoom / 1.2) });
  const zoomReset = () => setViewport({ zoom: 1 });

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${useCanvasStore.getState().fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      importJSON(text);
    };
    reader.readAsText(file);
  };

  const btn = (label: string, onClick: () => void, active?: boolean) => (
    <button
      onClick={onClick}
      style={{
        background: active ? theme.surface2 : 'transparent',
        color: theme.subtext0,
        border: `1px solid ${theme.surface1}`,
        borderRadius: '4px',
        padding: '3px 8px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '36px',
      background: theme.crust,
      borderBottom: `1px solid ${theme.surface0}`,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0 12px',
      zIndex: 100,
    }}>
      <span style={{ color: theme.text, fontWeight: 600, fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", marginRight: '12px' }}>
        Weft
      </span>

      {btn('-', zoomOut)}
      <span style={{ color: theme.subtext0, fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", minWidth: '40px', textAlign: 'center' }}>
        {Math.round(viewport.zoom * 100)}%
      </span>
      {btn('+', zoomIn)}
      {btn('1:1', zoomReset)}
      {btn('Fit', zoomToExtents)}

      <div style={{ width: '1px', height: '20px', background: theme.surface1 }} />

      {btn(timeRunning ? '⏸ t' : '▶ t', () => setTimeRunning(!timeRunning), timeRunning)}
      {btn('↺ t', resetTime)}
      <span style={{ color: theme.subtext0, fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", minWidth: '60px' }}>
        t={timeT.toFixed(2)}
      </span>

      <div style={{ flex: 1 }} />

      {editingName ? (
        <input
          autoFocus
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onBlur={() => { setFileName(nameValue); setEditingName(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { setFileName(nameValue); setEditingName(false); }
            if (e.key === 'Escape') { setNameValue(fileName); setEditingName(false); }
          }}
          style={{
            background: theme.surface0, color: theme.text, border: `1px solid ${theme.surface2}`,
            borderRadius: '4px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500, padding: '2px 8px', outline: 'none', textAlign: 'center',
            width: '160px',
          }}
        />
      ) : (
        <span
          onClick={() => { setEditingName(true); setNameValue(fileName); }}
          style={{
            color: theme.subtext0, fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500, cursor: 'text', padding: '2px 8px',
            borderRadius: '4px', border: '1px solid transparent',
          }}
        >
          {fileName}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {btn('Clear', () => { if (confirm('Clear entire canvas?')) clearCanvas(); })}
      {btn('Demo', () => importJSON(JSON.stringify(demoCanvas)))}

      <div style={{ width: '1px', height: '20px', background: theme.surface1 }} />

      {btn('Minimap', onToggleMinimap, minimapVisible)}
      {btn('Exec', onToggleExecPanel, execPanelVisible)}
      {btn('Export', handleExport)}
      {btn('Import', () => fileInputRef.current?.click())}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
    </div>
  );
};
