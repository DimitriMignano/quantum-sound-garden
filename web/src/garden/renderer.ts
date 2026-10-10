/**
 * The garden on a 2D canvas: twilight sky, mist, luminous seeds whose glow follows the marginal probability of
 * reading 1, a phase ring that rotates with the relative phase, living vines for links, and outcome blooms whose
 * area follows probability. Decorative only (aria-hidden); the DOM beside it carries the same numbers as text.
 * Reduced motion: no drifting, no particles, state changes ease over 200 ms instead of flowing.
 */
import { bitOf, bitstrings, marginalOne } from '../engine/outcomes';

export interface GardenState {
  nQubits: number;
  seedNames: string[];
  probabilities: Record<string, number>;
  amplitudes: Record<string, [number, number]>;
  links: Array<{ control: number; target: number }>;
  /** measured distribution to overlay as solid blooms (predicted drawn as outline) */
  measured?: Record<string, number> | null;
  /** outcome currently sounding during a bloom playback */
  active?: string | null;
  reducedMotion: boolean;
}

interface Ripple { x: number; y: number; t0: number; hue: number }

const COLORS = {
  skyTop: '#05060f',
  skyBottom: '#0d1030',
  mist: 'rgba(96, 86, 220, 0.16)',
  ground: '#07081a',
  seedZero: [92, 110, 255] as const, // cool indigo-blue: the 0 lobe
  seedOne: [255, 176, 64] as const, // warm amber: the 1 lobe
  phase: [255, 72, 196] as const, // magenta: phase ring
  vine: [84, 238, 190] as const, // mint: links
  bloom: [255, 196, 90] as const,
  star: 'rgba(220, 226, 255, 0.9)',
};

const rgba = (c: readonly [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

export class GardenRenderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private state: GardenState;
  private shown: { marg: number[]; probs: Record<string, number>; phase: number[] }; // eased display values
  private ripples: Ripple[] = [];
  private stars: Array<{ x: number; y: number; r: number; tw: number }> = [];
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver;
  private running = false;

  constructor(private canvas: HTMLCanvasElement, initial: GardenState) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;
    this.state = initial;
    this.shown = { marg: this.marginals(initial), probs: { ...initial.probabilities }, phase: this.phases(initial) };
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.55, r: 0.4 + Math.random() * 1.1, tw: Math.random() * 6.28 });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.start();
  }

  setState(next: GardenState): void {
    const changedQubits = next.nQubits !== this.state.nQubits;
    this.state = next;
    if (changedQubits) this.shown = { marg: this.marginals(next), probs: { ...next.probabilities }, phase: this.phases(next) };
    if (!this.running) this.start();
  }

  /** A ripple at a seed (q) or at an outcome bloom (outcome). */
  ripple(where: { q?: number; outcome?: string }): void {
    if (where.q !== undefined) { const p = this.seedPos(where.q); this.ripples.push({ x: p.x, y: p.y + 10, t0: performance.now(), hue: 1 }); }
    if (where.outcome !== undefined) { const p = this.bloomPos(where.outcome); this.ripples.push({ x: p.x, y: p.y, t0: performance.now(), hue: 0 }); }
    if (!this.running) this.start();
  }

  dispose(): void { this.ro.disconnect(); cancelAnimationFrame(this.raf); this.running = false; }

  // ---- geometry -------------------------------------------------------------------------------------------------
  private seedPos(q: number) { const n = this.state.nQubits; return { x: (this.w * (q + 1)) / (n + 1), y: this.h * 0.64 }; }
  private bloomPos(outcome: string) {
    const labels = bitstrings(this.state.nQubits);
    const i = labels.indexOf(outcome);
    const n = labels.length;
    return { x: (this.w * (i + 1)) / (n + 1), y: this.h * 0.2 };
  }
  private marginals(s: GardenState): number[] { return Array.from({ length: s.nQubits }, (_, q) => marginalOne(s.probabilities, q)); }
  /** Relative phase of the branch where only qubit q is 1, against the all-zero branch (0 when undefined). */
  private phases(s: GardenState): number[] {
    const n = s.nQubits;
    const zero = s.amplitudes['0'.repeat(n)] ?? [0, 0];
    return Array.from({ length: n }, (_, q) => {
      const key = bitstrings(n).find((b) => bitOf(b, q) === 1 && b.split('').filter((c) => c === '1').length === 1)!;
      const a = s.amplitudes[key] ?? [0, 0];
      if (Math.hypot(a[0], a[1]) < 1e-6 || Math.hypot(zero[0], zero[1]) < 1e-6) return 0;
      return Math.atan2(a[1], a[0]) - Math.atan2(zero[1], zero[0]);
    });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, rect.width); this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw(performance.now());
  }

  private start(): void { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const settled = this.ease(dt);
    this.draw(now);
    this.ripples = this.ripples.filter((r) => now - r.t0 < 1600);
    // In reduced motion the loop stops once values have settled and no ripples remain; otherwise it flows.
    if (this.state.reducedMotion && settled && this.ripples.length === 0) { this.running = false; return; }
    this.raf = requestAnimationFrame(this.tick);
  };

  private ease(dt: number): boolean {
    const k = this.state.reducedMotion ? 1 - Math.exp(-dt * 14) : 1 - Math.exp(-dt * 6);
    const targetM = this.marginals(this.state), targetP = this.phases(this.state);
    let settled = true;
    for (let q = 0; q < this.state.nQubits; q++) {
      this.shown.marg[q] += (targetM[q] - this.shown.marg[q]) * k;
      let d = targetP[q] - this.shown.phase[q]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.shown.phase[q] += d * k;
      if (Math.abs(targetM[q] - this.shown.marg[q]) > 1e-3 || Math.abs(d) > 1e-3) settled = false;
    }
    for (const b of bitstrings(this.state.nQubits)) {
      const t = this.state.probabilities[b] ?? 0;
      const cur = this.shown.probs[b] ?? 0;
      this.shown.probs[b] = cur + (t - cur) * k;
      if (Math.abs(t - this.shown.probs[b]) > 1e-3) settled = false;
    }
    return settled;
  }

  // ---- drawing --------------------------------------------------------------------------------------------------
  private draw(now: number): void {
    const { ctx, w, h } = this;
    const t = now / 1000;
    const motion = !this.state.reducedMotion;
    ctx.clearRect(0, 0, w, h);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, COLORS.skyTop); sky.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // stars
    for (const s of this.stars) {
      const a = motion ? 0.55 + 0.45 * Math.sin(t * 0.8 + s.tw) : 0.8;
      ctx.fillStyle = `rgba(220, 226, 255, ${0.9 * a})`;
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
    }
    // ground + mist
    const groundY = h * 0.72;
    const ground = ctx.createLinearGradient(0, groundY - 20, 0, h);
    ground.addColorStop(0, 'rgba(7, 8, 26, 0)'); ground.addColorStop(0.25, COLORS.ground); ground.addColorStop(1, '#04050f');
    ctx.fillStyle = ground; ctx.fillRect(0, groundY - 20, w, h - groundY + 20);
    for (let i = 0; i < 4; i++) {
      const mx = w * (0.15 + 0.25 * i) + (motion ? Math.sin(t * 0.11 + i) * 30 : 0);
      const g = ctx.createRadialGradient(mx, groundY, 0, mx, groundY, w * 0.32);
      g.addColorStop(0, COLORS.mist); g.addColorStop(1, 'rgba(96, 86, 220, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, groundY - h * 0.2, w, h * 0.3);
    }
    this.drawLinks(t, motion);
    this.drawSeeds(t, motion);
    this.drawBlooms(t, motion);
    this.drawRipples(now);
  }

  private drawSeeds(t: number, motion: boolean): void {
    const { ctx } = this;
    const groundY = this.h * 0.72;
    for (let q = 0; q < this.state.nQubits; q++) {
      const { x, y } = this.seedPos(q);
      const m = this.shown.marg[q];
      const split = Math.min(m, 1 - m) * 2; // 0 = definite, 1 = perfectly split
      const r = Math.min(44, Math.max(22, this.w / (this.state.nQubits * 7)));
      const bob = motion ? Math.sin(t * 0.9 + q) * 3 : 0;
      // stem
      ctx.strokeStyle = rgba(COLORS.vine, 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, groundY + 6); ctx.quadraticCurveTo(x + 10, (y + groundY) / 2, x, y + r * 0.9 + bob); ctx.stroke();
      // halo
      const halo = ctx.createRadialGradient(x, y + bob, r * 0.4, x, y + bob, r * 2.6);
      const mixc: [number, number, number] = [
        COLORS.seedZero[0] * (1 - m) + COLORS.seedOne[0] * m,
        COLORS.seedZero[1] * (1 - m) + COLORS.seedOne[1] * m,
        COLORS.seedZero[2] * (1 - m) + COLORS.seedOne[2] * m,
      ];
      halo.addColorStop(0, rgba(mixc, 0.45)); halo.addColorStop(1, rgba(mixc, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y + bob, r * 2.6, 0, 6.283); ctx.fill();
      // two lobes: the 0 lobe and the 1 lobe drift apart when split
      const sep = split * r * 0.55;
      const lobe = (cx: number, color: readonly [number, number, number], alpha: number) => {
        const g = ctx.createRadialGradient(cx - r * 0.25, y + bob - r * 0.25, 2, cx, y + bob, r);
        g.addColorStop(0, rgba([255, 255, 255], alpha * 0.9)); g.addColorStop(0.35, rgba(color, alpha)); g.addColorStop(1, rgba(color, alpha * 0.15));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y + bob, r, 0, 6.283); ctx.fill();
      };
      ctx.globalCompositeOperation = 'lighter';
      lobe(x - sep, COLORS.seedZero, 0.35 + 0.65 * (1 - m));
      lobe(x + sep, COLORS.seedOne, 0.15 + 0.85 * m);
      ctx.globalCompositeOperation = 'source-over';
      // phase ring: visible only when split; a marker shows the relative phase angle
      const targetM = marginalOne(this.state.probabilities, q);
      const targetSplit = Math.min(targetM, 1 - targetM) * 2;
      if (split > 0.05 && targetSplit > 0.02) {
        const ph = this.shown.phase[q];
        ctx.strokeStyle = rgba(COLORS.phase, 0.35 + 0.45 * split); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y + bob, r * 1.45, 0, 6.283); ctx.stroke();
        const mx = x + Math.cos(ph - Math.PI / 2) * r * 1.45, my = y + bob + Math.sin(ph - Math.PI / 2) * r * 1.45;
        ctx.fillStyle = rgba(COLORS.phase, 0.95);
        ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, 6.283); ctx.fill();
        if (Math.abs(ph) > 0.05) { // a faint arc from "no phase" to the marker
          ctx.strokeStyle = rgba(COLORS.phase, 0.7); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y + bob, r * 1.45, -Math.PI / 2, ph - Math.PI / 2, ph < 0); ctx.stroke();
        }
      }
    }
  }

  private drawLinks(t: number, motion: boolean): void {
    const { ctx } = this;
    const seen = new Set<string>();
    for (const l of this.state.links) {
      const key = `${l.control}-${l.target}`; if (seen.has(key)) continue; seen.add(key);
      const a = this.seedPos(l.control), b = this.seedPos(l.target);
      const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 70;
      const corr = Math.abs(agreementOf(this.shown.probs, l.control, l.target, this.state.nQubits) - 0.5) * 2;
      ctx.strokeStyle = rgba(COLORS.vine, 0.35 + 0.5 * corr); ctx.lineWidth = 2 + 3 * corr;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke();
      // light beads flowing control -> target
      const beads = motion ? 5 : 3;
      for (let i = 0; i < beads; i++) {
        const u = motion ? ((t * 0.35 + i / beads) % 1) : (i + 0.5) / beads;
        const px = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x;
        const py = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 9);
        g.addColorStop(0, rgba(COLORS.vine, 0.9)); g.addColorStop(1, rgba(COLORS.vine, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.283); ctx.fill();
      }
      // arrow head at target
      ctx.fillStyle = rgba(COLORS.vine, 0.9);
      ctx.beginPath(); ctx.arc(b.x, b.y - 36, 4, 0, 6.283); ctx.fill();
    }
  }

  private drawBlooms(t: number, motion: boolean): void {
    const { ctx } = this;
    const labels = bitstrings(this.state.nQubits);
    const maxR = Math.min(46, this.w / (labels.length * 3.2));
    for (const b of labels) {
      const { x, y } = this.bloomPos(b);
      const p = this.shown.probs[b] ?? 0;
      const measured = this.state.measured ? this.state.measured[b] ?? 0 : null;
      const active = this.state.active === b;
      const pulse = active && motion ? 1 + 0.08 * Math.sin(t * 9) : 1;
      // predicted: petals, area ∝ probability
      const r = Math.max(5, Math.sqrt(p) * maxR) * pulse;
      this.flower(x, y, r, measured === null ? 0.75 : 0.0, measured === null ? 0.9 : 0.55, t, motion, active);
      if (measured !== null) {
        const rm = Math.max(5, Math.sqrt(measured) * maxR) * pulse;
        this.flower(x, y, rm, 0.85, 0, t, motion, active);
      }
      // faint outcome glyph
      ctx.fillStyle = rgba(COLORS.bloom, active ? 0.95 : 0.5);
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textAlign = 'center';
      ctx.fillText(b, x, y + maxR + 18);
    }
  }

  private flower(x: number, y: number, r: number, fill: number, stroke: number, t: number, motion: boolean, active: boolean): void {
    const { ctx } = this;
    const petals = 6;
    const spin = motion ? t * 0.15 : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    if (fill > 0) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
      g.addColorStop(0, rgba([255, 240, 200], fill)); g.addColorStop(0.5, rgba(COLORS.bloom, fill * 0.8)); g.addColorStop(1, rgba(COLORS.bloom, 0));
      ctx.fillStyle = g;
    }
    ctx.strokeStyle = rgba(COLORS.bloom, stroke); ctx.lineWidth = 1.5;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
      if (fill > 0) ctx.fill();
      if (stroke > 0) ctx.stroke();
    }
    if (active) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      g.addColorStop(0, rgba([255, 255, 255], 0.35)); g.addColorStop(1, rgba(COLORS.bloom, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  private drawRipples(now: number): void {
    const { ctx } = this;
    for (const r of this.ripples) {
      const u = (now - r.t0) / 1600;
      const radius = this.state.reducedMotion ? 30 : 12 + u * 110;
      const alpha = (1 - u) * 0.6;
      ctx.strokeStyle = r.hue ? rgba(COLORS.seedOne, alpha) : rgba(COLORS.bloom, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, radius, radius * (r.hue ? 0.35 : 1), 0, 0, 6.283); ctx.stroke();
    }
  }
}

function agreementOf(probs: Record<string, number>, a: number, b: number, n: number): number {
  let p = 0;
  for (const k of bitstrings(n)) if (bitOf(k, a) === bitOf(k, b)) p += probs[k] ?? 0;
  return p;
}
