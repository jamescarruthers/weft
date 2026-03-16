export interface GraphPragma {
  x: string | null;  // null means use t
  y: string;
}

export interface Pragmas {
  range?: { min: number; max: number; step: number };
  log?: boolean;
  int?: boolean;
  color?: boolean;
  hidden?: boolean;
  sparkline?: boolean;
  graphs?: GraphPragma[];
}

export function parsePragmas(comment: string): Pragmas {
  const pragmas: Pragmas = {};

  const rangeMatch = comment.match(/@range\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*([-\d.]+)\s*)?\)/);
  if (rangeMatch) {
    pragmas.range = {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
      step: rangeMatch[3] ? parseFloat(rangeMatch[3]) : (parseFloat(rangeMatch[2]) - parseFloat(rangeMatch[1])) / 200,
    };
  }

  if (/@log\b/.test(comment)) pragmas.log = true;
  if (/@int\b/.test(comment)) pragmas.int = true;
  if (/@color\b/.test(comment)) pragmas.color = true;
  if (/@hidden\b/.test(comment)) pragmas.hidden = true;
  if (/@sparkline\b/.test(comment)) pragmas.sparkline = true;

  const graphMatches = [...comment.matchAll(/@graph\(\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)/g)];
  if (graphMatches.length > 0) {
    pragmas.graphs = graphMatches.map(m => {
      if (m[2]) {
        return { x: m[1], y: m[2] };
      } else {
        return { x: null, y: m[1] };
      }
    });
  }

  return pragmas;
}

export function extractComment(comment: string): string | undefined {
  if (!comment.trim()) return undefined;
  // Strip all pragma annotations, leaving just the human-readable comment
  const cleaned = comment
    .replace(/@range\([^)]*\)/g, '')
    .replace(/@log\b/g, '')
    .replace(/@int\b/g, '')
    .replace(/@color\b/g, '')
    .replace(/@hidden\b/g, '')
    .replace(/@sparkline\b/g, '')
    .replace(/@graph\([^)]*\)/g, '')
    .trim();
  return cleaned || undefined;
}
