import { describe, expect, it } from 'vitest';
import { CHALLENGES, closenessOf, closenessWord } from './content';
import { probabilities, simulate } from '../engine/statevector';
import type { Op } from '../engine/types';

const odds = (nQubits: number, ops: Op[]) => probabilities(simulate({ nQubits, ops }));
const word = (id: string, ops: Op[]) => {
  const c = CHALLENGES.find((x) => x.id === id)!;
  return closenessWord(closenessOf(c, odds(c.tracks.length, ops), ops.length));
};
const H0: Op = { op: 'split', q: 0 }, H1: Op = { op: 'split', q: 1 }, X0: Op = { op: 'flip', q: 0 };
const SYNC: Op = { op: 'link', control: 0, target: 1 };
const HALF: Op = { op: 'twist', q: 0, turns: 0.5 };

describe('the closeness word in the goal panel', () => {
  it('reads "there" for a solving mix and never "there" for the starting board, on every puzzle', () => {
    const solutions: Record<string, Op[]> = {
      rain: [X0],
      pair: [H0, SYNC],
      footsteps: [H0, HALF, HALF, H0],
      repair: [H0, SYNC],
    };
    for (const c of CHALLENGES) {
      expect(word(c.id, solutions[c.id]), c.id).toBe('there');
      expect(word(c.id, c.start), c.id).not.toBe('there');
    }
  });

  it('on the pair puzzle the hinted path never goes backwards: far, warmer, there', () => {
    expect(word('pair', [])).toBe('far');
    expect(word('pair', [H0])).toBe('warmer');
    expect(word('pair', [H0, SYNC])).toBe('there');
  });

  it('on the pair puzzle two coin tosses are not a pair, and a Swap after the Sync breaks it', () => {
    expect(word('pair', [H0, H1])).toBe('warmer');
    expect(word('pair', [H0, SYNC, { op: 'flip', q: 1 }])).toBe('far');
  });

  it('on the clean-up puzzle every extra move costs closeness even though the ideal odds never change', () => {
    expect(word('repair', CHALLENGES.find((c) => c.id === 'repair')!.start)).toBe('far');
    expect(word('repair', [H0, SYNC, SYNC, SYNC])).not.toBe('there');
  });
});
