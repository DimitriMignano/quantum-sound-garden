/**
 * A statevector as a ket string, for the page: (|00⟩ + |11⟩)/√2, (|0⟩ − |1⟩)/√2, (|0⟩ + i|1⟩)/√2, 0.92|0⟩ − 0.38i|1⟩.
 * The global phase is removed (the first nonzero amplitude is made real and positive) because it is unobservable,
 * and it is what makes H · P(π) · H read cleanly. Keys are Qiskit bitstrings (qubit 0 is the rightmost bit).
 */
export function ketString(amplitudes: Record<string, [number, number]>): string {
  const terms = Object.entries(amplitudes).filter(([, [re, im]]) => Math.hypot(re, im) > 1e-6).sort(([a], [b]) => (a < b ? -1 : 1));
  if (terms.length === 0) return '0';
  const [, [r0, i0]] = terms[0];
  const g = Math.atan2(i0, r0);
  const rotated = terms.map(([k, [re, im]]) => {
    const c = Math.cos(-g), s = Math.sin(-g);
    return [k, re * c - im * s, re * s + im * c] as const;
  });
  const mags = rotated.map(([, re, im]) => Math.hypot(re, im));
  const same = mags.every((m) => Math.abs(m - mags[0]) < 1e-4);
  const factor = same ? commonFactor(mags[0]) : null;
  const body = rotated.map(([k, re, im], i) => {
    const mag = Math.hypot(re, im);
    const ang = Math.atan2(im, re);
    const { neg, phase } = phaseLabel(ang);
    const coef = same && factor !== null ? '' : mag.toFixed(2);
    const sign = i === 0 ? (neg ? '−' : '') : neg ? ' − ' : ' + ';
    return `${sign}${coef}${phase}|${k}⟩`;
  }).join('');
  if (factor === null || factor === '') return body;
  return terms.length === 1 ? `${body}` : `(${body})${factor}`;
}

/** 1 → '', 1/√2 → '/√2', 1/2 → '/2', else null (write decimals per term) */
function commonFactor(m: number): string | null {
  if (Math.abs(m - 1) < 1e-4) return '';
  if (Math.abs(m - Math.SQRT1_2) < 1e-4) return '/√2';
  if (Math.abs(m - 0.5) < 1e-4) return '/2';
  return null;
}

/** the phase of one term: a sign, and i, −i or e^{iθ} written as a fraction of π */
function phaseLabel(ang: number): { neg: boolean; phase: string } {
  const t = ang / Math.PI; // in units of π, (-1, 1]
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;
  if (near(t, 0)) return { neg: false, phase: '' };
  if (near(Math.abs(t), 1)) return { neg: true, phase: '' };
  if (near(t, 0.5)) return { neg: false, phase: 'i' };
  if (near(t, -0.5)) return { neg: true, phase: 'i' };
  const frac = [[1, 4], [1, 8], [3, 4], [3, 8], [5, 8], [7, 8], [1, 3], [2, 3], [1, 6], [5, 6]].find(([n, d]) => near(Math.abs(t), n / d));
  const inner = frac ? `${frac[0] === 1 ? '' : frac[0]}π/${frac[1]}` : `${Math.abs(t).toFixed(2)}π`;
  return { neg: false, phase: `e^{${t < 0 ? '−' : ''}i${inner}}` };
}
