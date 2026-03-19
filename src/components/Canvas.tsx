import React, { useCallback, useRef, useEffect, useState } from 'react';
import { theme } from '../theme/catppuccin-frappe';
import { useCanvasStore } from '../store/canvasStore';
import { CanvasNode } from './Node';
import { EdgeComponent } from './Edge';

export const Canvas: React.FC = () => {
  const {
    nodes, viewport, edges, selectedNodeIds, glowingEdges, rowYPositions,
    addNode, setViewport, clearSelection, execution, setPlaying, stepForward,
  } = useCanvasStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; vpX: number; vpY: number } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Double-click to create node
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement) !== containerRef.current) return;
    const x = (e.clientX - viewport.x) / viewport.zoom;
    const y = (e.clientY - viewport.y) / viewport.zoom;
    addNode(x, y);
  }, [addNode, viewport]);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      setIsPanning(true);
      panRef.current = { startX: e.clientX, startY: e.clientY, vpX: viewport.x, vpY: viewport.y };
    } else if (e.button === 0 && (e.target as HTMLElement) === containerRef.current) {
      clearSelection();
    }
  }, [spaceHeld, viewport, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setViewport({ x: panRef.current.vpX + dx, y: panRef.current.vpY + dy });
    }
  }, [isPanning, setViewport]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panRef.current = null;
  }, []);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(4, viewport.zoom * delta));

    // Zoom toward cursor
    const mx = e.clientX;
    const my = e.clientY;
    const newX = mx - (mx - viewport.x) * (newZoom / viewport.zoom);
    const newY = my - (my - viewport.y) * (newZoom / viewport.zoom);

    setViewport({ zoom: newZoom, x: newX, y: newY });
  }, [viewport, setViewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.target as HTMLElement)?.closest('.cm-editor')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setSpaceHeld(true);
          if (execution.mode === 'stepped') {
            setPlaying(!execution.playing);
          }
          break;
        case 'n':
        case 'N':
          addNode(
            (-viewport.x + window.innerWidth / 2) / viewport.zoom,
            (-viewport.y + window.innerHeight / 2) / viewport.zoom
          );
          break;
        case '.':
          stepForward();
          break;
        case ',':
          useCanvasStore.getState().stepBack();
          break;
        case 'Home':
          useCanvasStore.getState().jumpToStart();
          break;
        case 'End':
          useCanvasStore.getState().jumpToEnd();
          break;
        case 'Delete':
        case 'Backspace':
          for (const id of selectedNodeIds) {
            useCanvasStore.getState().deleteNode(id);
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) useCanvasStore.getState().redo();
            else useCanvasStore.getState().undo();
            e.preventDefault();
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            useCanvasStore.getState().duplicateSelected();
          }
          break;
        case 't':
        case 'T':
          useCanvasStore.getState().setExecutionMode(execution.mode === 'live' ? 'stepped' : 'live');
          break;
        case 'g':
        case 'G':
          useCanvasStore.getState().setGranularity(execution.granularity === 'nodes' ? 'lines' : 'nodes');
          break;
        case 'l':
        case 'L':
          useCanvasStore.getState().setLooping(!execution.looping);
          break;
        case ']':
          useCanvasStore.getState().setStepsPerSecond(execution.stepsPerSecond * 2);
          break;
        case '[':
          useCanvasStore.getState().setStepsPerSecond(execution.stepsPerSecond / 2);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [addNode, viewport, selectedNodeIds, execution, setPlaying, stepForward]);

  // Playback timer
  useEffect(() => {
    if (!execution.playing || execution.mode !== 'stepped') return;
    const interval = setInterval(() => {
      const state = useCanvasStore.getState();
      const exec = state.execution;
      if (exec.currentStep >= exec.sequence.length) {
        if (exec.looping && (exec.maxLoops === 0 || exec.loopCount + 1 < exec.maxLoops)) {
          // Reset to start but preserve loop count
          const newNodes = new Map(state.nodes);
          for (const [id, node] of newNodes) {
            const newRows = node.parsedRows.map(row => ({ ...row, currentValue: null }));
            newNodes.set(id, { ...node, parsedRows: newRows });
          }
          const resetSequence = exec.sequence.map(s => ({ ...s, status: 'pending' as const }));
          useCanvasStore.setState({
            scope: {},
            nodes: newNodes,
            execution: { ...exec, currentStep: 0, loopCount: exec.loopCount + 1, sequence: resetSequence, snapshots: new Map() },
          });
        } else {
          state.setPlaying(false);
        }
        return;
      }
      state.stepForward();
    }, 1000 / execution.stepsPerSecond);
    return () => clearInterval(interval);
  }, [execution.playing, execution.mode, execution.stepsPerSecond]);

  // Time variable animation loop
  useEffect(() => {
    let rafId: number;
    const loop = (timestamp: number) => {
      useCanvasStore.getState().tick(timestamp);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Auto-save
  useEffect(() => {
    const timer = setInterval(() => {
      useCanvasStore.getState().saveToLocalStorage();
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Load on mount
  useEffect(() => {
    useCanvasStore.getState().loadFromLocalStorage();
  }, []);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Simple: just create a node at right-click position
    // Could be expanded to a full context menu
  }, []);

  const nodeArray = Array.from(nodes.values());

  // Generate dot grid pattern — matches GRID constant
  const dotSpacing = 16;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '36px',
        left: 0,
        right: 0,
        bottom: '44px',
        background: theme.base,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'default',
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* Dot grid background */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <pattern
            id="dotGrid"
            x={viewport.x % (dotSpacing * viewport.zoom)}
            y={viewport.y % (dotSpacing * viewport.zoom)}
            width={dotSpacing * viewport.zoom}
            height={dotSpacing * viewport.zoom}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={1}
              cy={1}
              r={1}
              fill={theme.surface0}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotGrid)" />
      </svg>

      {/* Transform container */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Edges SVG layer */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '10000px',
            height: '10000px',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {edges.map((edge, i) => (
            <EdgeComponent
              key={`${edge.sourceNodeId}-${edge.targetNodeId}-${edge.symbol}-${i}`}
              edge={edge}
              nodes={nodes}
              glowing={glowingEdges.get(`${edge.sourceNodeId}-${edge.targetNodeId}-${edge.symbol}`) || false}
              rowYPositions={rowYPositions}
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodeArray.map(node => (
          <CanvasNode
            key={node.id}
            node={node}
            selected={selectedNodeIds.has(node.id)}
            zoom={viewport.zoom}
          />
        ))}
      </div>
    </div>
  );
};
