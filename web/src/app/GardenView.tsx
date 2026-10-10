import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { GardenRenderer, type GardenState } from '../garden/renderer';
import type { GardenApi } from './useGarden';
import { bitstrings, bitOf } from '../engine/outcomes';
import { captionFor, nameFor, type Assignment } from '../audio/mixer';
import { LEGEND } from '../content/content';

interface Props {
  garden: GardenApi;
  seedNames: string[];
  assignment: Assignment;
  reducedMotion: boolean;
  /** the circuit view: outcome cards with bits and percentages, and the legend */
  details: boolean;
  /** the one line under the garden when nothing is playing (the scene's current instruction or result) */
  caption?: ReactNode;
}

/** The garden canvas (decorative), the one caption line, and in circuit view the accessible outcome list. */
export function GardenView({ garden, seedNames, assignment, reducedMotion, details, caption }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GardenRenderer | null>(null);
  const lastMoment = useRef(-1);
  const labels = useMemo(() => bitstrings(garden.circuit.nQubits), [garden.circuit.nQubits]);
  const outcomeNames = useMemo(() => Object.fromEntries(labels.map((b) => [b, nameFor(assignment, b)])), [labels, assignment]);

  const links = useMemo(() => garden.circuit.ops.flatMap((o) => (o.op === 'link' ? [{ control: o.control, target: o.target }] : [])), [garden.circuit]);
  const state = useMemo<GardenState>(() => ({
    nQubits: garden.circuit.nQubits,
    seedNames,
    probabilities: garden.ideal.probabilities,
    amplitudes: garden.ideal.amplitudes,
    links,
    measured: garden.measured,
    active: garden.playback?.outcome ?? null,
    reducedMotion,
    hideOdds: garden.oddsHidden,
    outcomeNames,
  }), [garden.circuit.nQubits, seedNames, garden.ideal, links, garden.measured, garden.playback?.outcome, reducedMotion, garden.oddsHidden, outcomeNames]);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new GardenRenderer(canvasRef.current, state);
    return () => { rendererRef.current?.dispose(); rendererRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { rendererRef.current?.setState(state); }, [state]);
  useEffect(() => {
    const p = garden.playback;
    if (!p || p.outcome === null || p.index === lastMoment.current) return;
    lastMoment.current = p.index;
    rendererRef.current?.ripple({ outcome: p.outcome });
    for (let q = 0; q < garden.circuit.nQubits; q++) if (p.outcome[p.outcome.length - 1 - q] === '1') rendererRef.current?.ripple({ q });
  }, [garden.playback, garden.circuit.nQubits]);

  const playing = garden.playback && !garden.playback.finished && garden.playback.outcome;
  const live = playing ? `${garden.playback!.index + 1} of ${garden.playback!.total}: ${garden.playback!.caption}` : null;
  const hidden = garden.oddsHidden;
  const fallback = hidden ? 'Press Bloom to find out.' : `Hearing the odds: ${describeOdds(garden.ideal.probabilities, assignment)}`;

  return (
    <div className="garden">
      <div className="garden__stage">
        <canvas ref={canvasRef} className="garden__canvas" aria-hidden="true" />
        <div className="garden__seeds" aria-hidden="true">
          {seedNames.map((n, q) => <span key={q} className="garden__seedname" style={{ left: `${(100 * (q + 1)) / (seedNames.length + 1)}%` }}>{n}{details && <small>qubit {q}</small>}</span>)}
        </div>
      </div>
      <p className={`caption${playing ? ' is-live' : ''}`} role="status" aria-live="polite">{live ?? caption ?? fallback}</p>
      {details && (
        <ul className="outcomes" aria-label="Outcomes">
          {labels.map((b) => {
            const p = garden.ideal.probabilities[b] ?? 0;
            const m = garden.measured?.[b];
            const active = garden.playback?.outcome === b;
            return (
              <li key={b} className={`outcome${active ? ' is-active' : ''}`}>
                <div className="outcome__head">
                  <code className="outcome__bits" title={`measurement result ${b} (qubit 0 is the rightmost bit)`}>{b}</code>
                  <span className="outcome__name">{captionFor(assignment, b)}</span>
                </div>
                {seedNames.length > 1 && <div className="outcome__seeds">{seedNames.map((n, q) => <span key={q}>{n} {bitOf(b, q)}</span>)}</div>}
                <div className="outcome__bars">
                  <div className="bar bar--predicted" title={hidden ? 'predicted: hidden until you guess' : `predicted ${pct(p)}`}><span style={{ width: hidden ? '0%' : `${p * 100}%` }} /></div>
                  {m !== undefined && <div className="bar bar--measured" title={`measured ${pct(m)}`}><span style={{ width: `${m * 100}%` }} /></div>}
                </div>
                <div className="outcome__nums">
                  <span>predicted <b>{hidden ? '?' : pct(p)}</b></span>
                  {m !== undefined && <span>measured <b>{pct(m)}</b></span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {details && (
        <details className="legend">
          <summary>How to read the garden</summary>
          <ul>
            {LEGEND.map((l) => <li key={l.mark}><span className={`legend__mark legend__mark--${l.mark}`} aria-hidden="true" />{l.text}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

export const pct = (p: number) => `${Math.round(p * 100)}%`;

function describeOdds(probs: Record<string, number>, assignment: Assignment): string {
  const parts = Object.entries(probs).filter(([, p]) => p > 0.005).sort((a, b) => b[1] - a[1]).map(([k, p]) => `${nameFor(assignment, k)} ${pct(p)}`);
  return parts.join(' · ');
}

/** What a bloom sounded like, in words: "Rain every time" or "Night hush 56%, Rain 44%". */
export function describeHeard(measured: Record<string, number>, assignment: Assignment): string {
  const entries = Object.entries(measured).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return 'nothing';
  if (entries[0][1] >= 0.97) return `${nameFor(assignment, entries[0][0])} every time`;
  return entries.filter(([, p]) => p >= 0.06).map(([k, p]) => `${nameFor(assignment, k)} ${pct(p)}`).join(', ');
}
