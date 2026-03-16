export function computeSliderRange(v: number): { min: number; max: number; step: number } {
  let min: number, max: number;

  if (v === 0) {
    min = -1;
    max = 1;
  } else if (v > 0) {
    min = 0;
    max = v * 2;
  } else {
    min = v * 2;
    max = 0;
  }

  const range = max - min;
  const rawStep = range / 200;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.round(rawStep / magnitude) * magnitude;

  return { min, max, step: step || 0.01 };
}
