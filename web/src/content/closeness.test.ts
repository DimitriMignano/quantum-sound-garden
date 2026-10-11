import { describe, expect, it } from 'vitest';
import { CHALLENGES, closenessOf, closenessWord, describeOps } from './content';
import { probabilities, simulate } from '../engine/statevector';
import { previewIdeal } from '../engine/browser';
import type { Op } from '../engine/types';

const odds = (nQubits: number, ops: Op[]) => probabilities(simulate({ nQubits, ops }));
const word = (id: string, ops: Op[]) => {
  const c = CHALLENGES.find((x) => x.id === id)!;
  return closenessWord(closenessOf(c, odds(c.tracks.length, ops), ops.length));
};
const H0: Op = { op: 'split', q: 0 }, H1: Op = { op: 'split', q: 1 }, X0: Op = { op: 'flip', q: 0 };
const SYNC: Op = { op: 'link', control: 0, target: 1 };
const HALF: Op = { op: 'twist', q: 0, turns: 0.5 };

describe('goal, hints, solution and the closeness word agree on every puzzle', () => {
  it('the solution Show solution loads passes the puzzle’s own check and reads "there"', () => {
    for (const c of CHALLENGES) {
      const circuit = { nQubits: c.tracks.length, ops: c.solution };
      expect(c.success(previewIdeal(circuit), circuit, 1), c.id).toBe(true);
      expect(word(c.id, c.solution), c.id).toBe('there');
      expect(c.hints.length, c.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('the starting board never already passes, so every puzzle asks for at least one move', () => {
    for (const c of CHALLENGES) {
      const circuit = { nQubits: c.tracks.length, ops: c.start };
      expect(c.success(previewIdeal(circuit), circuit, 1), c.id).toBe(false);
      expect(word(c.id, c.start), c.id).not.toBe('there');
    }
  });

  it('other mixes that do the job count too: the check reads the odds, not the moves', () => {
    const rain = CHALLENGES[0], pair = CHALLENGES[1], footsteps = CHALLENGES[2];
    const ok = (c: typeof rain, ops: Op[]) => c.success(previewIdeal({ nQubits: c.tracks.length, ops }), { nQubits: c.tracks.length, ops }, 1);
    expect(ok(rain, [H0, HALF, H0])).toBe(true);                       // H · P(π) · H = X
    expect(ok(pair, [H1, { op: 'link', control: 1, target: 0 }])).toBe(true); // the pair built from Track B
    expect(ok(pair, [H0, SYNC, X0, { op: 'flip', q: 1 }])).toBe(true);   // swapping both keeps the agreement
    expect(ok(footsteps, [H0, HALF, H0, X0])).toBe(true);               // Shuffle then Swap, instead of undoing the turn
    expect(ok(pair, [H0, H1])).toBe(false);                             // two coin tosses are not a pair
  });

  it('on the pair puzzle the hinted path never goes backwards: far, warmer, there', () => {
    expect(word('pair', [])).toBe('far');
    expect(word('pair', [H0])).toBe('warmer');
    expect(word('pair', [H0, SYNC])).toBe('there');
    expect(word('pair', [H0, H1])).toBe('warmer');
    expect(word('pair', [H0, SYNC, { op: 'flip', q: 1 }])).toBe('far');
  });

  it('on the clean-up puzzle every extra move costs closeness even though the ideal odds never change', () => {
    expect(word('repair', CHALLENGES.find((c) => c.id === 'repair')!.start)).toBe('far');
    expect(word('repair', [H0, SYNC, SYNC, SYNC])).not.toBe('there');
  });

  it('says a mix in studio words', () => {
    expect(describeOps([H0, SYNC], ['Track A', 'Track B'])).toBe('Shuffle Track A, then Sync Track A to Track B');
    expect(describeOps([H0, HALF, HALF, H0], ['Path'])).toBe('Shuffle Path, then Turn ½ on Path, then Turn ½ on Path, then Shuffle Path');
    expect(describeOps([X0], ['Track A'])).toBe('Swap Track A');
  });
});
