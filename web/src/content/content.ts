/**
 * Every user-visible word in one place (American English), plus the tutorial and the puzzles. The first-run path
 * (welcome → Learn → puzzles) uses studio words only: tracks, sounds, beats, the four moves. Quantum words live in
 * the "Why?" reveals and the Circuit view. Scientific claims here were checked against the tests in server/tests and
 * web/src/engine/statevector.test.ts.
 */
import type { Circuit, Ideal, Op } from '../engine/types';
import { agreement, marginalOne, bitstrings, bitOf } from '../engine/outcomes';

export const APP = {
  title: 'Quantum Beats Studio',
  pitch: 'Make beats with the rules of quantum physics.',
  lead: 'Learn four moves by ear. Solve four puzzles. Then build your own beat. Eyes closed works.',
  honesty:
    'You are not hearing a quantum state. The sound is ordinary audio driven by the probabilities and the measured shots of a circuit: a real Qiskit circuit whenever a Qiskit engine is available, and every result names the engine that produced it.',
  startButton: 'Start',
  startHint: 'Sound starts when you press this. Headphones help.',
  studioTitle: 'Studio',
  studioTagline: 'Two tracks, four pads, your beat.',
};

export interface ActionCopy { verb: string; gate: string; what: string }
export const ACTIONS: Record<Op['op'] | 'bloom', ActionCopy> = {
  flip: { verb: 'Swap', gate: 'X', what: 'Switches the track to its other sound.' },
  split: { verb: 'Shuffle', gate: 'H', what: 'Makes every beat a coin toss between the track’s two sounds. Shuffle again and the track goes steady again.' },
  twist: { verb: 'Turn', gate: 'P(θ)', what: 'Turns a hidden dial on a shuffled track. You hear no change until the next Shuffle.' },
  link: { verb: 'Sync', gate: 'CX', what: 'The other track follows this one: when this one hits, the other hits too.' },
  bloom: { verb: 'Play', gate: 'measure', what: 'Plays the beat: on each beat every track lands on one of its two sounds. Same mix, same odds, new beats.' },
};

export const WHY_BEATS_VARY =
  'Each beat is one measurement: one definite answer, drawn with the odds the mix prepared. Playing the same mix again does not repeat the same beats; it repeats the same odds. More beats bring the measured bars closer to the predicted ones, but any single Play is its own roll. The order you hear is the real measurement order when the engine reports it (the local Qiskit simulator does); otherwise it is a shuffle of the totals, because most backends return totals, not order.';

export const LEGEND = [
  { mark: 'glow', text: 'Track glow: blue is the first sound, amber is the hit; both lobes apart means a shuffled track, the brighter lobe the likelier one.' },
  { mark: 'ring', text: 'Magenta ring: the hidden dial (phase) of a shuffled track. Hidden while a track is synced, because then its phase is shared.' },
  { mark: 'vine', text: 'Mint line: a Sync between tracks; brighter the more their beats agree.' },
  { mark: 'bloom', text: 'Pads above: the outline is the predicted chance of each combination, solid is what the beats measured.' },
];

export const BACKEND_NOTES = {
  browser: 'Browser math, not Qiskit. Start the local Qiskit server or open this on Qollab for real backends.',
  fallback: (from: string, reason: string) => `Requested ${from}, but it could not run (${reason}). This result came from the local Qiskit simulator instead.`,
  probabilities: 'This backend returned exact probabilities (no shot noise); they were scaled to the beat count.',
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
  /** buttons: a Play with options; `twins` are op lists sharing the beats (a classical mixture);
   *  `dephaseLearner` builds the twin from the learner's own mix: a half-turn Turn is inserted before its last
   *  Shuffle half of the time (a random I/Z before recombination = complete dephasing). */
  runs: Array<{ id: string; label: string; basis?: 'z' | 'x'; twins?: Op[][]; useCircuit?: boolean; dephaseLearner?: boolean; explain: string }>;
  outro: string;
}

export interface Challenge {
  id: string;
  index: number;
  title: string;
  goal: string;          // the goal, in sound words, one sentence
  story: string;         // one or two sentences of scene-setting
  tracks: Track[];
  start: Op[];
  allowed: Array<Op['op']>;
  /** the ideal distribution of a solved mix; the closeness hum compares the current odds to it */
  target: Record<string, number>;
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
  moments: number;       // how many beats are played aloud
  step: number;          // seconds per beat
}

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const p1 = (ideal: Ideal, q = 0) => marginalOne(ideal.probabilities, q);
const TRACK_A: Track = { name: 'Track A', base: 'traffic', hit: 'rain' };
const TRACK_B: Track = { name: 'Track B', base: 'crowd', hit: 'thunder' };
const BELL = { '00': 0.5, '01': 0, '10': 0, '11': 0.5 };

export const CHALLENGES: Challenge[] = [
  {
    id: 'rain',
    index: 1,
    title: 'Make It Rain',
    goal: 'Make Track A play rain on every beat.',
    story: 'Track A is playing traffic. Make it rain, every beat, no misses. This puzzle also shows the name of each move’s gate.',
    tracks: [TRACK_A],
    start: [],
    allowed: ['flip', 'split', 'twist'],
    target: { '0': 0, '1': 1 },
    exposure: 1,
    success: (i) => p1(i) > 0.99,
    hints: [
      'Press Play with no moves first. Traffic on every beat. Which move switches a track to its other sound?',
      'Swap switches the track: traffic becomes rain. Swap, then Play.',
      'A second route: Shuffle, Turn halfway, Shuffle. Two Shuffles with a half Turn between them also switch the track. Same rain, different path.',
    ],
    reveal: {
      title: 'What you did: an X gate',
      body: [
        'Swap is the Pauli X gate. It takes the track from |0⟩ to |1⟩, so every measurement reads 1 and every beat is rain.',
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
    goal: 'Rain always with thunder, traffic always with the crowd, while each track on its own stays a coin toss.',
    story: 'Track A plays traffic or rain. Track B plays a crowd or thunder. Two separate coin tosses would give thunder over traffic half the time. Make them agree. This puzzle also shows what each track read, as bits and odds.',
    tracks: [TRACK_A, TRACK_B],
    start: [],
    allowed: ['flip', 'split', 'twist', 'link'],
    target: BELL,
    exposure: 2,
    success: (i) => p1(i, 0) > 0.35 && p1(i, 0) < 0.65 && p1(i, 1) > 0.35 && p1(i, 1) < 0.65 && agreement(i.probabilities, 0, 1) > 0.99,
    hints: [
      'Shuffle Track A so rain is a coin toss. Play and listen: thunder never comes, because Track B is still on the crowd.',
      'Now Sync Track A to Track B. Track B hits thunder only when Track A hits rain.',
      'Try Shuffle on both tracks instead of a Sync and compare: thunder over traffic. Two coin tosses are not a pair.',
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
        { id: 'twins-x', label: 'Classical twins, sideways', basis: 'x', twins: [[], [{ op: 'flip', q: 0 }, { op: 'flip', q: 1 }]], explain: 'Sideways, this classical copy falls apart: all four combinations, thunder over traffic. Its agreement lived in one question only. The Bell pair agrees in both.' },
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
    goal: 'Make the footsteps vanish, using only Turn and Shuffle.',
    story: 'The Path track was shuffled, then turned halfway. Right now it is 50/50 footsteps. Turning more changes nothing you can hear. Or does it? This puzzle also shows the Qiskit code once you solve it.',
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
        'Shuffle again is where the paths meet. With the minus sign still there, H sends the state to |1⟩: footsteps every beat. Turn half first (P(π), which here equals Z) to return to (|0⟩ + |1⟩)/√2, and the second H sends it to |0⟩: crickets only, every beat. Destructive interference on 1, constructive on 0.',
      ],
    },
    deeper: {
      title: 'What if the paths forgot each other?',
      intro: 'A dephased twin is the same mix where, half the time, an extra half Turn scrambles the phase between the two paths before they meet. That is what noise on a real device does to coherence.',
      runs: [
        { id: 'coherent', label: 'Your mix', basis: 'z', useCircuit: true, explain: 'Coherent paths: the dial decides where they add and where they cancel.' },
        { id: 'dephased', label: 'Dephased twin', basis: 'z', dephaseLearner: true, explain: 'Your mix, except that half the beats carry a scrambled phase right before the paths meet. The silence is gone: footsteps return, 50/50, however you turn. Interference needs the paths to remember each other.' },
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
    goal: 'This pair came back noisy: thunder over traffic. Keep what it means, drop the extra moves, and hear it clean up.',
    story: 'Someone built the Perfect Pair with six moves where two would do. Every move lets a little noise in. Noise is turned up here so your ear can catch it. This puzzle shows the whole circuit view.',
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
}
export const LESSON_TRACKS: Track[] = [TRACK_A, TRACK_B];
const SYNC: Op = { op: 'link', control: 0, target: 1 };
export const LESSONS: Lesson[] = [
  { id: 'intro', title: 'What’s going on', text: 'Thirty seconds of context before the first sound.', show: [], ops: [], beats: 0, hear: '', intro: [
    'This is a beat studio. It has tracks. On every beat, each track plays one of its two sounds. Track A plays traffic or rain. Track B plays a crowd or thunder.',
    'The twist: a track does not have to decide which sound until the beat is played. It can be truly undecided. And two tracks can be tied together so they decide the same way, every time.',
    'You get four moves to shape a track: Swap, Shuffle, Turn, Sync. Then Play rolls the beats and you hear what the tracks decided. Each beat thumps low for the first sound and snaps bright for the hit, so you can follow it with your eyes closed.',
    'First, learn the moves by ear, one page each. Then solve four puzzles: after each move, a short chord tells you how close you are. Then build your own beat.',
    'Everything you hear comes from a real quantum circuit being measured. That is the whole trick, and you do not need to know what that means yet.',
  ] },
  { id: 'tracks', title: 'Tracks', text: 'A track plays one of two sounds on every beat. Track A plays traffic with a low thump, or it hits with rain and a bright snap. Press Try it to hear six beats.', show: [], ops: [], beats: 6, hear: 'Six low thumps with traffic. Nothing was changed, so Track A stayed on its first sound every beat.' },
  { id: 'swap', title: 'Swap', text: 'Swap switches a track to its other sound.', show: ['flip'], ops: [{ op: 'flip', q: 0 }], beats: 6, hear: 'Six bright snaps with rain. Swap moved Track A to its other sound.' },
  { id: 'shuffle', title: 'Shuffle', text: 'Shuffle makes every beat a coin toss: traffic or rain, and you never know which is next.', show: ['flip', 'split'], ops: [{ op: 'split', q: 0 }], beats: 8, hear: 'Traffic and rain in no pattern, about half and half.' },
  { id: 'shuffle2', title: 'Shuffle, again', text: 'Shuffle a shuffled track and it goes steady again. Two Shuffles cancel. Dice never do that.', show: ['flip', 'split'], ops: [{ op: 'split', q: 0 }, { op: 'split', q: 0 }], beats: 6, hear: 'Traffic on every beat. The two Shuffles undid each other.' },
  { id: 'turn', title: 'Turn', text: 'Turn moves a hidden dial on a shuffled track. On its own you hear no change at all.', show: ['split', 'twist'], ops: [{ op: 'split', q: 0 }, { op: 'twist', q: 0, turns: 0.5 }], beats: 8, hear: 'Still a coin toss. The dial moved, and a dial makes no sound.' },
  { id: 'turn2', title: 'Turn, then Shuffle', text: 'The next Shuffle hears the dial. Turn halfway, then Shuffle: every beat is rain.', show: ['split', 'twist'], ops: [{ op: 'split', q: 0 }, { op: 'twist', q: 0, turns: 0.5 }, { op: 'split', q: 0 }], beats: 6, hear: 'Rain on every beat. Without the Turn, two Shuffles would have given traffic on every beat.' },
  { id: 'sync', title: 'Sync', text: 'Sync makes Track B follow Track A: when A hits rain, B hits thunder.', show: ['flip', 'link'], ops: [{ op: 'flip', q: 0 }, SYNC], beats: 6, hear: 'Rain with thunder on every beat.' },
  { id: 'sync2', title: 'Sync a shuffled track', text: 'Shuffle Track A, then Sync it to Track B: two coin tosses that always agree. Rain with thunder, or traffic with the crowd.', show: ['flip', 'split', 'link'], ops: [{ op: 'split', q: 0 }, SYNC], beats: 8, hear: 'Sometimes traffic with the crowd, sometimes rain with thunder. Never rain with the crowd, never thunder over traffic.' },
  { id: 'hum', title: 'The cue', text: 'The studio stays silent until you press Play. Each move gives you one second of the odds: the likelier a sound, the louder it is in that second. In a puzzle a short chord follows it: rough when far from the goal, smooth when you are there. Eyes closed works.', show: ['flip', 'split', 'twist', 'link'], ops: [{ op: 'split', q: 0 }, SYNC], beats: 8, hear: 'That was the pair again, new beats. Make a move and listen for the one-second cue. Then try a puzzle.' },
];

export const DEFAULT_STUDIO_ASSIGNMENT: Record<string, string[]> = {
  '00': ['traffic'], '01': ['rain'], '10': ['crowd'], '11': ['thunder'],
};
