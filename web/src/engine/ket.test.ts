import { describe, expect, it } from 'vitest';
import { ketString } from './ket';
import { amplitudes, simulate } from './statevector';
import type { Op } from './types';

const ket = (nQubits: number, ops: Op[]) => ketString(amplitudes(simulate({ nQubits, ops })));
const H0: Op = { op: 'split', q: 0 }, H1: Op = { op: 'split', q: 1 }, X0: Op = { op: 'flip', q: 0 };
const P = (turns: number): Op => ({ op: 'twist', q: 0, turns });
const CX: Op = { op: 'link', control: 0, target: 1 };

describe('the state line', () => {
  it('writes the basis states and the common factors', () => {
    expect(ket(1, [])).toBe('|0⟩');
    expect(ket(1, [X0])).toBe('|1⟩');
    expect(ket(1, [H0])).toBe('(|0⟩ + |1⟩)/√2');
    expect(ket(2, [H0, CX])).toBe('(|00⟩ + |11⟩)/√2');
    expect(ket(2, [H0, H1])).toBe('(|00⟩ + |01⟩ + |10⟩ + |11⟩)/2');
  });
  it('shows the phase the Turn sets, which the odds bar cannot', () => {
    expect(ket(1, [H0, P(0.5)])).toBe('(|0⟩ − |1⟩)/√2');
    expect(ket(1, [H0, P(0.25)])).toBe('(|0⟩ + i|1⟩)/√2');
    expect(ket(1, [H0, P(-0.25)])).toBe('(|0⟩ − i|1⟩)/√2');
    expect(ket(1, [H0, P(0.125)])).toBe('(|0⟩ + e^{iπ/4}|1⟩)/√2');
  });
  it('drops the global phase so H · P(π) · H reads as a plain |1⟩, and uneven odds read as decimals', () => {
    expect(ket(1, [H0, P(0.5), H0])).toBe('|1⟩');
    expect(ket(1, [H0, P(0.5), P(0.5), H0])).toBe('|0⟩');
    expect(ket(1, [H0, P(0.125), H0])).toBe('0.92|0⟩ − 0.38i|1⟩');
  });
});
