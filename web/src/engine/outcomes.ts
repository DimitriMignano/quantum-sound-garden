/** The ONE place that knows Qiskit's bit order: in '10', qubit 0 is the rightmost character. */
export function bitstrings(nQubits: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < 1 << nQubits; i++) out.push(i.toString(2).padStart(nQubits, '0'));
  return out;
}

/** Value of qubit `q` inside an outcome bitstring. */
export function bitOf(outcome: string, q: number): 0 | 1 {
  return outcome[outcome.length - 1 - q] === '1' ? 1 : 0;
}

/** Index of an outcome in the statevector ordering (little-endian integer). */
export function indexOf(outcome: string): number {
  return parseInt(outcome, 2);
}

/** Marginal probability that qubit q reads 1. */
export function marginalOne(probabilities: Record<string, number>, q: number): number {
  let p = 0;
  for (const [k, v] of Object.entries(probabilities)) if (bitOf(k, q) === 1) p += v;
  return p;
}

/** Probability that two qubits agree (both 0 or both 1): 1 = perfectly correlated, 0.5 = independent fair coins. */
export function agreement(probabilities: Record<string, number>, a: number, b: number): number {
  let p = 0;
  for (const [k, v] of Object.entries(probabilities)) if (bitOf(k, a) === bitOf(k, b)) p += v;
  return p;
}

export function distribution(counts: Record<string, number>): Record<string, number> {
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) out[k] = v / total;
  return out;
}

/** Classical fidelity (Bhattacharyya) between two distributions over the same outcomes: 1 = identical. */
export function fidelity(p: Record<string, number>, q: Record<string, number>): number {
  const keys = new Set([...Object.keys(p), ...Object.keys(q)]);
  let s = 0;
  for (const k of keys) s += Math.sqrt((p[k] ?? 0) * (q[k] ?? 0));
  return s * s;
}

/**
 * A deterministic shuffle of the counts into a sequence of outcomes — backends return counts, not order,
 * so the order the garden plays them in is ours. Mulberry32 seeded so a replay is identical.
 */
export function shotSequence(counts: Record<string, number>, seed = 1): string[] {
  const seq: string[] = [];
  for (const [k, v] of Object.entries(counts)) for (let i = 0; i < v; i++) seq.push(k);
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
}
