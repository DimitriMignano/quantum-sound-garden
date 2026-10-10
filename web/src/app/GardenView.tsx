import { useMemo, type ReactNode } from 'react';
import type { GardenApi } from './useGarden';
import { bitstrings, bitOf, marginalOne } from '../engine/outcomes';
import { captionFor, nameFor, type Assignment } from '../audio/mixer';
import { soundById } from '../audio/sounds';
import type { Track } from '../content/content';

interface Props {
  garden: GardenApi;
  tracks: Track[];
  assignment: Assignment;
  /** the circuit view: outcome cards with bits and percentages */
  details: boolean;
  /** the one line under the tiles when nothing is playing (the scene's current instruction or result) */
  caption?: ReactNode;
}

/** One tile per track: its two sounds, how likely each is right now, and which one just played. */
export function GardenView({ garden, tracks, assignment, details, caption }: Props) {
  const labels = useMemo(() => bitstrings(garden.circuit.nQubits), [garden.circuit.nQubits]);
  const synced = useMemo(() => garden.circuit.ops.filter((o) => o.op === 'link').map((o) => (o.op === 'link' ? o : null)!), [garden.circuit.ops]);
  const playing = garden.playback && !garden.playback.finished && garden.playback.outcome;
  const outcome = garden.playback?.outcome ?? null;
  const lastOutcome = garden.playback?.finished ? garden.result?.memory?.[0] ?? null : null;
  const hidden = garden.oddsHidden;
  const live = playing ? (garden.playback!.total > 1 ? `${garden.playback!.index + 1} of ${garden.playback!.total}: ${garden.playback!.caption}` : cap(garden.playback!.caption)) : null;
  const fallback = hidden ? 'Press Play to find out.' : `Right now: ${describeOdds(garden.ideal.probabilities, assignment)}`;

  return (
    <div className="garden">
      <div className={`tiles tiles--${tracks.length}`}>
        {tracks.map((t, q) => {
          const pHit = marginalOne(garden.ideal.probabilities, q);
          const now = outcome ? bitOf(outcome, q) : lastOutcome ? bitOf(lastOutcome, q) : null;
          const base = soundById(t.base).name, hit = soundById(t.hit).name;
          const state = hidden ? 'hidden' : pHit < 0.01 ? 'base' : pHit > 0.99 ? 'hit' : 'mixed';
          return (
            <div key={q} className={`tile tile--${state}${outcome ? ' is-playing' : ''}`}>
              <div className="tile__head">
                <span className="tile__name">{t.name}</span>
                {details && <small className="tile__qubit">qubit {q}</small>}
              </div>
              <div className="tile__sounds">
                <span className={`tile__sound tile__sound--base${now === 0 ? ' is-on' : ''}`}>{base}</span>
                <span className={`tile__sound tile__sound--hit${now === 1 ? ' is-on' : ''}`}>{hit}</span>
              </div>
              <div className="tile__bar" role="img" aria-label={hidden ? `${t.name}: odds hidden` : `${t.name}: ${hit} ${pct(pHit)}, ${base} ${pct(1 - pHit)}`}>
                <span className="tile__fill" style={{ width: hidden ? '0%' : `${pHit * 100}%` }} />
                {!hidden && <span className="tile__pct">{state === 'base' ? `always ${base}` : state === 'hit' ? `always ${hit}` : `${pct(1 - pHit)} · ${pct(pHit)}`}</span>}
                {hidden && <span className="tile__pct">?</span>}
              </div>
            </div>
          );
        })}
      </div>
      {synced.length > 0 && (
        <p className="synced">{synced.map((l, i) => <span key={i} className="synced__chip">Sync: {tracks[l.control]?.name} → {tracks[l.target]?.name}</span>)}</p>
      )}
      <p className={`caption${playing ? ' is-live' : ''}`} role="status" aria-live="polite">{live ?? caption ?? fallback}</p>
      {details && (
        <ul className="outcomes" aria-label="Readings">
          {labels.map((b) => {
            const p = garden.ideal.probabilities[b] ?? 0;
            const m = garden.measured?.[b];
            const active = outcome === b;
            return (
              <li key={b} className={`outcome${active ? ' is-active' : ''}`}>
                <div className="outcome__head">
                  <code className="outcome__bits" title={`measurement result ${b} (qubit 0 is the rightmost bit)`}>{b}</code>
                  <span className="outcome__name">{captionFor(assignment, b)}</span>
                </div>
                {tracks.length > 1 && <div className="outcome__seeds">{tracks.map((t, q) => <span key={q}>{t.name} {bitOf(b, q)}</span>)}</div>}
                <div className="outcome__bars">
                  <div className="bar bar--predicted" title={hidden ? 'predicted: hidden' : `predicted ${pct(p)}`}><span style={{ width: hidden ? '0%' : `${p * 100}%` }} /></div>
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
    </div>
  );
}

export const pct = (p: number) => `${Math.round(p * 100)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function describeOdds(probs: Record<string, number>, assignment: Assignment): string {
  const parts = Object.entries(probs).filter(([, p]) => p > 0.005).sort((a, b) => b[1] - a[1]).map(([k, p]) => `${nameFor(assignment, k)} ${pct(p)}`);
  return parts.join(' · ');
}

/** What a Play sounded like, in words: the one reading that played, or a summary when several did. */
export function describeHeard(measured: Record<string, number>, assignment: Assignment, played?: string | null): string {
  if (played) return nameFor(assignment, played);
  const entries = Object.entries(measured).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return 'nothing';
  if (entries[0][1] >= 0.97) return `${nameFor(assignment, entries[0][0])} every time`;
  return entries.filter(([, p]) => p >= 0.06).map(([k, p]) => `${nameFor(assignment, k)} ${pct(p)}`).join(', ');
}
