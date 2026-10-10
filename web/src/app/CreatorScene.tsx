import { useCallback, useMemo, useState } from 'react';
import type { QuantumEngine, BackendDescriptor } from '../engine/types';
import { bitstrings } from '../engine/outcomes';
import { APP, DEFAULT_CREATOR_ASSIGNMENT, WHY_SHOTS_VARY } from '../content/content';
import { SOUND_LIBRARY } from '../audio/sounds';
import { useGarden } from './useGarden';
import { GardenView } from './GardenView';
import { ActionBar } from './ActionBar';
import { PathView } from './PathView';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';

interface Props { engine: QuantumEngine; backends: BackendDescriptor[]; defaultBackendId: string; reducedMotion: boolean; }

const SEEDS = ['Seed A', 'Seed B'];
const SHOTS = [16, 64, 256];

export function CreatorScene({ engine, backends, defaultBackendId, reducedMotion }: Props) {
  const [assignment, setAssignment] = useState<Record<string, string[]>>(DEFAULT_CREATOR_ASSIGNMENT);
  const [shots, setShots] = useState(64);
  const [noise, setNoise] = useState(false);
  const [backendId, setBackendId] = useState(defaultBackendId);
  const [showGates, setShowGates] = useState(true);
  const [why, setWhy] = useState(false);
  const garden = useGarden(engine, 2, assignment, []);
  const code = useCallback(() => garden.code(shots), [garden, shots]);
  const labels = useMemo(() => bitstrings(2), []);
  const selectable = backends.filter((b) => b.available || b.reason);

  const bloom = () => garden.bloom(shots, { noise, backendId, moments: 22, step: 0.9 });

  return (
    <div className="scene">
      <GardenView garden={garden} seedNames={SEEDS} assignment={assignment} reducedMotion={reducedMotion} />
      <aside className="panel" aria-label="Creator">
        <header className="panel__head">
          <p className="eyebrow">{APP.creatorTitle}</p>
          <h2>{APP.creatorTagline}</h2>
          <p className="story">Give each of the four outcomes a sound. Shape the two seeds. Bloom for a 20-second soundscape drawn from real shots.</p>
        </header>

        <section className="panel__section" aria-label="Sounds">
          <h3>Sounds for each outcome</h3>
          <div className="assign">
            {labels.map((b) => (
              <label key={b} className="assign__row">
                <code>{b}</code>
                <select value={assignment[b][0]} onChange={(e) => setAssignment({ ...assignment, [b]: [e.target.value] })}>
                  {SOUND_LIBRARY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="help">Reading the bits: in <code>10</code>, Seed B is 1 and Seed A is 0. Qubit 0 is the rightmost bit, as in Qiskit.</p>
        </section>

        <section className="panel__section" aria-label="Shape">
          <div className="section__head">
            <h3>Shape the garden</h3>
            <label className="toggle"><input type="checkbox" checked={showGates} onChange={(e) => setShowGates(e.target.checked)} /> Gate names</label>
          </div>
          <ActionBar nQubits={2} seedNames={SEEDS} allowed={['flip', 'split', 'twist', 'link']} disabled={garden.busy} showGates={showGates} onAdd={garden.addOp} />
          <PathView nQubits={2} seedNames={SEEDS} ops={garden.circuit.ops} showGates={showGates} disabled={garden.busy} onRemove={garden.removeOp} />
          <div className="row">
            <button type="button" className="ghost" onClick={() => garden.reset([])} disabled={garden.busy}>Start over</button>
            <button type="button" className="ghost" onClick={garden.hearOdds} disabled={garden.busy}>Hear the odds</button>
            {garden.qiskitIdeal && <span className="verify">{garden.idealAgrees ? 'Qiskit agrees ✓' : 'Qiskit disagrees!'}</span>}
          </div>
        </section>

        <section className="panel__section" aria-label="Bloom">
          <h3>Bloom</h3>
          <div className="row wrap">
            <span className="label">Shots</span>
            {SHOTS.map((s) => <button key={s} type="button" className={`chip${shots === s ? ' is-on' : ''}`} aria-pressed={shots === s} onClick={() => setShots(s)}>{s}</button>)}
            <label className="toggle"><input type="checkbox" checked={noise} onChange={(e) => setNoise(e.target.checked)} /> Add noise (teaching model)</label>
          </div>
          {selectable.length > 1 && (
            <label className="row">
              <span className="label">Backend</span>
              <select value={backendId} onChange={(e) => setBackendId(e.target.value)}>
                {selectable.map((b) => <option key={b.id} value={b.id} disabled={!b.available}>{b.label}{!b.available ? ` (${b.reason})` : ''}</option>)}
              </select>
            </label>
          )}
          <div className="row">
            <button type="button" className="primary" onClick={bloom} disabled={garden.busy}>{garden.busy ? 'Blooming…' : garden.result ? 'Regenerate' : 'Bloom'}</button>
            {garden.result && <button type="button" className="ghost" onClick={garden.replay} disabled={garden.busy}>Replay</button>}
            {garden.playback && garden.playback.outcome !== null && <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button>}
          </div>
          {garden.error && <p className="error" role="alert">{garden.error}</p>}
          {garden.result && <ResultNote result={garden.result} />}
          <button type="button" className="linklike" aria-expanded={why} onClick={() => setWhy((w) => !w)}>Why does each bloom come out different?</button>
          {why && <p className="help">{WHY_SHOTS_VARY}</p>}
        </section>

        <section className="panel__section">
          <CodePanel load={code} />
        </section>
      </aside>
    </div>
  );
}
