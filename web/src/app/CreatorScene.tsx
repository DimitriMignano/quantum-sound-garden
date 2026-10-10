import { useCallback, useMemo, useState } from 'react';
import type { QuantumEngine, BackendDescriptor } from '../engine/types';
import { bitstrings, bitOf } from '../engine/outcomes';
import { APP, DEFAULT_CREATOR_ASSIGNMENT, WHY_SHOTS_VARY } from '../content/content';
import { SOUND_LIBRARY } from '../audio/sounds';
import { useGarden } from './useGarden';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';

interface Props { engine: QuantumEngine; backends: BackendDescriptor[]; defaultBackendId: string; reducedMotion: boolean; details: boolean }

const SEEDS = ['Seed A', 'Seed B'];
const SHOTS = [16, 64, 256];

/** The open garden: four pads (one sound per outcome), all four moves, Bloom for a soundscape. Every garden is a circuit. */
export function CreatorScene({ engine, backends, defaultBackendId, reducedMotion, details }: Props) {
  const [assignment, setAssignment] = useState<Record<string, string[]>>(DEFAULT_CREATOR_ASSIGNMENT);
  const [shots, setShots] = useState(64);
  const [noise, setNoise] = useState(false);
  const [backendId, setBackendId] = useState(defaultBackendId);
  const [why, setWhy] = useState(false);
  const garden = useGarden(engine, 2, assignment, []);
  const code = useCallback(() => garden.code(shots), [garden, shots]);
  const labels = useMemo(() => bitstrings(2), []);
  const selectable = backends.filter((b) => b.available || b.reason);
  const playing = garden.playback && !garden.playback.finished;

  const bloom = () => garden.bloom(shots, { noise, backendId, moments: 22, step: 0.9, label: 'your soundscape' });
  const caption = garden.playback?.finished ? 'Bloom again for a new reading of the same garden, or change the garden.'
    : garden.circuit.ops.length === 0 ? 'Pick a sound for each pad, then grow the garden and press Bloom.' : undefined;

  return (
    <div className="scene scene--creator">
      <header className="puzzle__head">
        <p className="eyebrow">{APP.creatorTitle}</p>
        <h2>{APP.creatorTagline}</h2>
        <p className="story">Each pad is one way the two seeds can read. Give it a sound. Then grow the garden and Bloom for a 20-second soundscape drawn from real readings.</p>
      </header>

      <GardenView garden={garden} seedNames={SEEDS} assignment={assignment} reducedMotion={reducedMotion} details={details} caption={caption} />

      <div className="pads" role="group" aria-label="A sound for each outcome">
        {labels.map((b) => (
          <label key={b} className="pad">
            <span className="pad__lamps" aria-hidden="true">
              {SEEDS.map((n, q) => <span key={q} className={`lamp${bitOf(b, q) ? ' is-on' : ''}`}>{n.slice(-1)}</span>)}
            </span>
            <span className="sr-only">{SEEDS.map((n, q) => `${n} reads ${bitOf(b, q)}`).join(', ')}</span>
            {details && <code className="pad__bits" title="qubit 0 is the rightmost bit">{b}</code>}
            <select value={assignment[b][0]} onChange={(e) => setAssignment({ ...assignment, [b]: [e.target.value] })} aria-label={`Sound when ${SEEDS.map((n, q) => `${n} is ${bitOf(b, q)}`).join(' and ')}`}>
              {SOUND_LIBRARY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      <Board seedNames={SEEDS} allowed={['flip', 'split', 'twist', 'link']} turns={[0.5, 0.25, 0.125, -0.25]} ops={garden.circuit.ops} disabled={garden.busy} showGates={details}
        onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset([])}
        bloom={{ label: garden.busy ? 'Blooming…' : garden.result ? 'Bloom again' : 'Bloom', onClick: bloom }}
        extra={<>
          {garden.result && !playing && <button type="button" className="ghost" onClick={garden.replay} disabled={garden.busy}>Replay</button>}
          {playing && <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button>}
        </>} />

      <div className="row wrap settings">
        <span className="label">Shots</span>
        {SHOTS.map((s) => <button key={s} type="button" className={`chip${shots === s ? ' is-on' : ''}`} aria-pressed={shots === s} onClick={() => setShots(s)}>{s}</button>)}
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
      <button type="button" className="linklike" aria-expanded={why} onClick={() => setWhy((w) => !w)}>Why does each bloom come out different?</button>
      {why && <p className="help">{WHY_SHOTS_VARY}</p>}
      {details && <CodePanel load={code} />}
    </div>
  );
}
