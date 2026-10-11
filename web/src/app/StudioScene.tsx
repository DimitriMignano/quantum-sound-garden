import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuantumEngine, BackendDescriptor } from '../engine/types';
import { bitstrings, bitOf } from '../engine/outcomes';
import { APP, DEFAULT_STUDIO_ASSIGNMENT, STUDIO, WHY_BEATS_VARY } from '../content/content';
import { SOUND_LIBRARY } from '../audio/sounds';
import { useGarden } from './useGarden';
import { marginalOne } from '../engine/outcomes';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';

interface Props { engine: QuantumEngine; backends: BackendDescriptor[]; defaultBackendId: string; details: boolean }

const TRACKS = ['Track A', 'Track B'];
const BAR = 8;    // readings per bar: each one is a beat
const ONCE = 64;  // readings behind Play once (the Circuit view shows all of them; you hear the first)
const TEMPOS = [
  { id: 'slow', label: 'Slow', step: 0.75 },
  { id: 'mid', label: 'Medium', step: 0.5 },
  { id: 'fast', label: 'Fast', step: 0.35 },
];

/** The studio: four pads (one sound per way the two tracks can land), the four moves, and Loop: a beat machine whose
 *  every bar is a fresh set of readings of the mix. Play once is one landing, one sound. */
export function StudioScene({ engine, backends, defaultBackendId, details }: Props) {
  const [assignment, setAssignment] = useState<Record<string, string[]>>(DEFAULT_STUDIO_ASSIGNMENT);
  const [noise, setNoise] = useState(false);
  const [backendId, setBackendId] = useState(defaultBackendId);
  const [why, setWhy] = useState(false);
  const [tempo, setTempo] = useState('mid');
  const [looping, setLooping] = useState(false);
  const [bars, setBars] = useState(0);
  const loopRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const garden = useGarden(engine, 2, assignment, []);
  const code = useCallback(() => garden.code(ONCE), [garden]);
  const labels = useMemo(() => bitstrings(2), []);
  const step = (TEMPOS.find((t) => t.id === tempo) ?? TEMPOS[1]).step;
  // the tiles need two sounds per track: the "both quiet" pad and the pad where only this track is on
  const studioTracks = useMemo(() => [
    { name: TRACKS[0], base: assignment['00'][0], hit: assignment['01'][0] },
    { name: TRACKS[1], base: assignment['00'][0], hit: assignment['10'][0] },
  ], [assignment]);
  const selectable = backends.filter((b) => b.available || b.reason);
  const playing = !!garden.playback && !garden.playback.finished;

  const stop = useCallback(() => {
    loopRef.current = false;
    setLooping(false);
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    garden.stopPlayback();
  }, [garden]);

  // one bar: read the mix BAR times, play the readings as beats, then schedule the next bar. The ref always holds the
  // newest closure, so a mix or tempo changed mid-bar is what the next bar uses.
  const barRef = useRef<() => Promise<void>>(async () => {});
  barRef.current = async () => {
    if (!loopRef.current) return;
    const r = await garden.bloom(BAR, { noise, backendId, moments: BAR, step, label: 'bar' });
    if (!r || !loopRef.current) { stop(); return; }
    setBars((b) => b + 1);
    timerRef.current = window.setTimeout(() => { void barRef.current(); }, BAR * step * 1000 + 350);
  };
  const loop = () => { loopRef.current = true; setLooping(true); setBars(0); void barRef.current(); };
  useEffect(() => () => { loopRef.current = false; if (timerRef.current !== null) clearTimeout(timerRef.current); }, []);

  const once = () => garden.bloom(ONCE, { noise, backendId, moments: 1, step: 4.0, label: 'your sound' });
  const caption = looping ? (garden.busy ? STUDIO.measuring : undefined)
    : garden.playback?.finished ? (bars > 0 ? STUDIO.stopped : 'Play once again for another landing, or change the mix.')
    : garden.circuit.ops.length === 0 ? STUDIO.idle : undefined;

  return (
    <div className="scene scene--studio">
      <header className="puzzle__head">
        <p className="eyebrow">{APP.studioTitle}</p>
        <h2>{APP.studioTagline}</h2>
        <p className="story">{STUDIO.story}</p>
      </header>

      <GardenView garden={garden} tracks={studioTracks} assignment={assignment} details={details} caption={caption} />

      <div className="pads" role="group" aria-label="A sound for each pad">
        {labels.map((b) => (
          <label key={b} className="pad">
            <span className="pad__lamps" aria-hidden="true">
              {TRACKS.map((n, q) => <span key={q} className={`lamp${bitOf(b, q) ? ' is-on' : ''}`}>{n.slice(-1)}</span>)}
            </span>
            <span className="sr-only">{TRACKS.map((n, q) => `${n} ${bitOf(b, q) ? 'on' : 'off'}`).join(', ')}</span>
            {details && <code className="pad__bits" title="qubit 0 is the rightmost bit">{b}</code>}
            <select value={assignment[b][0]} onChange={(e) => setAssignment({ ...assignment, [b]: [e.target.value] })} aria-label={`Sound when ${TRACKS.map((n, q) => `${n} is ${bitOf(b, q) ? 'on' : 'off'}`).join(' and ')}`}>
              {SOUND_LIBRARY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      <Board steady={Array.from({ length: 2 }, (_, q) => { const p = marginalOne(garden.ideal.probabilities, q); return p < 1e-6 || p > 1 - 1e-6; })} seedNames={TRACKS} allowed={['flip', 'split', 'twist', 'link']} turns={[0.5, 0.25, 0.125, -0.25]} ops={garden.circuit.ops} disabled={garden.busy} showGates={details}
        onRetune={(i, t) => garden.setOps(garden.circuit.ops.map((o, k) => (k === i && o.op === 'twist' ? { ...o, turns: t } : o)))} onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset([])}
        bloom={{ label: looping ? 'Looping…' : STUDIO.loop, onClick: loop, disabled: looping || playing }}
        extra={<>
          {looping && <button type="button" className="ghost" onClick={stop}>{STUDIO.stop}</button>}
          {looping && bars > 0 && <span className="pill" aria-live="polite">{STUDIO.bar(bars)}</span>}
          {!looping && <button type="button" className="ghost" onClick={once} disabled={garden.busy || playing}>{STUDIO.once}</button>}
          {!looping && playing && <button type="button" className="ghost" onClick={garden.stopPlayback}>{STUDIO.stop}</button>}
        </>} />

      <div className="row wrap settings">
        <span className="tempo" role="group" aria-label={STUDIO.tempo}>
          <span className="label">{STUDIO.tempo}</span>
          {TEMPOS.map((t) => <button key={t.id} type="button" className={`chip chip--small${tempo === t.id ? ' is-on' : ''}`} aria-pressed={tempo === t.id} onClick={() => setTempo(t.id)}>{t.label}</button>)}
        </span>
        <label className="toggle"><input type="checkbox" checked={noise} onChange={(e) => setNoise(e.target.checked)} /> Add noise</label>
        {details && selectable.length > 1 && (
          <label className="row">
            <span className="label">Backend</span>
            <select value={backendId} onChange={(e) => setBackendId(e.target.value)}>
              {selectable.map((b) => <option key={b.id} value={b.id} disabled={!b.available}>{b.label}{!b.available ? ` (${b.reason})` : ''}</option>)}
            </select>
          </label>
        )}
      </div>
      {garden.error && <p className="error" role="alert">{garden.error}</p>}
      {garden.result && <ResultNote result={garden.result} />}
      <button type="button" className="linklike" aria-expanded={why} onClick={() => setWhy((w) => !w)}>Why does each bar come out different?</button>
      {why && <p className="help">{WHY_BEATS_VARY}</p>}
      {details && <CodePanel load={code} />}
    </div>
  );
}
