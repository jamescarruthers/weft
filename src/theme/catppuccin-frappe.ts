export const theme = {
  base: '#303446',
  mantle: '#292c3c',
  crust: '#232634',
  surface0: '#414559',
  surface1: '#51576d',
  surface2: '#626880',
  overlay0: '#737994',
  overlay1: '#838ba7',
  subtext0: '#a5adce',
  subtext1: '#b5bfe2',
  text: '#c6d0f5',
  rosewater: '#f2d5cf',
  flamingo: '#eebebe',
  pink: '#f4b8e4',
  mauve: '#ca9ee6',
  red: '#e78284',
  maroon: '#ea999c',
  peach: '#ef9f76',
  yellow: '#e5c890',
  green: '#a6d189',
  teal: '#81c8be',
  sky: '#99d1db',
  sapphire: '#85c1dc',
  blue: '#8caaee',
  lavender: '#babbf1',
} as const;

export type ThemeColor = keyof typeof theme;

// Available accent colour names for @colour pragma
const ACCENT_COLORS: Record<string, string> = {
  rosewater: theme.rosewater,
  flamingo: theme.flamingo,
  pink: theme.pink,
  mauve: theme.mauve,
  purple: theme.mauve,
  red: theme.red,
  maroon: theme.maroon,
  peach: theme.peach,
  orange: theme.peach,
  yellow: theme.yellow,
  green: theme.green,
  teal: theme.teal,
  sky: theme.sky,
  sapphire: theme.sapphire,
  blue: theme.blue,
  lavender: theme.lavender,
};

export function resolveThemeColour(name: string): string | undefined {
  return ACCENT_COLORS[name.toLowerCase()];
}

export function stripeColor(kind: string, colourOverride?: string): string {
  if (colourOverride) {
    const resolved = resolveThemeColour(colourOverride);
    if (resolved) return resolved;
  }
  switch (kind) {
    case 'var': return theme.green;
    case 'let': return theme.peach;
    case 'const': return theme.mauve;
    case 'expression': return theme.blue;
    case 'function': return theme.blue;
    case 'complex': return theme.blue;
    default: return theme.blue;
  }
}
