import { useEffect, useRef } from 'react';
import type { EngineInfo } from '../engine/types';
import { APP } from '../content/content';

interface Props { info: EngineInfo | null; reducedMotion: boolean; audioOk: boolean | null; onStart(): void }

const GLYPHS = ['♪', '♫', '♩', '♬', '♪', '♫'];

/** The front door: the name, one line, one button, and a beat you can see (rings on a pulse, notes drifting). */
export function Welcome({ info, reducedMotion, audioOk, onStart }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const css = getComputedStyle(canvas.closest('.qsg') ?? document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#ffb040';
    const cool = css.getPropertyValue('--cool').trim() || '#5c6eff';
    const phase = css.getPropertyValue('--phase').trim() || '#ff48c4';
    const vine = css.getPropertyValue('--vine').trim() || '#54eebe';
    const colors = [accent, cool, phase, vine];
    let w = 0, h = 0, raf = 0;
    const notes = Array.from({ length: 18 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 18 + Math.random() * 26, v: 0.02 + Math.random() * 0.03, sway: Math.random() * 6.28, g: GLYPHS[i % GLYPHS.length], c: colors[i % colors.length] }));
    const resize = () => { const r = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
    const t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.5, beat = 1.1;
      // rings on the beat
      for (let k = 0; k < 4; k++) {
        const phaseT = reducedMotion ? 0.35 + k * 0.2 : ((t / beat + k * 0.25) % 1);
        const r = 40 + phaseT * Math.min(w, h) * 0.55;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283);
        ctx.strokeStyle = accent; ctx.globalAlpha = (1 - phaseT) * 0.35; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // notes drifting up
      ctx.globalAlpha = 1;
      for (const n of notes) {
        const y = reducedMotion ? n.y : ((n.y - t * n.v) % 1 + 1) % 1;
        const x = n.x + (reducedMotion ? 0 : Math.sin(t * 0.8 + n.sway) * 0.012);
        ctx.font = `${n.s}px ${css.getPropertyValue('--font-display') || 'serif'}`;
        ctx.fillStyle = n.c; ctx.globalAlpha = 0.18 + 0.5 * (1 - Math.abs(y - 0.5) * 2) * 0.7;
        ctx.fillText(n.g, x * w, y * h);
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [reducedMotion]);

  return (
    <main className="welcome">
      <canvas ref={ref} className="welcome__canvas" aria-hidden="true" />
      <div className="welcome__card">
        <h2 className="welcome__title">{APP.title}</h2>
        <p className="welcome__pitch">{APP.pitch}</p>
        <p className="welcome__lead">{APP.lead}</p>
        <button type="button" className="primary primary--big" onClick={onStart}>{APP.startButton}</button>
        <p className="help">{APP.startHint}</p>
        {audioOk === false && <p className="error" role="alert">Audio could not start in this browser. The studio still works visually.</p>}
        <details className="howto">
          <summary>What you are actually hearing</summary>
          <p className="honesty">{APP.honesty}</p>
          {info && <p className="help">Quantum engine: <b>{info.name}</b>. {info.note}</p>}
          <p className="help">Press Circuit in the top bar at any time to see gate names, bits, percentages and the Qiskit code behind every mix.</p>
        </details>
      </div>
    </main>
  );
}
