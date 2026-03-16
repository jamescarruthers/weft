import React, { useState, useCallback } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { TransportBar } from './components/TransportBar';
import { ExecutionPanel } from './components/ExecutionPanel';
import { Minimap } from './components/Minimap';

const App: React.FC = () => {
  const [minimapVisible, setMinimapVisible] = useState(false);
  const [execPanelVisible, setExecPanelVisible] = useState(false);

  const toggleMinimap = useCallback(() => setMinimapVisible(v => !v), []);
  const toggleExecPanel = useCallback(() => setExecPanelVisible(v => !v), []);

  return (
    <>
      <Toolbar
        minimapVisible={minimapVisible}
        onToggleMinimap={toggleMinimap}
        execPanelVisible={execPanelVisible}
        onToggleExecPanel={toggleExecPanel}
      />
      <Canvas />
      <TransportBar />
      <ExecutionPanel visible={execPanelVisible} />
      <Minimap visible={minimapVisible} />
    </>
  );
};

export default App;
