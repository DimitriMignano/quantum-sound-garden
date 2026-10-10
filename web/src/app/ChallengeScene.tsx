import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { assignmentFor, type Challenge } from '../content/content';
import { useGarden } from './useGarden';
import { GardenView, pct } from './GardenView';
import { ActionBar } from './ActionBar';
import { PathView } from './PathView';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';
import { DeeperPanel } from './DeeperPanel';

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
  const garden = useGarden(engine, challenge.seeds.length, assignment, challenge.start, true);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showGates, setShowGates] = useState(false);
  const [phase, setPhase] = useState<Phase>('build');
  const [solved, setSolved] = useState(false);
  const [predictedRight, setPredictedRight] = useState<boolean | null>(null);
  const [baseline, setBaseline] = useState<{ fidelity: number; ops: number } | null>(null);

  // a new circuit asks for a new prediction, and hides the odds again
  useEffect(() => { setPrediction(null); setPhase('build'); setPredictedRight(null); }, [garden.circuit]);
  // playback finished (with or without audio): show the result
  useEffect(() => { if (garden.playback?.finished && phase === 'blooming') setPhase('result'); }, [garden.playback, phase]);

  const goalMet = useMemo(() => challenge.success(garden.ideal, garden.circuit, garden.measuredFidelity ?? undefined), [challenge, garden.ideal, garden.circuit, garden.measuredFidelity]);
  useEffect(() => { if (phase === 'result' && goalMet) setSolved(true); }, [phase, goalMet]);

  // predictions evaluated once the measured distribution exists (needed for the noisy garden)
  useEffect(() => {
    if (phase !== 'result' || !garden.measured || !prediction) return;
    const chosen = challenge.predictions.find((p) => p.id === prediction);
    setPredictedRight(chosen ? chosen.matches(garden.ideal, garden.measured) : null);
    if (challenge.noisy && garden.measuredFidelity !== null && baseline === null && garden.circuit.ops.length === challenge.start.length) {
      setBaseline({ fidelity: garden.measuredFidelity, ops: garden.circuit.ops.length });
    }
  }, [phase, garden.measured, garden.measuredFidelity, garden.ideal, garden.circuit.ops.length, prediction, challenge, baseline]);

  const choosePrediction = (id: string) => { setPrediction(id); garden.hearOdds(); };

  const onBloom = useCallback(async () => {
    if (!prediction) return;
    setPhase('blooming');
    const r = await garden.bloom(challenge.bloomShots, { noise: challenge.noisy, moments: challenge.moments, step: challenge.step });
    if (!r) setPhase('build');
  }, [prediction, challenge, garden]);

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
          {challenge.noisy && <p className="help">Noise in this garden is simulated in-app (a stochastic Pauli model) unless you picked a noise-model backend.</p>}
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
            {garden.qiskitIdeal && <span className="verify" title="The instant preview is browser math; Qiskit's Statevector agrees to a millionth.">{garden.idealAgrees ? 'Qiskit agrees ✓' : 'Qiskit disagrees!'}</span>}
          </div>
        </section>

        <section className="panel__section" aria-label="Predict, then bloom">
          <h3>Before you hear anything: what will you hear?</h3>
          <div className="predictions" role="radiogroup" aria-label="Your prediction">
            {challenge.predictions.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={prediction === p.id} className={`chip chip--wide${prediction === p.id ? ' is-on' : ''}`} onClick={() => choosePrediction(p.id)} disabled={busy}>{p.label}</button>
            ))}
          </div>
          <div className="row">
            <button type="button" className="primary" onClick={onBloom} disabled={busy || !prediction} aria-describedby="bloom-help">
              {busy ? 'Blooming…' : `Bloom · ${challenge.bloomShots} shots`}
            </button>
            {phase === 'blooming' && garden.playback && !garden.playback.finished && <button type="button" className="ghost" onClick={garden.skip}>Skip to the result</button>}
            {garden.result && phase === 'result' && <button type="button" className="ghost" onClick={() => { setPhase('blooming'); garden.replay(); }}>Replay</button>}
          </div>
          <p id="bloom-help" className="help">
            {prediction
              ? `The odds are now shown and heard. Bloom measures every seed once per shot and plays ${challenge.moments} of the ${challenge.bloomShots} shots aloud.`
              : 'Commit to a prediction first. Then the garden reveals the odds, and Bloom unlocks.'}
          </p>
          {garden.error && <p className="error" role="alert">{garden.error}</p>}
        </section>

        {garden.result && phase === 'result' && (
          <section className={`panel__section feedback${goalMet ? ' is-good' : ''}`} aria-live="polite">
            <h3>{goalMet ? 'That is it.' : predictedRight ? 'Your prediction held. The goal is still open.' : 'Not what you expected?'}</h3>
            <p>
              {predictedRight === null ? '' : predictedRight
                ? (challenge.noisy ? 'Your prediction matches what the shots measured. ' : 'Your prediction matches the circuit’s ideal odds. The measured bars wander around them: that is sampling, not a different circuit. ')
                : (challenge.noisy ? 'The measured bars disagree with your prediction; look at how much landed on 01 and 10. ' : 'The circuit’s ideal odds disagree with your prediction; compare predicted and measured under each outcome. ')}
              {challenge.noisy && garden.measuredFidelity !== null && (
                <>Match to the intended garden: <b>{pct(garden.measuredFidelity)}</b>{baseline && garden.circuit.ops.length < baseline.ops ? <> (the tangled version measured {pct(baseline.fidelity)} with {baseline.ops} actions; yours has {garden.circuit.ops.length}).</> : '.'}</>
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
            {challenge.deeper && <DeeperPanel garden={garden} deeper={challenge.deeper} shots={challenge.bloomShots} moments={challenge.moments} step={challenge.step} />}
            <button type="button" className="primary" onClick={onNext}>{isLast ? 'Open the creator' : 'Next challenge'}</button>
          </section>
        )}
      </aside>
    </div>
  );
}
