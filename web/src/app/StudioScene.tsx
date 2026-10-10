import { useCallback, useMemo, useState } from 'react';
import type { QuantumEngine, BackendDescriptor } from '../engine/types';
import { bitstrings, bitOf } from '../engine/outcomes';
import { APP, DEFAULT_STUDIO_ASSIGNMENT, WHY_BEATS_VARY } from '../content/content';
import { SOUND_LIBRARY } from '../audio/sounds';
import { useGarden } from './useGarden';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';

interface Props { engine: QuantumEngine; backends: BackendDescriptor[]; defaultBackendId: string; reducedMotion: boolean; details: boolean }

const TRACKS = ['Track A', 'Track B'];
const BEATS = [16, 64, 256];

/** The open studio: four pads (one sound per combination of the two tracks), all four moves, Play for a 20-second beat. */
export function StudioScene({ engine, backends, defaultBackendId, reducedMotion, details }: Props) {
  const [assignment, setAssignment] = useState<Record<string, string[]>>(DEFAULT_STUDIO_ASSIGNMENT);
  const [beats, setBeats] = useState(64);
  const [noise, setNoise] = useState(false);
  const [backendId, setBackendId] = useState(defaultBackendId);
  const [why, setWhy] = useState(false);
  const garden = useGarden(engine, 2, assignment, []);
  const code = useCallback(() => garden.code(beats), [garden, beats]);
  const labels = useMemo(() => bitstrings(2), []);
  const selectable = backends.filter((b) => b.available || b.reason);
  const playing = garden.playback && !garden.playback.finished;

  const play = () => garden.bloom(beats, { noise, backendId, moments: 22, step: 0.9, label: 'your beat' });
  const caption = garden.playback?.finished ? 'Play again for new beats from the same mix, or change the mix.'
    : garden.circuit.ops.length === 0 ? 'Pick a sound for each pad, then build the mix and press Play.' : undefined;

  return (
    <div className="scene scene--studio">
      <header className="puzzle__head">
        <p className="eyebrow">{APP.studioTitle}</p>
        <h2>{APP.studioTagline}</h2>
        <p className="story">Each pad is one way the two tracks can land. Give it a sound. Build the mix with the moves, then Play for a 20-second beat drawn from real measurements.</p>
      </header>

      <GardenView garden={garden} seedNames={TRACKS} assignment={assignment} reducedMotion={reducedMotion} details={details} caption={caption} />

      <div className="pads" role="group" aria-label="A sound for each pad">
        {labels.map((b) => (
          <label key={b} className="pad">
            <span className="pad__lamps" aria-hidden="true">
              {TRACKS.map((n, q) => <span key={q} className={`lamp${bitOf(b, q) ? ' is-on' : ''}`}>{n.slice(-1)}</span>)}
            </span>
            <span className="sr-only">{TRACKS.map((n, q) => `${n} ${bitOf(b, q) ? 'hits' : 'rests'}`).join(', ')}</span>
            {details && <code className="pad__bits" title="qubit 0 is the rightmost bit">{b}</code>}
            <select value={assignment[b][0]} onChange={(e) => setAssignment({ ...assignment, [b]: [e.target.value] })} aria-label={`Sound when ${TRACKS.map((n, q) => `${n} ${bitOf(b, q) ? 'hits' : 'rests'}`).join(' and ')}`}>
              {SOUND_LIBRARY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      <Board seedNames={TRACKS} allowed={['flip', 'split', 'twist', 'link']} turns={[0.5, 0.25, 0.125, -0.25]} ops={garden.circuit.ops} disabled={garden.busy} showGates={details}
        onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset([])}
        bloom={{ label: garden.busy ? 'Playing…' : garden.result ? 'Play again' : 'Play', onClick: play }}
        extra={<>
          {garden.result && !playing && <button type="button" className="ghost" onClick={garden.replay} disabled={garden.busy}>Replay</button>}
          {playing && <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button>}
        </>} />

      <div className="row wrap settings">
        <span className="label">Beats</span>
        {BEATS.map((s) => <button key={s} type="button" className={`chip${beats === s ? ' is-on' : ''}`} aria-pressed={beats === s} onClick={() => setBeats(s)}>{s}</button>)}
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
      <button type="button" className="linklike" aria-expanded={why} onClick={() => setWhy((w) => !w)}>Why does each Play come out different?</button>
      {why && <p className="help">{WHY_BEATS_VARY}</p>}
      {details && <CodePanel load={code} />}
    </div>
  );
}
