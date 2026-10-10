/**
 * The garden mixer: turns an outcome -> sounds assignment plus probabilities or a shot sequence into cohesive audio.
 *  - blend(): "hear the odds" — each sound's level is the probability mass of the outcomes that include it.
 *  - playSequence(): a Bloom — one moment per shot, the outcome's sounds swell and its events fire, the rest sink
 *    to a bed. Restrained layering, fades and spacing; nothing is triggered at random.
 */
import { audio } from './engine';
import { soundById, type SoundInstance } from './sounds';

export type Assignment = Record<string, string[]>; // outcome bitstring -> sound ids

export interface PlaybackHandle {
  stop(): void;
  done: Promise<void>;
}

export interface SequenceOptions {
  /** seconds per moment */
  step?: number;
  /** level (0..1) the non-active layers sink to, scaled by their probability mass */
  bed?: number;
  onMoment?: (index: number, outcome: string, caption: string) => void;
  onEnd?: () => void;
}

export function captionFor(assignment: Assignment, outcome: string): string {
  const ids = assignment[outcome] ?? [];
  if (ids.length === 0) return 'silence';
  const parts = ids.map((id) => soundById(id).caption);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/** Short display name of an outcome's sounds ("Rain + Thunder"), for the garden buds and the creator pads. */
export function nameFor(assignment: Assignment, outcome: string): string {
  const ids = assignment[outcome] ?? [];
  if (ids.length === 0) return 'silence';
  return ids.map((id) => soundById(id).name).join(' + ');
}

/** Probability mass per sound id, across outcomes. */
export function soundMass(assignment: Assignment, probabilities: Record<string, number>): Record<string, number> {
  const mass: Record<string, number> = {};
  for (const [outcome, ids] of Object.entries(assignment)) {
    const p = probabilities[outcome] ?? 0;
    for (const id of ids) mass[id] = Math.min(1, (mass[id] ?? 0) + p);
  }
  return mass;
}

export class GardenMixer {
  private layers = new Map<string, SoundInstance>();
  private current: PlaybackHandle | null = null;
  private blendScale = 0.55; // "hearing the odds" sits under a full bloom

  private ensure(id: string): SoundInstance | null {
    if (!audio.ctx || !audio.bus) return null;
    let inst = this.layers.get(id);
    if (!inst) {
      inst = soundById(id).create(audio.ctx, audio.bus);
      this.layers.set(id, inst);
    }
    return inst;
  }

  /** Hear the odds. Sounds not in the assignment fade out. */
  blend(assignment: Assignment, probabilities: Record<string, number>, ramp = 0.8): void {
    this.stopSequence();
    const mass = soundMass(assignment, probabilities);
    const wanted = new Set(Object.keys(mass));
    for (const [id, inst] of this.layers) if (!wanted.has(id)) inst.setLevel(0, ramp);
    for (const [id, m] of Object.entries(mass)) this.ensure(id)?.setLevel(m * this.blendScale, ramp);
  }

  /** Everything fades out. */
  silence(ramp = 0.8): void {
    this.stopSequence();
    for (const inst of this.layers.values()) inst.setLevel(0, ramp);
  }

  stopSequence(): void {
    if (this.current) { this.current.stop(); this.current = null; }
  }

  /** Play a measured sequence of outcomes as moments. Returns a handle; resolves when finished or stopped. */
  playSequence(assignment: Assignment, sequence: string[], probabilities: Record<string, number>, opts: SequenceOptions = {}): PlaybackHandle {
    this.stopSequence();
    const step = opts.step ?? 0.9;
    const bed = opts.bed ?? 0.12;
    const mass = soundMass(assignment, probabilities);
    const timers: number[] = [];
    let stopped = false;
    let resolveDone: () => void = () => {};
    const done = new Promise<void>((r) => { resolveDone = r; });

    const allIds = new Set<string>();
    for (const ids of Object.values(assignment)) for (const id of ids) allIds.add(id);
    for (const id of allIds) this.ensure(id);

    const moment = (i: number) => {
      if (stopped) return;
      const outcome = sequence[i];
      const active = new Set(assignment[outcome] ?? []);
      for (const id of allIds) {
        const inst = this.layers.get(id);
        if (!inst) continue;
        if (active.has(id)) {
          inst.setLevel(1, 0.25);
          if (soundById(id).kind === 'event') inst.trigger();
        } else {
          inst.setLevel(bed * (mass[id] ?? 0), 0.5);
        }
      }
      opts.onMoment?.(i, outcome, captionFor(assignment, outcome));
    };

    sequence.forEach((_, i) => timers.push(window.setTimeout(() => moment(i), i * step * 1000)));
    timers.push(window.setTimeout(() => {
      if (stopped) return;
      for (const id of allIds) this.layers.get(id)?.setLevel(0, 1.2);
      stopped = true;
      opts.onEnd?.();
      resolveDone();
    }, sequence.length * step * 1000 + 400));

    const handle: PlaybackHandle = {
      stop: () => {
        if (stopped) return;
        stopped = true;
        for (const t of timers) clearTimeout(t);
        for (const id of allIds) this.layers.get(id)?.setLevel(0, 0.6);
        opts.onEnd?.();
        resolveDone();
      },
      done,
    };
    this.current = handle;
    return handle;
  }

  /** Pick at most `max` moments from a long shot sequence, evenly, keeping order. */
  static thin(sequence: string[], max: number): string[] {
    if (sequence.length <= max) return sequence;
    const out: string[] = [];
    for (let i = 0; i < max; i++) out.push(sequence[Math.floor((i * sequence.length) / max)]);
    return out;
  }

  dispose(): void {
    this.stopSequence();
    for (const inst of this.layers.values()) inst.stop(0.3);
    this.layers.clear();
  }
}

export const mixer = new GardenMixer();
