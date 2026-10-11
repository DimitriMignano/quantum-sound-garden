/**
 * Every user-visible word in one place (American English), plus the tutorial, the puzzles, the recap and the studio.
 * The first-run path (welcome → Learn → puzzles) uses studio words only: tracks, sounds, Play, the four moves. Quantum
 * words arrive when a puzzle is solved ("In quantum terms"), on the recap page, and in the Circuit view. Every claim here
 * was checked against the tests in server/tests and web/src/engine/statevector.test.ts.
 */
import type { Circuit, Ideal, Op } from '../engine/types';
import { agreement, fidelity, marginalOne, bitstrings, bitOf } from '../engine/outcomes';

export const APP = {
  title: 'Quantum Beats Studio',
  pitch: 'Make sounds with the rules of quantum physics.',
  lead: 'Learn four moves by ear. Solve four puzzles. Make a beat.',
  honesty:
    'You are not hearing a quantum state. The sound is ordinary audio driven by the measured results of a circuit (a real Qiskit circuit whenever a Qiskit engine is available), and every result names the engine that produced it.',
  startButton: 'Start (3 minutes)',
  startHint: 'Sound starts when you press this.',
  studioTitle: 'Studio',
  studioTagline: 'Make a beat.',
};

export interface ActionCopy { verb: string; gate: string; what: string }
export const ACTIONS: Record<Op['op'] | 'bloom', ActionCopy> = {
  flip: { verb: 'Swap', gate: 'X', what: 'Switches the track to its other sound.' },
  split: { verb: 'Shuffle', gate: 'H', what: 'Makes the track a coin toss. A second Shuffle undoes it.' },
  twist: { verb: 'Turn', gate: 'P(θ)', what: 'Sets a hidden dial on a shuffled track. You hear it at the next Shuffle.' },
  link: { verb: 'Sync', gate: 'CX', what: 'When this track hits, the other track switches too.' },
  bloom: { verb: 'Play', gate: 'measure', what: 'Every track lands on one of its sounds and plays it once.' },
};

export const WHY_BEATS_VARY =
  'Each Play is one measurement: one definite answer, drawn with the odds the mix set. The same mix, played again, gives the same odds, not the same answer.';

export const BACKEND_NOTES = {
  browser: 'Browser math, not Qiskit. Start the local Qiskit server or open this on Qollab for real backends.',
  fallback: (from: string, reason: string) => `Requested ${from}, but it could not run (${reason}). This result came from the local Qiskit simulator instead.`,
  probabilities: 'This backend returned exact probabilities (no shot noise); they were scaled to the reading count.',
};

/** A track always plays one of two sounds: `base` when it reads 0, `hit` when it reads 1. */
export interface Track { name: string; base: string; hit: string }

/** Outcome -> sound ids: every track contributes its base or its hit, so each track is always audible. */
export function assignmentFor(tracks: Track[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const b of bitstrings(tracks.length)) out[b] = tracks.map((t, q) => (bitOf(b, q) === 1 ? t.hit : t.base));
  return out;
}

const TURN_LABEL: Record<string, string> = { '0.5': '½', '0.25': '¼', '0.125': '⅛', '-0.25': '−¼' };

/** A mix in words: "Shuffle Track A, then Sync Track A to Track B". Used by Show solution. */
export function describeOps(ops: Op[], names: string[]): string {
  const one = (o: Op): string => {
    if (o.op === 'flip') return `Swap ${names[o.q]}`;
    if (o.op === 'split') return `Shuffle ${names[o.q]}`;
    if (o.op === 'twist') return `Turn ${TURN_LABEL[String(o.turns)] ?? o.turns} on ${names[o.q]}`;
    return `Sync ${names[o.control]} to ${names[o.target]}`;
  };
  return ops.map(one).join(', then ');
}

export interface Deeper {
  title: string;
  intro: string;
  /** buttons: a Play with options; `twins` are op lists sharing the readings (a classical mixture);
   *  `dephaseLearner` builds the twin from the learner's own mix: a half-turn Turn is inserted before its last
   *  Shuffle half of the time (a random I/Z before recombination = complete dephasing). */
  runs: Array<{ id: string; label: string; basis?: 'z' | 'x'; twins?: Op[][]; useCircuit?: boolean; dephaseLearner?: boolean; explain: string }>;
  outro: string;
}

export interface Challenge {
  id: string;
  index: number;
  title: string;
  goal: string;          // one sentence, in sound words; the biggest text on the page
  done: string;          // one sentence: what you will see and hear, exactly what `success` checks
  story?: string;        // one sentence of setup, only when it is needed
  tracks: Track[];
  start: Op[];
  allowed: Array<Op['op']>;
  /** the ideal distribution of a solved mix; the closeness word compares the current odds to it */
  target: Record<string, number>;
  /** how close the odds are to the goal, 0..1; default: fidelity to `target`. A puzzle whose goal has parts sets its own,
   *  so the closeness word never drops when the learner takes the first hinted step. */
  closeness?: (probabilities: Record<string, number>) => number;
  /** how much of the quantum circuit this puzzle shows: 1 gate names · 2 + the readings as bits and odds · 3 + the Qiskit
   *  code once solved · 4 the full Circuit view. Each puzzle shows one step more than the last. */
  exposure: 1 | 2 | 3 | 4;
  noisy?: boolean;       // Play with the teaching noise model
  intended?: Op[];       // for the clean-up puzzle: the clean mix the noisy one should match
  /** any mix that does the job counts: the check reads the odds (and, for the clean-up puzzle, the move count and the measured match) */
  success: (ideal: Ideal, circuit: Circuit, measuredFidelity?: number) => boolean;
  hints: string[];       // one step each, in order; the last one is the solution in words
  solution: Op[];        // the whole mix Show solution loads (start moves included)
  quantum: { concept: string; lines: string[] }; // the lesson, in quantum words, shown once the puzzle is solved
  deeper?: Deeper;       // the quantum-versus-classical A/B, under Go deeper
  beats: number;
  moments: number;       // how many readings are played aloud (1: a Play is one sound)
  step: number;          // seconds a played sound lasts
}

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const p1 = (ideal: Ideal, q = 0) => marginalOne(ideal.probabilities, q);
const TRACK_A: Track = { name: 'Track A', base: 'car', hit: 'rain' };
const TRACK_B: Track = { name: 'Track B', base: 'bell', hit: 'thunder' };
const BELL = { '00': 0.5, '01': 0, '10': 0, '11': 0.5 };
const H0: Op = { op: 'split', q: 0 };
const X0: Op = { op: 'flip', q: 0 };
const HALF: Op = { op: 'twist', q: 0, turns: 0.5 };
const SYNC: Op = { op: 'link', control: 0, target: 1 };

export const CHALLENGES: Challenge[] = [
  {
    id: 'rain',
    index: 1,
    title: 'Make It Rain',
    goal: 'Make Track A play rain, every Play.',
    done: 'The tile reads always Rain.',
    tracks: [TRACK_A],
    start: [],
    allowed: ['flip', 'split', 'twist'],
    target: { '0': 0, '1': 1 },
    exposure: 1,
    success: (i) => p1(i) > 0.99,
    hints: [
      'Swap switches a track to its other sound.',
      'Press Swap, then Play.',
    ],
    solution: [X0],
    quantum: {
      concept: 'A qubit, and the X gate',
      lines: [
        'A track is a qubit. It reads 0 (the car) or 1 (rain).',
        'Swap is the X gate: it takes |0⟩ to |1⟩, so every reading is 1.',
        'Shuffle, Turn ½, Shuffle does the same job: H · P(π) · H = X.',
      ],
    },
    beats: 12,
    moments: 8,
    step: 0.8,
  },
  {
    id: 'pair',
    index: 2,
    title: 'Perfect Pair',
    goal: 'Make the two tracks always agree: rain with thunder, the car with the bell.',
    done: 'Both tiles read 50 · 50, and a Play never gives rain with the bell or thunder with the car.',
    story: 'Two separate coin tosses would cross half the time.',
    tracks: [TRACK_A, TRACK_B],
    start: [],
    allowed: ['flip', 'split', 'twist', 'link'],
    target: BELL,
    exposure: 2,
    // the weaker half of the goal: the tracks agree, and each one is a coin toss. Plain fidelity to the Bell odds would
    // call the untouched board "warmer" and the first hinted move, Shuffle A, "far"; this reads far, warmer, there.
    closeness: (p) => { const toss = (q: number) => 1 - Math.abs(2 * marginalOne(p, q) - 1); return Math.min(agreement(p, 0, 1), (toss(0) + toss(1)) / 2); },
    success: (i) => p1(i, 0) > 0.35 && p1(i, 0) < 0.65 && p1(i, 1) > 0.35 && p1(i, 1) < 0.65 && agreement(i.probabilities, 0, 1) > 0.99,
    hints: [
      'Shuffle Track A. Rain is a coin toss now, but Track B still stays on the bell.',
      'With Track A selected, press Sync (it reads “to Track B”). B now follows A.',
      'Shuffling both tracks instead gives two separate coin tosses: they cross half the time.',
    ],
    solution: [H0, SYNC],
    quantum: {
      concept: 'Superposition and entanglement',
      lines: [
        'Shuffle is the Hadamard gate: the qubit is in superposition, 0 and 1 at once, until Play measures it.',
        'Sync is the CNOT gate: it entangles the two qubits, so their readings always agree.',
        'Together they prepare the Bell state (|00⟩ + |11⟩)/√2. Go deeper to test that it is really entangled.',
      ],
    },
    deeper: {
      title: 'Is it really entanglement? Play sideways.',
      intro: 'Play sideways measures every track in the X basis (a Shuffle right before measuring). Ask it of your pair, and of two classical twins: tracks that were both left alone or both swapped by one coin toss.',
      runs: [
        { id: 'pair-x', label: 'Your pair, sideways', basis: 'x', useCircuit: true, explain: 'Still together-or-neither. The Bell pair agrees in the sideways question too.' },
        { id: 'twins-z', label: 'Classical twins', basis: 'z', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'In the usual question the twins agree just like your pair.' },
        { id: 'twins-x', label: 'Classical twins, sideways', basis: 'x', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'Sideways, the twins fall apart: all four combinations. Their agreement lived in one question only.' },
      ],
      outro: 'Agreement in both questions is a standard entanglement witness (it assumes the measurements are what they say they are). It is not a Bell test of nonlocality; that needs more angles.',
    },
    beats: 16,
    moments: 10,
    step: 0.8,
  },
  {
    id: 'footsteps',
    index: 3,
    title: 'Silence the Footsteps',
    goal: 'Make the footsteps vanish: crickets, every Play.',
    done: 'The tile reads always Crickets.',
    story: 'The Path track is shuffled and turned halfway: 50 · 50 footsteps.',
    tracks: [{ name: 'Path', base: 'crickets', hit: 'footsteps' }],
    start: [H0, HALF],
    allowed: ['split', 'twist', 'flip'],
    target: { '0': 1, '1': 0 },
    exposure: 3,
    success: (i) => p1(i) < 0.01,
    hints: [
      'Turn alone changes nothing you hear. The dial is heard when the two paths meet: at the next Shuffle.',
      'Add a Shuffle and Play: footsteps every time. The half turn decided it.',
      'Undo the half turn first: Turn ½ again, then Shuffle.',
    ],
    solution: [H0, HALF, HALF, H0],
    quantum: {
      concept: 'Interference',
      lines: [
        'Turn is a phase gate: it flips the sign of the |1⟩ path and leaves the odds alone.',
        'The second Hadamard makes the two paths meet. With the right phase they cancel on 1 and add on 0: crickets every time.',
        'Cancellation like this is interference. A coin can never do it; a wave can, and a qubit does.',
      ],
    },
    deeper: {
      title: 'What if the paths forgot each other?',
      intro: 'A dephased twin is your mix with a half Turn scrambled in, half the time, right before the paths meet. That is what noise does to coherence.',
      runs: [
        { id: 'coherent', label: 'Your mix', basis: 'z', useCircuit: true, explain: 'Coherent paths: the dial decides where they add and where they cancel.' },
        { id: 'dephased', label: 'Dephased twin', basis: 'z', dephaseLearner: true, explain: 'Footsteps are back, 50 · 50, however you turn. Interference needs the paths to remember each other.' },
      ],
      outro: 'No classical mixture of the two paths can cancel the footsteps. Only a coherent superposition can.',
    },
    beats: 12,
    moments: 8,
    step: 0.8,
  },
  {
    id: 'repair',
    index: 4,
    title: 'Clean the Mix',
    goal: 'Make the same pair with two moves.',
    done: 'Two moves on the path, the tracks still agree, and the measured bars sit close to the predicted ones.',
    story: 'This pair was built with six moves. Each move lets in a little noise, turned up here so you can hear it.',
    tracks: [TRACK_A, TRACK_B],
    start: [
      { op: 'split', q: 0 }, { op: 'split', q: 1 }, { op: 'split', q: 1 },
      { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 },
    ],
    allowed: ['flip', 'split', 'twist', 'link'],
    target: BELL,
    exposure: 4,
    noisy: true,
    intended: [H0, SYNC],
    success: (i, c, fid) => {
      const same = Object.keys(BELL).every((k) => near(i.probabilities[k] ?? 0, BELL[k as keyof typeof BELL], 1e-6));
      return same && c.ops.length <= 2 && (fid === undefined || fid > 0.7);
    },
    hints: [
      'Tap a move on the path to remove it.',
      'Two Shuffles in a row on one track cancel. So do two Syncs in a row.',
      'Keep one Shuffle on Track A and one Sync. Remove everything else.',
    ],
    solution: [H0, SYNC],
    quantum: {
      concept: 'Noise and circuit depth',
      lines: [
        'On a real device every gate adds a little error. The six-move circuit meant the same state (H · H = I, CX · CX = I) but measured further from it.',
        'The noise here is a stochastic Pauli model: a random X, Y or Z with probability 2% after each one-qubit gate, 6% on each qubit after each CNOT, and a 2% readout flip. Real IonQ systems are far quieter.',
        'Shorter circuits survive noise better. On hardware, depth is one of the first things that decides whether a result survives.',
      ],
    },
    beats: 48,
    moments: 16,
    step: 0.6,
  },
];

/** How close a mix is to a puzzle's goal, 0..1: the puzzle's own measure or fidelity to its target odds. The clean-up
 *  puzzle also counts the extra moves. The page shows it as a word: far, warmer, closer, almost, there. */
export function closenessOf(challenge: Challenge, probabilities: Record<string, number>, ops: number): number {
  const base = challenge.closeness ? challenge.closeness(probabilities) : fidelity(probabilities, challenge.target);
  if (!challenge.noisy || !challenge.intended) return base;
  const extra = Math.max(0, ops - challenge.intended.length);
  const room = Math.max(1, challenge.start.length - challenge.intended.length);
  return base * Math.max(0, 1 - extra / room);
}

export const closenessWord = (c: number) => (c >= 0.995 ? 'there' : c >= 0.9 ? 'almost' : c >= 0.7 ? 'closer' : c >= 0.4 ? 'warmer' : 'far');

/** The tutorial: one page per idea, each with a mix the learner can load and Play, or build by hand. */
export interface Lesson {
  id: string;
  title: string;
  text: string;                  // no quantum words; one or two sentences
  show: Array<Op['op']>;         // moves on the board for this page
  ops: Op[];                     // the mix "Try it" loads
  beats: number;
  hear: string;                  // what they just heard, shown when the Play ends
  /** an intro page: these lines instead of a board, and a single "Learn the moves" button */
  intro?: string[];
  /** how many tracks this page uses (1 until Sync) */
  tracks?: 1 | 2;
  /** Turn amounts offered on this page (default half and quarter) */
  turns?: number[];
}
export const LESSON_TRACKS: Track[] = [TRACK_A, TRACK_B];
export const LESSONS: Lesson[] = [
  { id: 'intro', title: 'What’s going on', text: '', show: [], ops: [], beats: 0, hear: '', intro: [
    'Two tracks. Track A plays a car or rain; Track B plays a bell or thunder. Play plays every track once.',
    'A track can stay undecided until you press Play. Two tracks can be tied so they always decide together.',
    'Four moves shape a track: Swap, Shuffle, Turn, Sync. Every mix you build is a real quantum circuit; the Circuit button shows it.',
  ] },
  { id: 'tracks', title: 'A track, and Swap', tracks: 1, text: 'Track A plays a car. Swap switches it to rain.', show: ['flip'], ops: [X0], beats: 6, hear: 'Rain. Swap switched the track, and it stays switched.' },
  { id: 'shuffle', title: 'Shuffle', tracks: 1, text: 'Shuffle makes a coin toss: each Play lands on the car or on rain. Shuffle again and the toss is undone.', show: ['flip', 'split'], ops: [H0], beats: 8, hear: 'One landing. Play again for another. Add a second Shuffle: always the car again.' },
  { id: 'turn', title: 'Turn: the dial', tracks: 1, turns: [0.5, 0.25, 0.125], text: 'Turn sets a hidden dial. Alone it changes nothing; between two Shuffles it sets the odds. ½ is always rain, ¼ a coin toss, ⅛ rain one time in seven.', show: ['split', 'twist'], ops: [H0, HALF, H0], beats: 6, hear: 'Rain, every time. Tap ¼ or ⅛ on the Turn, then Play again.' },
  { id: 'sync', title: 'Sync', tracks: 2, text: 'Track B plays a bell or thunder. Sync makes B follow A: Shuffle A, then Sync, and the two always agree.', show: ['flip', 'split', 'link'], ops: [H0, SYNC], beats: 8, hear: 'One landing. Play more: the car with the bell, or rain with thunder. Never crossed.' },
];

/** The recap page after the last puzzle: the same four moves, in quantum words. */
export const RECAP = {
  title: 'The quantum you used',
  lead: 'Every mix you built was a circuit. Here it is in quantum words.',
  rows: [
    { move: 'Track', gate: 'qubit', meaning: 'Reads 0 or 1 when measured: 0 plays the first sound, 1 the second.' },
    { move: 'Swap', gate: 'X', meaning: 'Flips 0 and 1.' },
    { move: 'Shuffle', gate: 'H', meaning: 'Superposition: 0 and 1 at once, with equal odds. Twice in a row is nothing.' },
    { move: 'Turn', gate: 'P(θ)', meaning: 'Phase: changes the sign between the paths, not the odds. Heard when the paths meet again.' },
    { move: 'Sync', gate: 'CX', meaning: 'Entanglement: the target flips when the control reads 1, so the pair agrees.' },
    { move: 'Play', gate: 'measure', meaning: 'One definite reading per qubit, drawn with the odds the circuit set.' },
  ],
  concepts: [
    { name: 'Superposition', where: 'puzzle 2', what: 'A shuffled track is undecided until Play. Not unknown: undecided.' },
    { name: 'Entanglement', where: 'puzzle 2', what: 'The pair agrees in the usual question and sideways. Classical twins agree in one.' },
    { name: 'Interference', where: 'puzzle 3', what: 'Paths with the right phase cancel. Dice never do that.' },
    { name: 'Measurement', where: 'every Play', what: 'Same mix, same odds, a fresh answer each time.' },
    { name: 'Noise', where: 'puzzle 4', what: 'Every gate costs a little. Shorter circuits survive.' },
  ],
  codeTitle: 'The Perfect Pair, in Qiskit',
  next: 'Make a beat',
};

/** The studio: a beat machine. Every bar is a fresh set of readings of the mix. */
export const STUDIO = {
  story: 'Each pad is one way the two tracks can land: give it a sound. Build a mix, then press Loop: every bar is eight fresh readings of your mix, played as a beat. Change the mix while it runs.',
  loop: 'Loop',
  stop: 'Stop',
  once: 'Play once',
  tempo: 'Tempo',
  bar: (n: number) => `Bar ${n}`,
  measuring: 'Reading the next bar…',
  idle: 'Pick a sound for each pad, build a mix, then press Loop.',
  stopped: 'Stopped. Loop for a new bar, or change the mix first.',
};

export const DEFAULT_STUDIO_ASSIGNMENT: Record<string, string[]> = {
  '00': ['car'], '01': ['rain'], '10': ['bell'], '11': ['thunder'],
};
