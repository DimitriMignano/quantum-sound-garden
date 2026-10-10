import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { ACTIONS, assignmentFor, type Challenge } from '../content/content';
import { useGarden } from './useGarden';
import { GardenView, describeHeard, pct } from './GardenView';
import { Board } from './Board';
import { PathView } from './PathView';
import { CodePanel } from './CodePanel';
import { ResultNote } from './ResultNote';
import { DeeperPanel } from './DeeperPanel';

interface Props {
  engine: QuantumEngine;
  challenge: Challenge;
  reducedMotion: boolean;
  details: boolean;
  onNext(): void;
  onSolved(): void;
  isLast: boolean;
}

/** grow: use the moves · guess: Bloom was pressed, say what you will hear · blooming · result */
type Phase = 'grow' | 'guess' | 'blooming' | 'result';

export function ChallengeScene({ engine, challenge, reducedMotion, details, onNext, onSolved, isLast }: Props) {
  const seedNames = useMemo(() => challenge.seeds.map((s) => s.name), [challenge]);
  const assignment = useMemo(() => assignmentFor(challenge.seeds, challenge.zeroSound), [challenge]);
  const garden = useGarden(engine, challenge.seeds.length, assignment, challenge.start, true);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [phase, setPhase] = useState<Phase>('grow');
  const [solved, setSolved] = useState(false);
  const [why, setWhy] = useState(false);
  const [predictedRight, setPredictedRight] = useState<boolean | null>(null);
  const [baseline, setBaseline] = useState<{ fidelity: number; ops: number } | null>(null);

  // a changed garden means a new guess, and the odds hide again
  useEffect(() => { setPrediction(null); setPhase('grow'); setPredictedRight(null); }, [garden.circuit]);
  // playback finished (with or without audio): show the result
  useEffect(() => { if (garden.playback?.finished && phase === 'blooming') setPhase('result'); }, [garden.playback, phase]);

  const goalMet = useMemo(() => challenge.success(garden.ideal, garden.circuit, garden.measuredFidelity ?? undefined), [challenge, garden.ideal, garden.circuit, garden.measuredFidelity]);
  useEffect(() => { if (phase === 'result' && goalMet) { setSolved(true); onSolved(); } }, [phase, goalMet, onSolved]);

  // the guess is judged once the measured distribution exists (the noisy garden judges on what was measured)
  useEffect(() => {
    if (phase !== 'result' || !garden.measured || !prediction) return;
    const chosen = challenge.predictions.find((p) => p.id === prediction);
    setPredictedRight(chosen ? chosen.matches(garden.ideal, garden.measured) : null);
    if (challenge.noisy && garden.measuredFidelity !== null && baseline === null && garden.circuit.ops.length === challenge.start.length) {
      setBaseline({ fidelity: garden.measuredFidelity, ops: garden.circuit.ops.length });
    }
  }, [phase, garden.measured, garden.measuredFidelity, garden.ideal, garden.circuit.ops.length, prediction, challenge, baseline]);

  const guess = useCallback(async (id: string) => {
    setPrediction(id);
    garden.hearOdds();
    setPhase('blooming');
    const r = await garden.bloom(challenge.bloomShots, { noise: challenge.noisy, moments: challenge.moments, step: challenge.step });
    if (!r) setPhase('grow');
  }, [challenge, garden]);

  const code = useCallback(() => garden.code(challenge.bloomShots), [garden, challenge.bloomShots]);
  const busy = garden.busy || phase === 'blooming';
  const changed = garden.circuit.ops.length !== challenge.start.length;

  // the one line under the garden
  let caption: string;
  if (phase === 'result' && garden.measured) {
    const heard = describeHeard(garden.measured, assignment);
    const verdict = predictedRight === null ? '' : predictedRight ? ' Your guess was right.' : ' Not what you guessed.';
    caption = goalMet ? `Solved. You heard ${heard}.${verdict}` : `You heard ${heard}.${verdict} ${challenge.noisy ? '' : 'Change the garden and Bloom again.'}`;
    if (challenge.noisy && garden.measuredFidelity !== null) {
      caption += ` Match to the clean garden: ${pct(garden.measuredFidelity)}`;
      caption += baseline && garden.circuit.ops.length < baseline.ops ? ` (it was ${pct(baseline.fidelity)} with ${baseline.ops} moves; yours has ${garden.circuit.ops.length}).` : '.';
    }
  } else if (phase === 'guess') caption = 'Before it blooms: what will you hear?';
  else caption = changed ? `${challenge.goal} Press Bloom when you are ready.` : `${challenge.goal} Grow the garden with the moves, then press Bloom.`;

  return (
    <div className="scene scene--puzzle">
      <header className="puzzle__head">
        <p className="eyebrow">Puzzle {challenge.index} of 4</p>
        <h2>{challenge.title}</h2>
        <p className="story">{challenge.story}</p>
      </header>

      <GardenView garden={garden} seedNames={seedNames} assignment={assignment} reducedMotion={reducedMotion} details={details} caption={caption} />

      {phase === 'guess' ? (
        <div className="choices" role="group" aria-label="Your guess">
          {challenge.predictions.map((p) => (
            <button key={p.id} type="button" className="choice" onClick={() => guess(p.id)}>{p.label}</button>
          ))}
          <button type="button" className="linklike" onClick={() => setPhase('grow')}>Back to the garden</button>
        </div>
      ) : (
        <>
          {phase === 'result' && garden.result && (
            <div className={`verdict${goalMet ? ' is-good' : ''}`} aria-live="polite">
              <div className="row">
                {goalMet && <button type="button" className="primary" onClick={onNext}>{isLast ? 'Open the creator' : 'Next puzzle'}</button>}
                <button type="button" className="ghost" onClick={() => { setPhase('blooming'); garden.replay(); }}>Replay</button>
                {solved && <button type="button" className="ghost" aria-expanded={why} onClick={() => setWhy((w) => !w)}>{why ? 'Hide why' : 'Why?'}</button>}
                {!goalMet && hintsShown < challenge.hints.length && <button type="button" className="ghost" onClick={() => setHintsShown((h) => h + 1)}>Hint</button>}
              </div>
              <ResultNote result={garden.result} />
            </div>
          )}
          {hintsShown > 0 && (
            <div className="hints" aria-label="Hints">
              {challenge.hints.slice(0, hintsShown).map((h, i) => <p key={i}><span className="eyebrow">Hint {i + 1}</span> {h}</p>)}
            </div>
          )}
          <Board seedNames={seedNames} allowed={challenge.allowed} ops={garden.circuit.ops} disabled={busy} showGates={details}
            onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset()}
            bloom={{ label: phase === 'blooming' ? 'Blooming…' : 'Bloom', onClick: () => setPhase('guess') }}
            extra={phase === 'blooming' && garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.skip}>Skip</button> : null} />
          {garden.error && <p className="error" role="alert">{garden.error}</p>}
          <details className="rulesfold">
            <summary>The moves</summary>
            <ul>
              {(['flip', 'split', 'twist', 'link', 'bloom'] as const).filter((k) => k === 'bloom' || challenge.allowed.includes(k)).map((k) => (
                <li key={k}><b className={`rule__title rule__title--${k}`}>{ACTIONS[k].verb}</b> {ACTIONS[k].what}{details && <code> {ACTIONS[k].gate}</code>}</li>
              ))}
            </ul>
          </details>
          {solved && why && (
            <section className="reveal" aria-label="Why it works">
              <p className="eyebrow">Why it works</p>
              <h3>{challenge.reveal.title}</h3>
              {challenge.reveal.body.map((b, i) => <p key={i}>{b}</p>)}
              <PathView nQubits={challenge.seeds.length} seedNames={seedNames} ops={garden.circuit.ops} showGates disabled onRemove={() => {}} />
              <CodePanel load={code} />
              {challenge.deeper && <DeeperPanel garden={garden} deeper={challenge.deeper} shots={challenge.bloomShots} moments={challenge.moments} step={challenge.step} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}
