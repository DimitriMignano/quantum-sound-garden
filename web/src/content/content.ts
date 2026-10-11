/**
 * Every user-visible word in one place (American English), plus the tutorial and the puzzles. The first-run path
 * (welcome → Learn → puzzles) uses studio words only: tracks, sounds, Play, the four moves. Quantum words live in
 * the "Why?" reveals and the Circuit view. Scientific claims here were checked against the tests in server/tests and
 * web/src/engine/statevector.test.ts.
 */
import type { Circuit, Ideal, Op } from '../engine/types';
import { agreement, fidelity, marginalOne, bitstrings, bitOf } from '../engine/outcomes';

export const APP = {
  title: 'Quantum Beats Studio',
  pitch: 'Make sounds with the rules of quantum physics.',
  lead: 'Learn four moves by ear. Solve four puzzles. Then build your own. Eyes closed works.',
  honesty:
    'You are not hearing a quantum state. The sound is ordinary audio driven by the probabilities and the measured shots of a circuit: a real Qiskit circuit whenever a Qiskit engine is available, and every result names the engine that produced it.',
  startButton: 'Start: learn the moves (3 minutes)',
  startHint: 'Sound starts when you press this. Headphones help.',
  studioTitle: 'Studio',
  studioTagline: 'Two tracks, four pads, your sound.',
};

export interface ActionCopy { verb: string; gate: string; what: string }
export const ACTIONS: Record<Op['op'] | 'bloom', ActionCopy> = {
  flip: { verb: 'Swap', gate: 'X', what: 'Switches the track to its other sound.' },
  split: { verb: 'Shuffle', gate: 'H', what: 'Makes the track a coin toss between its two sounds. Shuffle again and it goes steady again.' },
  twist: { verb: 'Turn', gate: 'P(θ)', what: 'Turns a hidden dial on a shuffled track (on a steady track it does nothing). You hear no change until the next Shuffle.' },
  link: { verb: 'Sync', gate: 'CX', what: 'The other track follows this one: when this one hits, the other hits too.' },
  bloom: { verb: 'Play', gate: 'measure', what: 'Each track lands on one of its two sounds and you hear it, once. Press again: same mix, same odds, a fresh landing.' },
};

export const WHY_BEATS_VARY =
  'Each Play is one measurement: one definite answer, drawn with the odds the mix prepared. Playing the same mix again does not repeat the same answer; it repeats the same odds. The engine actually takes several readings per Play (the Circuit view shows all of them as measured bars next to the predicted ones); you hear the first.';


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
  goal: string;          // the goal, in sound words, one or two short sentences; the biggest text on the page
  done: string;          // how the learner knows it is done, in what they can see and hear
  story: string;         // one or two sentences of scene-setting, before the goal
  shows?: string;        // what this puzzle newly exposes of the circuit (one line, under the goal)
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
  success: (ideal: Ideal, circuit: Circuit, measuredFidelity?: number) => boolean;
  hints: string[];       // progressive; never the full answer in the first
  reveal: { title: string; body: string[] }; // the physics, the gate names (quantum words allowed here)
  deeper?: Deeper;       // the quantum-versus-classical A/B after the reveal
  beats: number;
  moments: number;       // how many readings are played aloud (1: a Play is one sound)
  step: number;          // seconds a played sound lasts
}

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const p1 = (ideal: Ideal, q = 0) => marginalOne(ideal.probabilities, q);
const TRACK_A: Track = { name: 'Track A', base: 'car', hit: 'rain' };
const TRACK_B: Track = { name: 'Track B', base: 'bell', hit: 'thunder' };
const BELL = { '00': 0.5, '01': 0, '10': 0, '11': 0.5 };

export const CHALLENGES: Challenge[] = [
  {
    id: 'rain',
    index: 1,
    title: 'Make It Rain',
    goal: 'Make Track A play rain, every Play.',
    done: 'Track A’s bar reads rain 100%, and every Play is rain.',
    story: 'Track A plays a car right now.',
    shows: 'New on this page: the name of each move’s gate, under the move.',
    tracks: [TRACK_A],
    start: [],
    allowed: ['flip', 'split', 'twist'],
    target: { '0': 0, '1': 1 },
    exposure: 1,
    success: (i) => p1(i) > 0.99,
    hints: [
      'Press Play with no moves first. A car. Which move switches a track to its other sound?',
      'Swap switches the track: the car becomes rain. Swap, then Play.',
      'A second route: Shuffle, Turn halfway, Shuffle. Two Shuffles with a half Turn between them also switch the track. Same rain, different path.',
    ],
    reveal: {
      title: 'What you did: an X gate',
      body: [
        'Swap is the Pauli X gate. It takes the track from |0⟩ to |1⟩, so every measurement reads 1 and every Play is rain.',
        'If you used Shuffle, Turn, Shuffle: H · P(π) · H equals X. The half Turn flipped the sign of the second path, and when the paths recombined they canceled on 0 and added on 1. That is interference, and you will use it on purpose in puzzle 3.',
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
    goal: 'Make the two tracks agree, every Play: rain with thunder, the car with the bell. Each track on its own stays a coin toss.',
    done: 'Play a few times. You never hear thunder with the car or rain with the bell, and each track still reads 50/50.',
    story: 'Track A plays a car or rain. Track B plays a bell or thunder. Two separate coin tosses would give thunder with the car half the time.',
    shows: 'New on this page: what each track read on the last Play, as bits and odds.',
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
      'Shuffle Track A so rain is a coin toss. Play and listen: thunder never comes, because Track B is still on the bell.',
      'Now Sync Track A to Track B. Track B hits thunder only when Track A hits rain.',
      'Try Shuffle on both tracks instead of a Sync and compare: thunder with the car. Two coin tosses are not a pair.',
    ],
    reveal: {
      title: 'What you did: a Bell pair',
      body: [
        'Shuffle (H) put Track A in an equal superposition. Sync (CX) with Track A as control made Track B copy it, path by path. The circuit prepares the Bell state (|00⟩ + |11⟩)/√2.',
        'Each track alone is a fair coin, yet 01 and 10 have zero probability. Honest caveat: in this one basis, two classical coins glued together would sound exactly the same. What makes the pair quantum shows up when you ask a different question. Go deeper below.',
      ],
    },
    deeper: {
      title: 'Is it really entanglement? Play sideways.',
      intro: 'Play sideways measures every track in the X basis (a Shuffle right before measuring). Try the same question on your pair and on two classical twins: tracks that were simply both left alone or both swapped by a coin toss before the Play.',
      runs: [
        { id: 'pair-x', label: 'Your pair, sideways', basis: 'x', useCircuit: true, explain: 'Still only together-or-neither. The Bell pair agrees in the sideways question too.' },
        { id: 'twins-z', label: 'Classical twins', basis: 'z', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'In the usual question the twins agree just like your pair: together or neither.' },
        { id: 'twins-x', label: 'Classical twins, sideways', basis: 'x', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'Sideways, this classical copy falls apart: all four combinations, thunder with the car. Its agreement lived in one question only. The Bell pair agrees in both.' },
      ],
      outro: 'Agreement in both the usual and the sideways question is a standard entanglement witness (it assumes the measurements are what they say they are). It is not a Bell test of nonlocality, which needs more angles; it is the two-question version you can hear.',
    },
    beats: 16,
    moments: 10,
    step: 0.8,
  },
  {
    id: 'footsteps',
    index: 3,
    title: 'Silence the Footsteps',
    goal: 'Make the footsteps vanish: crickets only, every Play.',
    done: 'The Path bar reads crickets 100%, and every Play is crickets.',
    story: 'The Path track was shuffled, then turned halfway. Right now it is 50/50 footsteps, and turning more changes nothing you can hear. Or does it?',
    shows: 'New on this page: the Qiskit code of your mix, once you solve it.',
    tracks: [{ name: 'Path', base: 'crickets', hit: 'footsteps' }],
    start: [{ op: 'split', q: 0 }, { op: 'twist', q: 0, turns: 0.5 }],
    allowed: ['split', 'twist', 'flip'],
    target: { '0': 1, '1': 0 },
    exposure: 3,
    success: (i) => p1(i) < 0.01,
    hints: [
      'Add a Turn and Play. The odds did not move. The dial is silent until the two paths meet again.',
      'Add a Shuffle now and Play. The paths recombined, and the hidden dial decided where they add and where they cancel.',
      'Undo the half turn before the Shuffle: a Turn of half, then Shuffle. The two paths cancel on the footsteps and only crickets remain.',
    ],
    reveal: {
      title: 'What you did: interference',
      body: [
        'After Shuffle and a half Turn the track was (|0⟩ − |1⟩)/√2. Its probabilities were 50/50, and no Turn could change them, because a phase only matters relative to another path.',
        'Shuffle again is where the paths meet. With the minus sign still there, H sends the state to |1⟩: footsteps every time. Turn half first (P(π), which here equals Z) to return to (|0⟩ + |1⟩)/√2, and the second H sends it to |0⟩: crickets only, every time. Destructive interference on 1, constructive on 0.',
      ],
    },
    deeper: {
      title: 'What if the paths forgot each other?',
      intro: 'A dephased twin is the same mix where, half the time, an extra half Turn scrambles the phase between the two paths before they meet. That is what noise on a real device does to coherence.',
      runs: [
        { id: 'coherent', label: 'Your mix', basis: 'z', useCircuit: true, explain: 'Coherent paths: the dial decides where they add and where they cancel.' },
        { id: 'dephased', label: 'Dephased twin', basis: 'z', dephaseLearner: true, explain: 'Your mix, except that half the readings carry a scrambled phase right before the paths meet. The silence is gone: footsteps return, 50/50, however you turn. Interference needs the paths to remember each other.' },
      ],
      outro: 'No classical mixture of the two paths can cancel the footsteps. Only a coherent superposition can, and that is the behavior this whole studio is built on.',
    },
    beats: 12,
    moments: 8,
    step: 0.8,
  },
  {
    id: 'repair',
    index: 4,
    title: 'Clean the Mix',
    goal: 'Make the same pair with two moves instead of six. Take moves off the path until two are left and rain still comes only with thunder.',
    done: 'Two moves on the path, rain still only with thunder, and the measured bars sit close to the predicted ones.',
    story: 'Someone built the Perfect Pair with six moves where two would do. Every move lets a little noise in, and noise is turned up here so your ear can catch it.',
    shows: 'New on this page: the whole circuit view.',
    tracks: [TRACK_A, TRACK_B],
    start: [
      { op: 'split', q: 0 }, { op: 'split', q: 1 }, { op: 'split', q: 1 },
      { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 }, { op: 'link', control: 0, target: 1 },
    ],
    allowed: ['flip', 'split', 'twist', 'link'],
    target: BELL,
    exposure: 4,
    noisy: true,
    intended: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }],
    success: (i, c, fid) => {
      const same = Object.keys(BELL).every((k) => near(i.probabilities[k] ?? 0, BELL[k as keyof typeof BELL], 1e-6));
      return same && c.ops.length <= 2 && (fid === undefined || fid > 0.7);
    },
    hints: [
      'Two Shuffles in a row on the same track cancel out. Two Syncs in a row cancel out too. Tap a move on the path to remove it.',
      'The intended mix is Shuffle Track A, Sync Track A to Track B. Nothing else. Compare the measured bars with the predicted ones before and after.',
      'Fewer moves, fewer chances for noise. On real hardware circuit depth is one of the first things that decides whether a result survives.',
    ],
    reveal: {
      title: 'What you did: circuit optimization',
      body: [
        'H·H = I and CX·CX = I, so the six-move mix meant exactly the same state as the two-move one. The ideal probabilities never changed. The measured ones did, because every gate on a noisy device is a chance for an error.',
        'The noise here is a stochastic Pauli model: after each one-track move a random X, Y or Z with probability 2%, after each Sync 6% on each track, and a 2% readout flip. Those rates are chosen to be audible; real IonQ systems are far quieter. It is simulated in-app unless you picked a noise-model backend. In this model, and often on hardware, a shorter circuit with the same meaning measures closer to its intention. Real devices add their own twists: native gates, idle time, calibration.',
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
const SYNC: Op = { op: 'link', control: 0, target: 1 };
export const LESSONS: Lesson[] = [
  { id: 'intro', title: 'What’s going on', text: 'Twenty seconds of context before the first sound.', show: [], ops: [], beats: 0, hear: '', intro: [
    'A sound studio with two tracks. Each track has two sounds: Track A plays a car driving by, or rain; Track B plays a bell, or thunder. Press Play and every track plays one of its two sounds, once, all at the same time.',
    'The twist: a track does not have to decide which sound until you press Play. It can be truly undecided. And two tracks can be tied together so they always decide the same way.',
    'Four moves shape a track: Swap, Shuffle, Turn, Sync. The tile shows how likely each sound is right now; Play tells you what it landed on. Nothing plays until you press Play.',
    'Four short pages, then four puzzles, then your own studio. Everything you hear comes from a real quantum circuit being measured. You do not need to know what that means yet.',
  ] },
  { id: 'tracks', title: 'A track, and Swap', tracks: 1, text: 'Track A plays a car, or it plays rain. Press Play: a car, and a car again, because nothing has changed the track. Swap switches it to its other sound: press Swap, then Play, and it is rain. Try it does the Swap for you.', show: ['flip'], ops: [{ op: 'flip', q: 0 }], beats: 6, hear: 'Rain. Swap moved Track A to its other sound, and it stays there until you change the mix.' },
  { id: 'shuffle', title: 'Shuffle', tracks: 1, text: 'Shuffle makes the track a coin toss: each Play lands on the car or on rain, and you never know which. Press Play several times. Then Shuffle once more: a shuffled track that is shuffled again goes steady. Two Shuffles cancel. Dice never do that.', show: ['flip', 'split'], ops: [{ op: 'split', q: 0 }], beats: 8, hear: 'One landing of a coin toss. Press Play a few more times: sometimes the car, sometimes rain. Then add a second Shuffle and watch the odds snap back to always the car.' },
  { id: 'turn', title: 'Turn: the dial', tracks: 1, turns: [0.5, 0.25, 0.125], text: 'Turn moves a hidden dial, and the dial only exists on a shuffled track. On its own you hear nothing change; the next Shuffle hears it. Shuffle, Turn, Shuffle is on the board: tap ½, ¼ or ⅛ on the Turn and watch the odds. Half a turn is rain every time, a quarter is a coin toss, an eighth is rain about one time in seven. Turn is the only move that can set the odds anywhere in between.', show: ['split', 'twist'], ops: [{ op: 'split', q: 0 }, { op: 'twist', q: 0, turns: 0.5 }, { op: 'split', q: 0 }], beats: 6, hear: 'Rain, every time, from two Shuffles with a half Turn between them. Tap ¼ or ⅛ on the Turn, then Play again.' },
  { id: 'sync', title: 'Sync', tracks: 2, text: 'A second track: Track B plays a bell, or thunder. Play always plays every track at once, one sound each. Sync makes B follow A. Shuffle A, then Sync A to B, and you get two coin tosses that always agree: rain with thunder, or the car with the bell, never crossed. Press Play several times.', show: ['flip', 'split', 'link'], ops: [{ op: 'split', q: 0 }, SYNC], beats: 8, hear: 'One landing. Press Play more: sometimes the car with the bell, sometimes rain with thunder. Never rain with the bell, never thunder with the car. That pair is the heart of every puzzle.' },
];

export const DEFAULT_STUDIO_ASSIGNMENT: Record<string, string[]> = {
  '00': ['car'], '01': ['rain'], '10': ['bell'], '11': ['thunder'],
};
