/**
 * A tiny statevector simulator for 1–4 qubits. It exists for two honest reasons:
 *  1. instant ideal probabilities while the person edits the garden (no round trip);
 *  2. a labeled fallback when neither Qollab nor the local Qiskit server is reachable.
 * It is parity-tested against Qiskit's Statevector (see statevector.test.ts + __fixtures__/parity.json).
 * Conventions follow Qiskit: amplitude index i has qubit 0 as its least-significant bit.
 */
import type { Circuit, NoiseSpec, Op } from './types';
import { bitstrings } from './outcomes';

export type Complex = [number, number];

export interface State {
  nQubits: number;
  re: Float64Array;
  im: Float64Array;
}

export function zeroState(nQubits: number): State {
  const dim = 1 << nQubits;
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  re[0] = 1;
  return { nQubits, re, im };
}

/** Apply a 2x2 unitary [[a,b],[c,d]] (complex entries) to qubit q in place. */
function apply1(state: State, q: number, a: Complex, b: Complex, c: Complex, d: Complex): void {
  const { re, im } = state;
  const dim = re.length;
  const bit = 1 << q;
  for (let i = 0; i < dim; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const r0 = re[i], i0 = im[i], r1 = re[j], i1 = im[j];
    // new0 = a*v0 + b*v1 ; new1 = c*v0 + d*v1
    re[i] = a[0] * r0 - a[1] * i0 + b[0] * r1 - b[1] * i1;
    im[i] = a[0] * i0 + a[1] * r0 + b[0] * i1 + b[1] * r1;
    re[j] = c[0] * r0 - c[1] * i0 + d[0] * r1 - d[1] * i1;
    im[j] = c[0] * i0 + c[1] * r0 + d[0] * i1 + d[1] * r1;
  }
}

const H = Math.SQRT1_2;
export const gates = {
  x(s: State, q: number) { apply1(s, q, [0, 0], [1, 0], [1, 0], [0, 0]); },
  y(s: State, q: number) { apply1(s, q, [0, 0], [0, -1], [0, 1], [0, 0]); },
  z(s: State, q: number) { apply1(s, q, [1, 0], [0, 0], [0, 0], [-1, 0]); },
  h(s: State, q: number) { apply1(s, q, [H, 0], [H, 0], [H, 0], [-H, 0]); },
  p(s: State, q: number, theta: number) { apply1(s, q, [1, 0], [0, 0], [0, 0], [Math.cos(theta), Math.sin(theta)]); },
  cx(s: State, control: number, target: number) {
    const { re, im } = s;
    const cb = 1 << control, tb = 1 << target;
    for (let i = 0; i < re.length; i++) {
      if ((i & cb) && !(i & tb)) {
        const j = i | tb;
        const r = re[i], m = im[i];
        re[i] = re[j]; im[i] = im[j];
        re[j] = r; im[j] = m;
      }
    }
  },
};

export function applyOp(state: State, op: Op): void {
  switch (op.op) {
    case 'flip': gates.x(state, op.q); break;
    case 'split': gates.h(state, op.q); break;
    case 'twist': gates.p(state, op.q, op.turns * 2 * Math.PI); break;
    case 'link': gates.cx(state, op.control, op.target); break;
  }
}

export function simulate(circuit: Circuit): State {
  const s = zeroState(circuit.nQubits);
  for (const op of circuit.ops) applyOp(s, op);
  return s;
}

export function probabilities(state: State): Record<string, number> {
  const labels = bitstrings(state.nQubits);
  const out: Record<string, number> = {};
  for (let i = 0; i < labels.length; i++) out[labels[i]] = state.re[i] * state.re[i] + state.im[i] * state.im[i];
  return out;
}

export function amplitudes(state: State): Record<string, Complex> {
  const labels = bitstrings(state.nQubits);
  const out: Record<string, Complex> = {};
  for (let i = 0; i < labels.length; i++) out[labels[i]] = [state.re[i], state.im[i]];
  return out;
}

/** Seeded uniform generator (mulberry32) so tests and replays are reproducible. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample `shots` outcomes from a probability table. */
export function sampleCounts(probs: Record<string, number>, shots: number, random: () => number): Record<string, number> {
  const labels = Object.keys(probs);
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = 0;
  const cum: number[] = [];
  let acc = 0;
  for (const l of labels) { acc += probs[l]; cum.push(acc); }
  for (let n = 0; n < shots; n++) {
    const r = random() * acc;
    let k = 0;
    while (k < cum.length - 1 && r >= cum[k]) k++;
    counts[labels[k]]++;
  }
  return counts;
}

/**
 * Monte Carlo noisy sampling: every shot is its own trajectory. After each 1-qubit gate a random Pauli (X, Y or Z)
 * hits the qubit with probability p1; after each 2-qubit gate each involved qubit with probability p2; each
 * measured bit flips with probability `readout`. This is a stochastic Pauli channel — a standard, honest noise
 * model, deliberately simple and deliberately labeled as in-app simulation.
 */
export function sampleNoisy(circuit: Circuit, shots: number, noise: NoiseSpec, random: () => number): Record<string, number> {
  const labels = bitstrings(circuit.nQubits);
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = 0;
  const pauli = (s: State, q: number) => {
    const r = random() * 3;
    if (r < 1) gates.x(s, q); else if (r < 2) gates.y(s, q); else gates.z(s, q);
  };
  for (let n = 0; n < shots; n++) {
    const s = zeroState(circuit.nQubits);
    for (const op of circuit.ops) {
      applyOp(s, op);
      if (op.op === 'link') {
        if (random() < noise.p2) pauli(s, op.control);
        if (random() < noise.p2) pauli(s, op.target);
      } else if (random() < noise.p1) {
        pauli(s, op.q);
      }
    }
    // measure
    const probs = probabilities(s);
    const r = random();
    let acc = 0, idx = 0;
    for (let i = 0; i < labels.length; i++) { acc += probs[labels[i]]; if (r < acc) { idx = i; break; } idx = i; }
    let bits = idx;
    for (let q = 0; q < circuit.nQubits; q++) if (random() < noise.readout) bits ^= 1 << q;
    counts[labels[bits]]++;
  }
  return counts;
}
