/**
 * Every user-visible word in one place (American English), plus the challenge definitions. Scientific claims here
 * were checked against the tests in server/tests and web/src/engine/statevector.test.ts.
 */
import type { Circuit, Ideal, Op } from '../engine/types';
import { agreement, marginalOne, bitstrings, bitOf } from '../engine/outcomes';

export const APP = {
  title: 'Quantum Sound Garden',
  tagline: 'Hear quantum behavior. Predict it. Shape it. Then read the circuit.',
  honesty:
    'You are not hearing a quantum state. The sound is ordinary audio driven by the probabilities and the measured shots of a circuit: a real Qiskit circuit whenever a Qiskit engine is available, and every result names the engine that produced it.',
  startButton: 'Enter the garden',
  startHint: 'Sound starts only after you press this. Headphones help.',
  creatorTitle: 'Creator',
  creatorTagline: 'Two seeds, four outcomes, your sounds.',
};

export interface ActionCopy { verb: string; gate: string; what: string; key: string }
export const ACTIONS: Record<Op['op'] | 'bloom', ActionCopy> = {
  flip: { verb: 'Flip', gate: 'X', what: 'Turn the seed over: 0 becomes 1, 1 becomes 0.', key: 'F' },
  split: { verb: 'Split', gate: 'H', what: 'From a definite seed, one path becomes two equal paths. Applied to an already split seed, the paths meet again.', key: 'S' },
  twist: { verb: 'Twist', gate: 'P(θ)', what: 'Rotate the phase of the 1 path. Nothing you can hear changes, until paths meet again.', key: 'T' },
  link: { verb: 'Link', gate: 'CX', what: 'The control seed decides whether the target seed flips. With the target at 0 and the control split, the pair becomes correlated.', key: 'L' },
  bloom: { verb: 'Bloom', gate: 'measure', what: 'Measure every seed. Each shot gives one definite outcome; the garden plays them.', key: 'B' },
};

export const WHY_SHOTS_VARY =
  'A measurement gives one definite outcome, drawn with the probabilities the circuit prepared. Repeating the same circuit does not repeat the same answer; it repeats the same odds. More shots make the measured bars approach the predicted ones, but any single bloom is its own sample. The order you hear is the real shot order when the backend reports it (the local Qiskit simulator does); otherwise it is a shuffle of the counts, because most backends return totals, not order.';

export const LEGEND = [
  { mark: 'glow', text: 'Seed glow: blue is 0, amber is 1; both lobes apart means a split seed, the brighter lobe the likelier reading.' },
  { mark: 'ring', text: 'Magenta ring: the twist (phase) of a split seed. Hidden while a seed is linked, because then its phase is shared.' },
  { mark: 'vine', text: 'Mint vine: a link between seeds; it glows brighter the more their readings agree.' },
  { mark: 'bloom', text: 'Blooms above: outline is the predicted chance of each outcome, solid is what the shots measured.' },
];

export const BACKEND_NOTES = {
  browser: 'Browser math, not Qiskit. Start the local Qiskit server or open this on Qollab for real backends.',
  fallback: (from: string, reason: string) => `Requested ${from}, but it could not run (${reason}). This result came from the local Qiskit simulator instead.`,
  probabilities: 'This backend returned exact probabilities (no shot noise); they were scaled to the shot count.',
};

/** `measured` is the distribution of the bloom that just happened (undefined before any bloom). */
export interface Prediction { id: string; label: string; matches: (ideal: Ideal, measured?: Record<string, number>) => boolean }
export interface Deeper {
  title: string;
  intro: string;
  /** buttons: a bloom with options; `twins` are op lists sharing the shots (a classical mixture);
   *  `dephaseLearner` builds the twin from the learner's own garden: a half-turn twist is inserted before its last
   *  Split half of the time (a random I/Z before recombination = complete dephasing). */
  runs: Array<{ id: string; label: string; basis?: 'z' | 'x'; twins?: Op[][]; useCircuit?: boolean; dephaseLearner?: boolean; explain: string }>;
  outro: string;
}
export interface Seed { name: string; sound: string }
export interface Challenge {
  id: string;
  index: number;
  title: string;
  goal: string;          // the auditory goal, one sentence
  story: string;         // one or two sentences of scene-setting
  seeds: Seed[];
  zeroSound: string;     // what plays when every seed reads 0
  start: Op[];
  allowed: Array<Op['op']>;
  noisy?: boolean;       // run blooms with the teaching noise model
  intended?: Op[];       // for the repair challenge: the clean garden the noisy one should match
  predictions: Prediction[];
  success: (ideal: Ideal, circuit: Circuit, measuredFidelity?: number) => boolean;
  hints: string[];       // progressive; never the full answer in the first
  reveal: { title: string; body: string[]; }; // the physics, the gate names
  deeper?: Deeper;       // the quantum-versus-classical A/B after the reveal
  bloomShots: number;
  moments: number;       // how many shots are played aloud
  step: number;          // seconds per moment
}

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const p1 = (ideal: Ideal, q = 0) => marginalOne(ideal.probabilities, q);

export const CHALLENGES: Challenge[] = [
  {
    id: 'rain',
    index: 1,
    title: 'Make It Rain',
    goal: 'Make the sky seed bloom as rain every single time.',
    story: 'One seed in the sky. It starts as 0, a soft night hush. Measured as 1, it rains.',
    seeds: [{ name: 'Sky', sound: 'rain' }],
    zeroSound: 'hush',
    start: [],
    allowed: ['flip', 'split', 'twist'],
    predictions: [
      { id: 'hush', label: 'Always the hush', matches: (i) => p1(i) < 0.02 },
      { id: 'rain', label: 'Always rain', matches: (i) => p1(i) > 0.98 },
      { id: 'mix', label: 'Sometimes rain, sometimes hush', matches: (i) => p1(i) >= 0.02 && p1(i) <= 0.98 },
    ],
    success: (i) => p1(i) > 0.99,
    hints: [
      'Press Bloom with no actions first. The seed is 0, so you hear the hush. Which action turns a seed over?',
      'Flip is the X gate: it turns 0 into 1. Try it, predict, then Bloom.',
      'A second route: Split, Twist half a turn, Split. Two splits with a half-turn twist between them also flip the seed. Same rain, different path.',
    ],
    reveal: {
      title: 'What you did: an X gate',
      body: [
        'Flip is the Pauli X gate. It takes the seed from |0⟩ to |1⟩, so every measurement reads 1 and every bloom rains.',
        'If you used Split, Twist, Split: H · P(π) · H equals X. The half-turn twist flipped the sign of the second path, and when the paths recombined they canceled on 0 and added on 1. That is interference, and you will use it on purpose in challenge 3.',
      ],
    },
    bloomShots: 12,
    moments: 8,
    step: 0.8,
  },
  {
    id: 'pair',
    index: 2,
    title: 'Perfect Pair',
    goal: 'Rain and thunder each unpredictable on their own, yet thunder only ever arrives with rain.',
    story: 'Two seeds: the sky and the storm. A coin toss for each would give thunder on a dry night half the time. Make them agree.',
    seeds: [{ name: 'Sky', sound: 'rain' }, { name: 'Storm', sound: 'thunder' }],
    zeroSound: 'hush',
    start: [],
    allowed: ['flip', 'split', 'twist', 'link'],
    predictions: [
      { id: 'independent', label: 'Rain and thunder each 50/50, independent of each other', matches: (i) => near(p1(i, 0), 0.5, 0.05) && near(p1(i, 1), 0.5, 0.05) && near(agreement(i.probabilities, 0, 1), 0.5, 0.05) },
      { id: 'together', label: 'Rain and thunder always together, or neither', matches: (i) => near(p1(i, 0), 0.5, 0.05) && agreement(i.probabilities, 0, 1) > 0.98 },
      { id: 'both', label: 'Always both', matches: (i) => p1(i, 0) > 0.98 && p1(i, 1) > 0.98 },
      { id: 'other', label: 'Something else', matches: (i) => !(near(p1(i, 0), 0.5, 0.05) && near(p1(i, 1), 0.5, 0.05) && near(agreement(i.probabilities, 0, 1), 0.5, 0.05)) && !(near(p1(i, 0), 0.5, 0.05) && agreement(i.probabilities, 0, 1) > 0.98) && !(p1(i, 0) > 0.98 && p1(i, 1) > 0.98) },
    ],
    success: (i) => p1(i, 0) > 0.35 && p1(i, 0) < 0.65 && p1(i, 1) > 0.35 && p1(i, 1) < 0.65 && agreement(i.probabilities, 0, 1) > 0.99,
    hints: [
      'Split the sky so rain is a coin toss. Bloom and listen: thunder never comes, because the storm seed is still 0.',
      'Now Link: sky as control, storm as target. The storm flips only when the sky reads 1.',
      'Try Split on both seeds instead of a Link and compare: thunder on dry nights. Independent coins are not a pair.',
    ],
    reveal: {
      title: 'What you did: a Bell pair',
      body: [
        'Split (H) put the sky in an equal superposition. Link (CX) with the sky as control made the storm copy it, path by path. The circuit prepares the Bell state (|00⟩ + |11⟩)/√2.',
        'Each seed alone is a fair coin, yet 01 and 10 have zero probability. Honest caveat: in this one basis, two classical coins glued together would sound exactly the same. What makes the pair quantum shows up when you ask a different question. Go deeper below.',
      ],
    },
    deeper: {
      title: 'Is it really entanglement? Bloom sideways.',
      intro: 'Bloom sideways measures every seed in the X basis (a Split right before measuring). Try the same question on your pair and on two classical twins: seeds that were simply both set to 0 or both set to 1 by a coin toss before the bloom.',
      runs: [
        { id: 'pair-x', label: 'Your pair, sideways', basis: 'x', useCircuit: true, explain: 'Still only together-or-neither. The Bell pair agrees in the sideways question too.' },
        { id: 'twins-z', label: 'Classical twins', basis: 'z', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'In the usual question the twins agree just like your pair: together or neither.' },
        { id: 'twins-x', label: 'Classical twins, sideways', basis: 'x', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'Sideways, this classical copy falls apart: all four outcomes, thunder on dry nights. Its agreement lived in one question only. The Bell pair agrees in both.' },
      ],
      outro: 'Agreement in both the usual and the sideways question is a standard entanglement witness (it assumes the measurements are what they say they are). It is not a Bell test of nonlocality, which needs more angles; it is the two-question version you can hear.',
    },
    bloomShots: 16,
    moments: 10,
    step: 0.8,
  },
  {
    id: 'footsteps',
    index: 3,
    title: 'Silence the Footsteps',
    goal: 'Make the footsteps vanish from the path, using only twists and splits.',
    story: 'The path seed was split and then twisted half a turn. Right now it is 50/50 footsteps. Twisting more changes nothing you can hear. Or does it?',
    seeds: [{ name: 'Path', sound: 'footsteps' }],
    zeroSound: 'crickets',
    start: [{ op: 'split', q: 0 }, { op: 'twist', q: 0, turns: 0.5 }],
    allowed: ['split', 'twist', 'flip'],
    predictions: [
      { id: 'same', label: 'Still 50/50 footsteps', matches: (i) => near(p1(i), 0.5, 0.05) },
      { id: 'certain', label: 'Footsteps every time', matches: (i) => p1(i) > 0.95 },
      { id: 'gone', label: 'Footsteps vanish', matches: (i) => p1(i) < 0.05 },
      { id: 'other', label: 'Something in between', matches: (i) => !near(p1(i), 0.5, 0.05) && p1(i) >= 0.05 && p1(i) <= 0.95 },
    ],
    success: (i) => p1(i) < 0.01,
    hints: [
      'Add a Twist and Bloom. The odds did not move. Phase is invisible until the two paths meet again.',
      'Add a Split now and Bloom. The paths recombined, and the hidden twist decided where they add and where they cancel.',
      'Undo the half turn before the Split: a Twist of half a turn, then Split. The two paths cancel on 1 and the footsteps are gone.',
    ],
    reveal: {
      title: 'What you did: interference',
      body: [
        'After Split and a half-turn Twist the seed was (|0⟩ − |1⟩)/√2. Its probabilities were 50/50, and no twist could change them, because a phase only matters relative to another path.',
        'Split again is where the paths meet. With the minus sign still there, H sends the state to |1⟩: footsteps every time. Twist half a turn first (P(π), which here equals Z) to return to (|0⟩ + |1⟩)/√2, and the second H sends it to |0⟩: silence, every time. Destructive interference on 1, constructive on 0.',
      ],
    },
    deeper: {
      title: 'What if the paths forgot each other?',
      intro: 'A dephased twin is the same garden where, half the time, an extra half-turn twist scrambles the phase between the two paths before they meet. That is what noise on a real device does to coherence.',
      runs: [
        { id: 'coherent', label: 'Your garden', basis: 'z', useCircuit: true, explain: 'Coherent paths: the twist decides where they add and where they cancel.' },
        { id: 'dephased', label: 'Dephased twin', basis: 'z', dephaseLearner: true, explain: 'Your garden, except that half the shots carry a scrambled phase right before the paths meet. The silence is gone: footsteps return, 50/50, however you twist. Interference needs the paths to remember each other.' },
      ],
      outro: 'No classical mixture of the two paths can cancel the footsteps. Only a coherent superposition can, and that is the behavior this whole garden is built on.',
    },
    bloomShots: 12,
    moments: 8,
    step: 0.8,
  },
  {
    id: 'repair',
    index: 4,
    title: 'Repair the Garden',
    goal: 'The pair garden came back noisy: thunder on dry nights. Keep its meaning, lose the extra actions, and hear it clean up.',
    story: 'Someone built the Perfect Pair with six actions where two would do. Every action lets a little noise in. On this garden, noise is turned up so your ear can hear it.',
    seeds: [{ name: 'Sky', sound: 'rain' }, { name: 'Storm', sound: 'thunder' }],
    zeroSound: 'hush',
    start: [
      { op: 'split', q: 0 }, { op: 'split', q: 1 }, { op: 'split', q: 1 },
      { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 },
    ],
    allowed: ['flip', 'split', 'twist', 'link'],
    noisy: true,
    intended: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }],
    predictions: [
      { id: 'clean', label: 'Only together-or-neither, as intended', matches: (_i, m) => !!m && (m['01'] ?? 0) + (m['10'] ?? 0) < 0.03 },
      { id: 'leaks', label: 'Mostly as intended, with some stray thunder or lonely rain', matches: (_i, m) => !!m && (m['01'] ?? 0) + (m['10'] ?? 0) >= 0.03 && (m['01'] ?? 0) + (m['10'] ?? 0) < 0.4 },
      { id: 'random', label: 'Anything goes, four outcomes alike', matches: (_i, m) => !!m && (m['01'] ?? 0) + (m['10'] ?? 0) >= 0.4 },
    ],
    success: (i, c, fid) => {
      const bell = { '00': 0.5, '01': 0, '10': 0, '11': 0.5 };
      const same = Object.keys(bell).every((k) => near(i.probabilities[k] ?? 0, bell[k as keyof typeof bell], 1e-6));
      return same && c.ops.length <= 2 && (fid === undefined || fid > 0.7);
    },
    hints: [
      'Two Splits in a row on the same seed cancel out. Two Links in a row cancel out too. Tap an action on the path to remove it.',
      'The intended garden is Split the sky, Link sky to storm. Nothing else. Compare the measured bars with the predicted ones before and after.',
      'Fewer actions, fewer chances for noise. On real hardware circuit depth is one of the first things that decides whether a result survives.',
    ],
    reveal: {
      title: 'What you did: circuit optimization',
      body: [
        'H·H = I and CX·CX = I, so the six-action garden meant exactly the same state as the two-action one. The ideal probabilities never changed. The measured ones did, because every gate on a noisy device is a chance for an error.',
        'The noise here is a stochastic Pauli model: after each one-seed action a random X, Y or Z with probability 2%, after each Link 6% on each seed, and a 2% readout flip. Those rates are chosen to be audible; real IonQ systems are far quieter. It is simulated in-app unless you picked a noise-model backend. In this model, and often on hardware, a shorter circuit with the same meaning measures closer to its intention. Real devices add their own twists: native gates, idle time, calibration.',
      ],
    },
    bloomShots: 48,
    moments: 16,
    step: 0.6,
  },
];

/** Outcome -> sound ids, derived from per-seed sounds. Seeds reading 1 play; none reading 1 plays the zero sound. */
export function assignmentFor(seeds: Seed[], zeroSound: string): Record<string, string[]> {
  const n = seeds.length;
  const out: Record<string, string[]> = {};
  for (const b of bitstrings(n)) {
    const ids = seeds.filter((_, q) => bitOf(b, q) === 1).map((s) => s.sound);
    out[b] = ids.length ? ids : [zeroSound];
  }
  return out;
}

export const DEFAULT_CREATOR_ASSIGNMENT: Record<string, string[]> = {
  '00': ['hush'], '01': ['rain'], '10': ['birds'], '11': ['thunder'],
};
