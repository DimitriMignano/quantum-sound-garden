/**
 * Procedural natural sounds — license-free placeholders behind a replaceable interface (docs/ARCHITECTURE.md, "Sound
 * assets"). Every sound is a SoundAsset whose instance has a level (0..1) that can swell or fade over time; events
 * (thunder, bells, chirps) fire from an internal clock while their level is up, so a layer never sounds like a
 * sample being triggered at random: textures breathe, events are spaced.
 */
export type SoundKind = 'texture' | 'event';

export interface SoundInstance {
  /** Smoothly move the layer's level (0..1) over `ramp` seconds. */
  setLevel(level: number, ramp?: number): void;
  /** Fire one event now (events only; textures ignore). */
  trigger(): void;
  stop(fade?: number): void;
}

export interface SoundAsset {
  id: string;
  name: string;
  kind: SoundKind;
  /** Short caption text used when this layer becomes audible. */
  caption: string;
  /** Mix weight, so a thunder layer at level 1 is not louder than a rain layer at level 1. */
  weight: number;
  create(ctx: AudioContext, out: AudioNode): SoundInstance;
}

// ---- shared helpers -------------------------------------------------------------------------------------------
const noiseCache = new WeakMap<AudioContext, { white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer }>();

function noiseBuffers(ctx: AudioContext) {
  let c = noiseCache.get(ctx);
  if (c) return c;
  const len = ctx.sampleRate * 4;
  const mk = () => ctx.createBuffer(1, len, ctx.sampleRate);
  const white = mk(), pink = mk(), brown = mk();
  const w = white.getChannelData(0), p = pink.getChannelData(0), b = brown.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const x = Math.random() * 2 - 1;
    w[i] = x;
    b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
    b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
    p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
    b6 = x * 0.115926;
    last = (last + 0.02 * x) / 1.02;
    b[i] = last * 3.5;
  }
  c = { white, pink, brown };
  noiseCache.set(ctx, c);
  return c;
}

function loopNoise(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(0, Math.random() * 3);
  return src;
}

function gain(ctx: AudioContext, v = 0): GainNode { const g = ctx.createGain(); g.gain.value = v; return g; }

function ramp(param: AudioParam, ctx: AudioContext, value: number, seconds: number) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + Math.max(0.01, seconds));
}

/** Base class: a level gain, an optional clock for events, and a clean stop. */
abstract class Layer implements SoundInstance {
  protected level: GainNode;
  protected timer: number | null = null;
  protected currentLevel = 0;
  protected stopped = false;
  constructor(protected ctx: AudioContext, out: AudioNode, protected weight: number) {
    this.level = gain(ctx, 0);
    this.level.connect(out);
  }
  setLevel(level: number, r = 0.4): void {
    if (this.stopped) return;
    this.currentLevel = Math.max(0, Math.min(1, level));
    ramp(this.level.gain, this.ctx, this.currentLevel * this.weight, r);
    this.onLevel();
  }
  protected onLevel(): void { /* events start/stop their clock here */ }
  trigger(): void { /* textures ignore */ }
  stop(fade = 0.5): void {
    this.stopped = true;
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    ramp(this.level.gain, this.ctx, 0, fade);
    setTimeout(() => this.teardown(), (fade + 0.1) * 1000);
  }
  protected abstract teardown(): void;
  /** Run `fn` while the level is up, re-scheduling itself with `nextMs()`. */
  protected clock(fn: () => void, nextMs: () => number): void {
    if (this.timer !== null) return;
    const tick = () => {
      if (this.stopped || this.currentLevel <= 0.001) { this.timer = null; return; }
      fn();
      this.timer = window.setTimeout(tick, nextMs());
    };
    this.timer = window.setTimeout(tick, 60);
  }
  protected stopClock(): void { if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; } }
}

// ---- textures ------------------------------------------------------------------------------------------------
class Rain extends Layer {
  private nodes: AudioNode[] = [];
  private src: AudioBufferSourceNode;
  constructor(ctx: AudioContext, out: AudioNode, weight: number) {
    super(ctx, out, weight);
    const { pink } = noiseBuffers(ctx);
    this.src = loopNoise(ctx, pink);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
    const shimmer = ctx.createGain(); shimmer.gain.value = 0.9;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG).connect(shimmer.gain); lfo.start();
    this.src.connect(hp).connect(bp).connect(shimmer).connect(this.level);
    this.nodes = [hp, bp, shimmer, lfo, lfoG];
  }
  protected override onLevel(): void {
    // drips: tiny high clicks, more frequent the heavier the rain
    this.clock(() => this.drip(), () => 120 + Math.random() * 400 * (1.2 - this.currentLevel));
  }
  private drip() {
    const { white } = noiseBuffers(this.ctx);
    const s = this.ctx.createBufferSource(); s.buffer = white;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5000 + Math.random() * 4000; f.Q.value = 8;
    const g = gain(this.ctx, 0);
    s.connect(f).connect(g).connect(this.level);
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    s.start(t, Math.random() * 3, 0.08);
  }
  protected teardown(): void { try { this.src.stop(); } catch { /* already */ } for (const n of this.nodes) n.disconnect(); this.level.disconnect(); }
}

class Wind extends Layer {
  private src: AudioBufferSourceNode; private nodes: AudioNode[];
  constructor(ctx: AudioContext, out: AudioNode, weight: number, private lowpass = 420, private rate = 0.09) {
    super(ctx, out, weight);
    const { brown } = noiseBuffers(ctx);
    this.src = loopNoise(ctx, brown);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.lowpass; lp.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = this.rate;
    const lfoG = ctx.createGain(); lfoG.gain.value = this.lowpass * 0.6;
    lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    const breathe = ctx.createGain(); breathe.gain.value = 0.7;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = this.rate * 1.7;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.25;
    lfo2.connect(lfo2G).connect(breathe.gain); lfo2.start();
    this.src.connect(lp).connect(breathe).connect(this.level);
    this.nodes = [lp, lfo, lfoG, breathe, lfo2, lfo2G];
  }
  protected teardown(): void { try { this.src.stop(); } catch { /* already */ } for (const n of this.nodes) n.disconnect(); this.level.disconnect(); }
}

class Waves extends Layer {
  private src: AudioBufferSourceNode; private nodes: AudioNode[];
  constructor(ctx: AudioContext, out: AudioNode, weight: number) {
    super(ctx, out, weight);
    const { brown, pink } = noiseBuffers(ctx);
    this.src = loopNoise(ctx, brown);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const swell = ctx.createGain(); swell.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.45;
    lfo.connect(lfoG).connect(swell.gain); lfo.start();
    // foam: pink hiss riding the swell
    const foam = loopNoise(ctx, pink);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const foamG = ctx.createGain(); foamG.gain.value = 0.18;
    foam.connect(hp).connect(foamG).connect(swell);
    this.src.connect(lp).connect(swell).connect(this.level);
    this.nodes = [lp, swell, lfo, lfoG, foam, hp, foamG];
  }
  protected teardown(): void { try { this.src.stop(); } catch { /* already */ } for (const n of this.nodes) { if (n instanceof AudioBufferSourceNode) { try { n.stop(); } catch { /* */ } } n.disconnect(); } this.level.disconnect(); }
}

class City extends Layer {
  private src: AudioBufferSourceNode; private nodes: AudioNode[];
  constructor(ctx: AudioContext, out: AudioNode, weight: number) {
    super(ctx, out, weight);
    const { brown } = noiseBuffers(ctx);
    this.src = loopNoise(ctx, brown);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const hum = ctx.createOscillator(); hum.type = 'triangle'; hum.frequency.value = 55;
    const humG = gain(ctx, 0.08);
    hum.connect(humG).connect(this.level); hum.start();
    this.src.connect(lp).connect(this.level);
    this.nodes = [lp, hum, humG];
  }
  protected override onLevel(): void {
    // distant passing cars: slow filtered sweeps
    this.clock(() => this.car(), () => 2500 + Math.random() * 4000);
  }
  private car() {
    const { pink } = noiseBuffers(this.ctx);
    const s = this.ctx.createBufferSource(); s.buffer = pink;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    const g = gain(this.ctx, 0);
    s.connect(f).connect(g).connect(this.level);
    const t = this.ctx.currentTime, d = 2.4 + Math.random() * 1.5;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + d * 0.5); f.frequency.linearRampToValueAtTime(250, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + d * 0.5); g.gain.linearRampToValueAtTime(0, t + d);
    s.start(t, Math.random() * 2, d + 0.1);
  }
  protected teardown(): void { try { this.src.stop(); } catch { /* */ } for (const n of this.nodes) { if (n instanceof OscillatorNode) { try { n.stop(); } catch { /* */ } } n.disconnect(); } this.level.disconnect(); }
}

class Crickets extends Layer {
  private nodes: AudioNode[] = [];
  constructor(ctx: AudioContext, out: AudioNode, weight: number) {
    super(ctx, out, weight);
    for (const [freq, rate] of [[3100, 9], [3500, 7.3]] as const) {
      const osc = ctx.createOscillator(); osc.frequency.value = freq;
      const am = ctx.createGain(); am.gain.value = 0;
      const pulse = ctx.createOscillator(); pulse.type = 'sine'; pulse.frequency.value = rate;
      const pulseG = ctx.createGain(); pulseG.gain.value = 0.5;
      const off = ctx.createConstantSource(); off.offset.value = 0.5;
      pulse.connect(pulseG).connect(am.gain); off.connect(am.gain);
      const chirpWindow = ctx.createGain(); chirpWindow.gain.value = 0.5;
      const slow = ctx.createOscillator(); slow.frequency.value = 0.4 + Math.random() * 0.3;
      const slowG = ctx.createGain(); slowG.gain.value = 0.5;
      slow.connect(slowG).connect(chirpWindow.gain);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3;
      osc.connect(am).connect(chirpWindow).connect(bp).connect(this.level);
      osc.start(); pulse.start(); off.start(); slow.start();
      this.nodes.push(osc, am, pulse, pulseG, off, chirpWindow, slow, slowG, bp);
    }
  }
  protected teardown(): void { for (const n of this.nodes) { if ('stop' in n) { try { (n as OscillatorNode).stop(); } catch { /* */ } } n.disconnect(); } this.level.disconnect(); }
}

class Glitch extends Layer {
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.blip(), () => (Math.random() < 0.3 ? 90 : 180 + Math.random() * 420)); }
  private blip() {
    const osc = this.ctx.createOscillator(); osc.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
    const notes = [220, 277, 330, 415, 494, 660];
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const g = gain(this.ctx, 0);
    osc.connect(f).connect(g).connect(this.level);
    const t = this.ctx.currentTime, d = 0.03 + Math.random() * 0.09;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.004); g.gain.setValueAtTime(0.12, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.01);
    osc.start(t); osc.stop(t + d + 0.05);
  }
  protected teardown(): void { this.level.disconnect(); }
}

// ---- events ---------------------------------------------------------------------------------------------------
class Thunder extends Layer {
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.trigger(), () => 3500 + Math.random() * 5000); }
  override trigger(): void {
    if (this.stopped) return;
    const { brown } = noiseBuffers(this.ctx);
    const t = this.ctx.currentTime, d = 2.6 + Math.random() * 1.4;
    const s = this.ctx.createBufferSource(); s.buffer = brown;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(90, t + d);
    const g = gain(this.ctx, 0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.0, t + 0.12); g.gain.linearRampToValueAtTime(0.55, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f).connect(g).connect(this.level);
    s.start(t, Math.random() * 2, d + 0.1);
    const sub = this.ctx.createOscillator(); sub.frequency.setValueAtTime(48, t); sub.frequency.exponentialRampToValueAtTime(30, t + d);
    const sg = gain(this.ctx, 0);
    sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.35, t + 0.2); sg.gain.exponentialRampToValueAtTime(0.001, t + d * 0.8);
    sub.connect(sg).connect(this.level); sub.start(t); sub.stop(t + d);
  }
  protected teardown(): void { this.level.disconnect(); }
}

class Footsteps extends Layer {
  private left = true;
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.trigger(), () => 520 + Math.random() * 60); }
  override trigger(): void {
    if (this.stopped) return;
    const { white } = noiseBuffers(this.ctx);
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = white;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = this.left ? 620 : 540; f.Q.value = 1.1;
    const g = gain(this.ctx, 0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    s.connect(f).connect(g).connect(this.level); s.start(t, Math.random() * 3, 0.15);
    const thud = this.ctx.createOscillator(); thud.frequency.setValueAtTime(110, t); thud.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    const tg = gain(this.ctx, 0); tg.gain.setValueAtTime(0.5, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    thud.connect(tg).connect(this.level); thud.start(t); thud.stop(t + 0.12);
    this.left = !this.left;
  }
  protected teardown(): void { this.level.disconnect(); }
}

class Birds extends Layer {
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.trigger(), () => 700 + Math.random() * 2200); }
  override trigger(): void {
    if (this.stopped) return;
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 1600;
    for (let i = 0; i < n; i++) {
      const t = this.ctx.currentTime + i * (0.09 + Math.random() * 0.05);
      const osc = this.ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t); osc.frequency.exponentialRampToValueAtTime(base * (1.35 + Math.random() * 0.3), t + 0.05); osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
      const g = gain(this.ctx, 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g).connect(this.level); osc.start(t); osc.stop(t + 0.12);
    }
  }
  protected teardown(): void { this.level.disconnect(); }
}

class Heartbeat extends Layer {
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.trigger(), () => 880); }
  override trigger(): void {
    if (this.stopped) return;
    for (const [dt, amp] of [[0, 1], [0.18, 0.6]] as const) {
      const t = this.ctx.currentTime + dt;
      const osc = this.ctx.createOscillator(); osc.frequency.setValueAtTime(70, t); osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      const g = gain(this.ctx, 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g).connect(this.level); osc.start(t); osc.stop(t + 0.2);
    }
  }
  protected teardown(): void { this.level.disconnect(); }
}

class Bells extends Layer {
  private notes = [392, 440, 523.25, 587.33, 659.25, 783.99];
  constructor(ctx: AudioContext, out: AudioNode, weight: number) { super(ctx, out, weight); }
  protected override onLevel(): void { this.clock(() => this.trigger(), () => 1600 + Math.random() * 2600); }
  override trigger(): void {
    if (this.stopped) return;
    const f0 = this.notes[Math.floor(Math.random() * this.notes.length)];
    const t = this.ctx.currentTime;
    for (const [ratio, amp, decay] of [[1, 0.5, 3.2], [2.76, 0.22, 2.0], [5.4, 0.09, 1.2], [1.005, 0.3, 3.0]] as const) {
      const osc = this.ctx.createOscillator(); osc.frequency.value = f0 * ratio;
      const g = gain(this.ctx, 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      osc.connect(g).connect(this.level); osc.start(t); osc.stop(t + decay + 0.05);
    }
  }
  protected teardown(): void { this.level.disconnect(); }
}

// ---- the library ----------------------------------------------------------------------------------------------
const mk = (id: string, name: string, kind: SoundKind, caption: string, weight: number, create: (ctx: AudioContext, out: AudioNode) => SoundInstance): SoundAsset =>
  ({ id, name, kind, caption, weight, create });

export const SOUND_LIBRARY: SoundAsset[] = [
  mk('hush', 'Night hush', 'texture', 'a soft night hush', 0.35, (c, o) => new Wind(c, o, 0.35, 260, 0.06)),
  mk('rain', 'Rain', 'texture', 'rain falling', 0.55, (c, o) => new Rain(c, o, 0.55)),
  mk('thunder', 'Thunder', 'event', 'thunder rolling', 0.9, (c, o) => new Thunder(c, o, 0.9)),
  mk('wind', 'Wind', 'texture', 'wind moving through', 0.6, (c, o) => new Wind(c, o, 0.6)),
  mk('waves', 'Waves', 'texture', 'waves on a shore', 0.6, (c, o) => new Waves(c, o, 0.6)),
  mk('birds', 'Birds', 'event', 'birds calling', 0.5, (c, o) => new Birds(c, o, 0.5)),
  mk('footsteps', 'Footsteps', 'event', 'footsteps on the path', 0.7, (c, o) => new Footsteps(c, o, 0.7)),
  mk('heartbeat', 'Heartbeat', 'event', 'a heartbeat', 0.8, (c, o) => new Heartbeat(c, o, 0.8)),
  mk('bells', 'Bells', 'event', 'bells ringing', 0.45, (c, o) => new Bells(c, o, 0.45)),
  mk('crickets', 'Crickets', 'texture', 'crickets in the grass', 0.14, (c, o) => new Crickets(c, o, 0.14)),
  mk('city', 'City at night', 'texture', 'a distant city', 0.5, (c, o) => new City(c, o, 0.5)),
  mk('glitch', 'Glitch', 'event', 'a soft electronic glitch', 0.4, (c, o) => new Glitch(c, o, 0.4)),
];

export const soundById = (id: string): SoundAsset => {
  const s = SOUND_LIBRARY.find((x) => x.id === id);
  if (!s) throw new Error(`unknown sound ${id}`);
  return s;
};
