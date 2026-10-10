/**
 * Web Audio engine. One AudioContext, created on the first user gesture (autoplay rules), a master gain with a
 * hard ceiling and a limiter so nothing is ever harsh or unexpectedly loud. Everything else plugs into `bus`.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  bus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private scratch: Float32Array<ArrayBuffer> | null = null;
  private _volume = 0.85;
  private _muted = false;
  private listeners = new Set<() => void>();

  /** Resolve to true when audio is live. Must be called from a user gesture the first time. */
  async start(): Promise<boolean> {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -6;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.25;
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.limiter).connect(this.master).connect(this.ctx.destination);
      // a meter on the master output, so "is anything actually sounding?" is a number, not a guess
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.scratch = new Float32Array(this.analyser.fftSize);
      this.master.connect(this.analyser);
      this.applyMaster(0.01);
    }
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch { /* the gesture may have ended */ }
    }
    this.emit();
    return this.ctx.state === 'running';
  }

  get started(): boolean { return !!this.ctx && this.ctx.state === 'running'; }
  /** RMS level at the master output right now (0 = silence). */
  level(): number {
    if (!this.analyser || !this.scratch) return 0;
    this.analyser.getFloatTimeDomainData(this.scratch);
    let sum = 0;
    for (let i = 0; i < this.scratch.length; i++) sum += this.scratch[i] * this.scratch[i];
    return Math.sqrt(sum / this.scratch.length);
  }
  get now(): number { return this.ctx?.currentTime ?? 0; }
  get volume(): number { return this._volume; }
  get muted(): boolean { return this._muted; }

  setVolume(v: number): void { this._volume = Math.max(0, Math.min(1, v)); this.applyMaster(0.05); this.emit(); }
  setMuted(m: boolean): void { this._muted = m; this.applyMaster(0.05); this.emit(); }

  /** Master ceiling 0.9: the loudest the studio can get, after the limiter. */
  private applyMaster(ramp: number): void {
    if (!this.master || !this.ctx) return;
    const target = this._muted ? 0 : 0.9 * this._volume * this._volume; // perceptual curve
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, ramp);
  }

  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(): void { for (const fn of this.listeners) fn(); }
}

export const audio = new AudioEngine();
