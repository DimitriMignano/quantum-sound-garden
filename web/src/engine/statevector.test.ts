import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/parity.json';
import type { Circuit, Op } from './types';
import { amplitudes, probabilities, rng, sampleCounts, sampleNoisy, simulate } from './statevector';
import { qiskitCode } from './code';
import { agreement, bitOf, distribution, fidelity, marginalOne, shotSequence } from './outcomes';
import { TEACHING_NOISE } from './browser';

type Case = { n_qubits: number; ops: Op[]; basis?: 'z' | 'x'; probabilities: Record<string, number>; amplitudes: Record<string, [number, number]>; qiskit_code: string };
const cases = fixture as unknown as Record<string, Case>;

describe('browser statevector agrees with Qiskit (parity fixture written by pytest)', () => {
  for (const [name, c] of Object.entries(cases)) {
    it(`${name}: probabilities`, () => {
      const p = probabilities(simulate({ nQubits: c.n_qubits, ops: c.ops, basis: c.basis }));
      for (const k of Object.keys(c.probabilities)) expect(p[k]).toBeCloseTo(c.probabilities[k], 9);
    });
    it(`${name}: amplitudes (up to Qiskit's global phase convention, which our gates share)`, () => {
      const a = amplitudes(simulate({ nQubits: c.n_qubits, ops: c.ops, basis: c.basis }));
      for (const k of Object.keys(c.amplitudes)) {
        expect(a[k][0]).toBeCloseTo(c.amplitudes[k][0], 9);
        expect(a[k][1]).toBeCloseTo(c.amplitudes[k][1], 9);
      }
    });
    it(`${name}: generated Qiskit code is identical`, () => {
      expect(qiskitCode({ nQubits: c.n_qubits, ops: c.ops, basis: c.basis }, 256)).toBe(c.qiskit_code);
    });
  }
});

describe('the behaviors the garden teaches', () => {
  const split: Op = { op: 'split', q: 0 };
  it('a twist alone does not change what you hear (probabilities)', () => {
    const base = probabilities(simulate({ nQubits: 1, ops: [split] }));
    const twisted = probabilities(simulate({ nQubits: 1, ops: [split, { op: 'twist', q: 0, turns: 0.37 }] }));
    expect(twisted['1']).toBeCloseTo(base['1'], 12);
  });
  it('a twist between two splits changes the outcome (interference)', () => {
    expect(probabilities(simulate({ nQubits: 1, ops: [split, split] }))['0']).toBeCloseTo(1, 12);
    expect(probabilities(simulate({ nQubits: 1, ops: [split, { op: 'twist', q: 0, turns: 0.5 }, split] }))['1']).toBeCloseTo(1, 12);
  });
  it('bell pair: individually fair, perfectly correlated', () => {
    const p = probabilities(simulate({ nQubits: 2, ops: [split, { op: 'link', control: 0, target: 1 }] }));
    expect(marginalOne(p, 0)).toBeCloseTo(0.5, 12);
    expect(marginalOne(p, 1)).toBeCloseTo(0.5, 12);
    expect(agreement(p, 0, 1)).toBeCloseTo(1, 12);
  });
  it('bit order: in "10" qubit 0 is 0 and qubit 1 is 1', () => {
    expect(bitOf('10', 0)).toBe(0);
    expect(bitOf('10', 1)).toBe(1);
  });
});

describe('sampling and result interpretation', () => {
  it('sampled counts are normalized consistently and approximately balanced', () => {
    const p = probabilities(simulate({ nQubits: 1, ops: [{ op: 'split', q: 0 }] }));
    const counts = sampleCounts(p, 4000, rng(42));
    expect(counts['0'] + counts['1']).toBe(4000);
    const d = distribution(counts);
    expect(Math.abs(d['1'] - 0.5)).toBeLessThan(0.03);
    expect(Object.values(d).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
  });
  it('shot sequence is a deterministic shuffle of the counts', () => {
    const seq = shotSequence({ '00': 3, '11': 2 }, 7);
    expect(seq.length).toBe(5);
    expect(seq.filter((s) => s === '11').length).toBe(2);
    expect(shotSequence({ '00': 3, '11': 2 }, 7)).toEqual(seq);
  });
  it('teaching noise produces unintended outcomes and rewards the shorter circuit', () => {
    const minimal: Circuit = { nQubits: 2, ops: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }] };
    const padded: Circuit = { nQubits: 2, ops: [{ op: 'split', q: 0 }, { op: 'split', q: 1 }, { op: 'split', q: 1 }, { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 }] };
    const ideal = probabilities(simulate(minimal));
    const a = sampleNoisy(minimal, 3000, TEACHING_NOISE, rng(3));
    const b = sampleNoisy(padded, 3000, TEACHING_NOISE, rng(3));
    expect(a['01'] + a['10']).toBeGreaterThan(0);
    expect(fidelity(distribution(a), ideal)).toBeGreaterThan(fidelity(distribution(b), ideal));
  });
});

describe('bloom sideways (X basis)', () => {
  const bell: Circuit = { nQubits: 2, ops: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }] };
  it('a Bell pair stays perfectly correlated sideways; classical twins do not', () => {
    const px = probabilities(simulate({ ...bell, basis: 'x' }));
    expect(px['01']).toBeCloseTo(0, 12); expect(px['10']).toBeCloseTo(0, 12);
    const off = probabilities(simulate({ nQubits: 2, ops: [], basis: 'x' }));
    const on = probabilities(simulate({ nQubits: 2, ops: [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }], basis: 'x' }));
    for (const k of Object.keys(off)) expect(0.5 * off[k] + 0.5 * on[k]).toBeCloseTo(0.25, 12);
  });
});
