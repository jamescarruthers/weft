import { SaveFormat } from './types';

export const demoCanvas: SaveFormat = {
  version: 1,
  viewport: { x: 60, y: 20, zoom: 0.85 },
  nodes: [
    // 1. Basic variables with sliders
    {
      id: 'demo_sliders',
      code: `// Interactive Controls
var amplitude = 1.0 // wave amplitude @range(0, 5, 0.1)
var frequency = 2.0 // oscillation speed @range(0.1, 10, 0.1)
var offset = 0 // vertical offset`,
      position: { x: 20, y: 20 },
      width: 280,
      title: 'Interactive Controls',
      collapsed: false,
      colorTag: null,
    },

    // 2. Constants
    {
      id: 'demo_constants',
      code: `// Constants
const PI = Math.PI
const TAU = PI * 2
const gravity = 9.81 // @unit("m/s²")`,
      position: { x: 20, y: 280 },
      width: 260,
      title: 'Constants',
      collapsed: false,
      colorTag: null,
    },

    // 3. Computed expressions with dependencies
    {
      id: 'demo_wave',
      code: `// Wave Output
const signal = amplitude * Math.sin(t * frequency) + offset // @sparkline
const rectified = Math.abs(signal) // @sparkline`,
      position: { x: 380, y: 20 },
      width: 300,
      title: 'Wave Output',
      collapsed: false,
      colorTag: null,
    },

    // 4. Graph demo — single series
    {
      id: 'demo_graph_single',
      code: `// Signal Plot
const wave = amplitude * Math.sin(t * frequency) + offset // @graph(wave)`,
      position: { x: 380, y: 200 },
      width: 300,
      title: 'Signal Plot',
      collapsed: false,
      colorTag: null,
    },

    // 5. Graph demo — multi series
    {
      id: 'demo_graph_multi',
      code: `// Multi-Signal Compare
const sinWave = amplitude * Math.sin(t * frequency)
const cosWave = amplitude * Math.cos(t * frequency)
const combined = sinWave + cosWave // @graph(sinWave) @graph(cosWave) @graph(combined)`,
      position: { x: 380, y: 400 },
      width: 320,
      title: 'Multi-Signal Compare',
      collapsed: false,
      colorTag: null,
    },

    // 6. String input
    {
      id: 'demo_string',
      code: `// Text Input
var label = "hello"
var prefix = ">"`,
      position: { x: 20, y: 480 },
      width: 240,
      title: 'Text Input',
      collapsed: false,
      colorTag: null,
    },

    // 7. Boolean toggle
    {
      id: 'demo_bool',
      code: `// Toggles
var enabled = true
var inverted = false`,
      position: { x: 20, y: 620 },
      width: 240,
      title: 'Toggles',
      collapsed: false,
      colorTag: null,
    },

    // 8. Conditional logic using booleans
    {
      id: 'demo_conditional',
      code: `// Conditional
const output = enabled ? (inverted ? -signal : signal) : 0 // @sparkline`,
      position: { x: 740, y: 20 },
      width: 280,
      title: 'Conditional',
      collapsed: false,
      colorTag: null,
    },

    // 9. Function definition
    {
      id: 'demo_function',
      code: `// Utilities
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}`,
      position: { x: 740, y: 160 },
      width: 280,
      title: 'Utilities',
      collapsed: false,
      colorTag: null,
    },

    // 10. Using the function
    {
      id: 'demo_clamped',
      code: `// Clamped Output
var lowerBound = -0.5 // @range(-2, 0, 0.1)
var upperBound = 0.5 // @range(0, 2, 0.1)
const clamped = clamp(signal, lowerBound, upperBound) // @graph(signal) @graph(clamped)`,
      position: { x: 740, y: 340 },
      width: 320,
      title: 'Clamped Output',
      collapsed: false,
      colorTag: null,
    },

    // 11. Array data
    {
      id: 'demo_array',
      code: `// Array Data
var weights = [0.2, 0.5, 1.0]`,
      position: { x: 20, y: 760 },
      width: 260,
      title: 'Array Data',
      collapsed: false,
      colorTag: null,
    },

    // 12. Math & destructuring
    {
      id: 'demo_math',
      code: `// Destructured Math
const { sin, cos, atan2 } = Math`,
      position: { x: 740, y: 560 },
      width: 260,
      title: 'Destructured Math',
      collapsed: false,
      colorTag: null,
    },

    // 13. Physics sim
    {
      id: 'demo_physics',
      code: `// Physics
var mass = 2.0 // @unit("kg") @range(0.1, 10, 0.1)
var friction = 0.8 // coefficient @range(0, 1, 0.01)
const normalForce = mass * gravity // @unit("N")
const frictionForce = friction * normalForce // @unit("N") @sparkline`,
      position: { x: 380, y: 620 },
      width: 300,
      title: 'Physics',
      collapsed: false,
      colorTag: null,
    },

    // 14. Hidden pragma + range demo
    {
      id: 'demo_pragmas',
      code: `// Pragma Examples
var angle = 45 // @unit("°") @range(0, 360, 1) @int
var scale = 1.0 // @range(0.01, 10, 0.01) @log
var _internal = angle * Math.PI / 180 // @hidden
const x_pos = scale * cos(_internal) // @colour("red")
const y_pos = scale * sin(_internal) // @colour("blue") @graph(x_pos, y_pos)`,
      position: { x: 380, y: 820 },
      width: 300,
      title: 'Pragma Examples',
      collapsed: false,
      colorTag: null,
    },
  ],
};
