export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (Number.isInteger(n)) return n.toString();
  const s = n.toPrecision(6);
  return parseFloat(s).toString();
}

export function formatValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'number') return formatNumber(val);
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'boolean') return val.toString();
  if (typeof val === 'function') return `ƒ ${val.name || 'anonymous'}`;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}
