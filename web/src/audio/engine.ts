/**
 * Web Audio engine. One AudioContext, created on the first user gesture (autoplay rules), a master gain with a
 * hard ceiling and a limiter so nothing is ever harsh or unexpectedly loud. Everything else plugs into `bus`.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  bus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private _volume = 0.7;
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
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.25;
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.limiter).connect(this.master).connect(this.ctx.destination);
      this.applyMaster(0.01);
    }
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch { /* the gesture may have ended */ }
    }
    this.emit();
    return this.ctx.state === 'running';
  }

  get started(): boolean { return !!this.ctx && this.ctx.state === 'running'; }
  get now(): number { return this.ctx?.currentTime ?? 0; }
  get volume(): number { return this._volume; }
  get muted(): boolean { return this._muted; }

  setVolume(v: number): void { this._volume = Math.max(0, Math.min(1, v)); this.applyMaster(0.05); this.emit(); }
  setMuted(m: boolean): void { this._muted = m; this.applyMaster(0.05); this.emit(); }

  /** Master ceiling 0.8: the loudest the garden can get, before the limiter. */
  private applyMaster(ramp: number): void {
    if (!this.master || !this.ctx) return;
    const target = this._muted ? 0 : 0.8 * this._volume * this._volume; // perceptual curve
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, ramp);
  }

  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(): void { for (const fn of this.listeners) fn(); }
}

export const audio = new AudioEngine();
