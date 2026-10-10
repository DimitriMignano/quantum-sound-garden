import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { assignmentFor, type Challenge } from '../content/content';
import { useGarden } from './useGarden';
import { GardenView, pct } from './GardenView';
import { ActionBar } from './ActionBar';
import { PathView } from './PathView';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';

interface Props {
  engine: QuantumEngine;
  challenge: Challenge;
  reducedMotion: boolean;
  onNext(): void;
  isLast: boolean;
}

type Phase = 'build' | 'blooming' | 'result';

export function ChallengeScene({ engine, challenge, reducedMotion, onNext, isLast }: Props) {
  const seedNames = useMemo(() => challenge.seeds.map((s) => s.name), [challenge]);
  const assignment = useMemo(() => assignmentFor(challenge.seeds, challenge.zeroSound), [challenge]);
  const garden = useGarden(engine, challenge.seeds.length, assignment, challenge.start);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showGates, setShowGates] = useState(false);
  const [phase, setPhase] = useState<Phase>('build');
  const [solved, setSolved] = useState(false);
  const [predictedRight, setPredictedRight] = useState<boolean | null>(null);
  const [baselineFidelity, setBaselineFidelity] = useState<number | null>(null);

  // a new circuit asks for a new prediction
  useEffect(() => { setPrediction(null); setPhase('build'); setPredictedRight(null); }, [garden.circuit]);
  useEffect(() => { if (garden.playback && garden.playback.outcome === null && garden.playback.index >= garden.playback.total && phase === 'blooming') setPhase('result'); }, [garden.playback, phase]);

  const goalMet = useMemo(() => challenge.success(garden.ideal, garden.circuit, garden.measuredFidelity ?? undefined), [challenge, garden.ideal, garden.circuit, garden.measuredFidelity]);
  useEffect(() => { if (phase === 'result' && goalMet) setSolved(true); }, [phase, goalMet]);

  const onBloom = useCallback(async () => {
    if (!prediction) return;
    const chosen = challenge.predictions.find((p) => p.id === prediction);
    setPhase('blooming');
    const r = await garden.bloom(challenge.bloomShots, { noise: challenge.noisy, moments: challenge.noisy ? 24 : undefined, step: challenge.noisy ? 0.75 : 0.95 });
    if (!r) { setPhase('build'); return; }
    setPredictedRight(chosen ? chosen.matches(garden.ideal) : null);
    if (challenge.noisy && baselineFidelity === null && garden.circuit.ops.length === challenge.start.length) {
      // remember how the tangled garden measured so the repaired one can be compared
      setTimeout(() => setBaselineFidelity((f) => f), 0);
    }
  }, [prediction, challenge, garden, baselineFidelity]);

  useEffect(() => {
    if (challenge.noisy && garden.measuredFidelity !== null && garden.circuit.ops.length === challenge.start.length && baselineFidelity === null) setBaselineFidelity(garden.measuredFidelity);
  }, [challenge, garden.measuredFidelity, garden.circuit.ops.length, baselineFidelity]);

  const code = useCallback(() => garden.code(challenge.bloomShots), [garden, challenge.bloomShots]);
  const busy = garden.busy || phase === 'blooming';

  return (
    <div className="scene">
      <GardenView garden={garden} seedNames={seedNames} assignment={assignment} reducedMotion={reducedMotion} />
      <aside className="panel" aria-label={`Challenge ${challenge.index}`}>
        <header className="panel__head">
          <p className="eyebrow">Challenge {challenge.index} of 4</p>
          <h2>{challenge.title}</h2>
          <p className="goal">{challenge.goal}</p>
          <p className="story">{challenge.story}</p>
        </header>

        <section className="panel__section" aria-label="Actions">
          <div className="section__head">
            <h3>Shape the garden</h3>
            <label className="toggle"><input type="checkbox" checked={showGates} onChange={(e) => setShowGates(e.target.checked)} /> Show gate names</label>
          </div>
          <ActionBar nQubits={challenge.seeds.length} seedNames={seedNames} allowed={challenge.allowed} disabled={busy} showGates={showGates} onAdd={garden.addOp} />
          <PathView nQubits={challenge.seeds.length} seedNames={seedNames} ops={garden.circuit.ops} showGates={showGates} disabled={busy} onRemove={garden.removeOp} />
          <div className="row">
            <button type="button" className="ghost" onClick={() => garden.reset()} disabled={busy}>Start over</button>
            <button type="button" className="ghost" onClick={garden.hearOdds} disabled={busy}>Hear the odds again</button>
            {garden.qiskitIdeal && <span className="verify" title="The instant preview is browser math; Qiskit's Statevector agrees to a millionth.">{garden.idealAgrees ? 'Qiskit agrees ✓' : 'Qiskit disagrees!'}</span>}
          </div>
        </section>

        <section className="panel__section" aria-label="Predict, then bloom">
          <h3>Before you bloom: what will you hear?</h3>
          <div className="predictions" role="radiogroup" aria-label="Your prediction">
            {challenge.predictions.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={prediction === p.id} className={`chip chip--wide${prediction === p.id ? ' is-on' : ''}`} onClick={() => setPrediction(p.id)} disabled={busy}>{p.label}</button>
            ))}
          </div>
          <div className="row">
            <button type="button" className="primary" onClick={onBloom} disabled={busy || !prediction} aria-describedby="bloom-help">
              {busy ? 'Blooming…' : `Bloom · ${challenge.bloomShots} shots`}
            </button>
            {garden.playback && garden.playback.outcome !== null && <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button>}
            {garden.result && phase === 'result' && <button type="button" className="ghost" onClick={garden.replay}>Replay</button>}
          </div>
          <p id="bloom-help" className="help">{prediction ? 'Bloom measures every seed, once per shot, and plays the outcomes.' : 'Pick a prediction to unlock Bloom.'}</p>
          {garden.error && <p className="error" role="alert">{garden.error}</p>}
        </section>

        {garden.result && phase === 'result' && (
          <section className={`panel__section feedback${goalMet ? ' is-good' : ''}`} aria-live="polite">
            <h3>{goalMet ? 'That is it.' : predictedRight ? 'Your prediction held. The goal is still open.' : 'Not what you expected?'}</h3>
            <p>
              {predictedRight === null ? '' : predictedRight ? 'The measured bars match what you predicted. ' : 'The measured bars disagree with your prediction; compare predicted and measured under each outcome. '}
              {challenge.noisy && garden.measuredFidelity !== null && (
                <>Match to the intended garden: <b>{pct(garden.measuredFidelity)}</b>{baselineFidelity !== null && garden.circuit.ops.length < challenge.start.length ? <> (tangled version measured {pct(baselineFidelity)}, with {challenge.start.length} actions; yours has {garden.circuit.ops.length}).</> : '.'}</>
              )}
            </p>
            <ResultNote result={garden.result} />
            {!goalMet && hintsShown < challenge.hints.length && (
              <button type="button" className="ghost" onClick={() => setHintsShown((h) => h + 1)}>Need a nudge?</button>
            )}
          </section>
        )}

        {hintsShown > 0 && (
          <section className="panel__section hints" aria-label="Hints">
            {challenge.hints.slice(0, hintsShown).map((h, i) => <p key={i}><span className="eyebrow">Hint {i + 1}</span> {h}</p>)}
          </section>
        )}

        {solved && (
          <section className="panel__section reveal" aria-label="What you did">
            <p className="eyebrow">Revealed</p>
            <h3>{challenge.reveal.title}</h3>
            {challenge.reveal.body.map((b, i) => <p key={i}>{b}</p>)}
            <PathView nQubits={challenge.seeds.length} seedNames={seedNames} ops={garden.circuit.ops} showGates disabled onRemove={() => {}} />
            <CodePanel load={code} />
            <button type="button" className="primary" onClick={onNext}>{isLast ? 'Open the creator' : 'Next challenge'}</button>
          </section>
        )}
      </aside>
    </div>
  );
}
