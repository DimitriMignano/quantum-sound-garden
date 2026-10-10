import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { ACTIONS, assignmentFor, type Challenge } from '../content/content';
import { fidelity } from '../engine/outcomes';
import { mixer } from '../audio/mixer';
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
  details: boolean;
  onNext(): void;
  onSolved(): void;
  isLast: boolean;
}

type Phase = 'build' | 'playing' | 'result';

/** How close the current mix is to the goal, 0..1. The clean-up puzzle also counts the extra moves. */
export function closenessOf(challenge: Challenge, probabilities: Record<string, number>, ops: number): number {
  const fid = fidelity(probabilities, challenge.target);
  if (!challenge.noisy || !challenge.intended) return fid;
  const extra = Math.max(0, ops - challenge.intended.length);
  const room = Math.max(1, challenge.start.length - challenge.intended.length);
  return fid * Math.max(0, 1 - extra / room);
}

const closenessWord = (c: number) => (c >= 0.995 ? 'there' : c >= 0.9 ? 'almost' : c >= 0.7 ? 'closer' : c >= 0.4 ? 'warmer' : 'far');

export function ChallengeScene({ engine, challenge, details, onNext, onSolved, isLast }: Props) {
  const trackNames = useMemo(() => challenge.tracks.map((t) => t.name), [challenge]);
  const assignment = useMemo(() => assignmentFor(challenge.tracks), [challenge]);
  const garden = useGarden(engine, challenge.tracks.length, assignment, challenge.start);
  const [hintsShown, setHintsShown] = useState(0);
  const [phase, setPhase] = useState<Phase>('build');
  const [solved, setSolved] = useState(false);
  const [why, setWhy] = useState(false);
  const [baseline, setBaseline] = useState<{ fidelity: number; ops: number } | null>(null);

  useEffect(() => { setPhase('build'); }, [garden.circuit]);
  useEffect(() => { if (garden.playback?.finished && phase === 'playing') setPhase('result'); }, [garden.playback, phase]);

  const goalMet = useMemo(() => challenge.success(garden.ideal, garden.circuit, garden.measuredFidelity ?? undefined), [challenge, garden.ideal, garden.circuit, garden.measuredFidelity]);
  useEffect(() => { if (phase === 'result' && goalMet) { setSolved(true); onSolved(); } }, [phase, goalMet, onSolved]);
  useEffect(() => {
    if (phase !== 'result' || !challenge.noisy || garden.measuredFidelity === null || baseline !== null || garden.circuit.ops.length !== challenge.start.length) return;
    setBaseline({ fidelity: garden.measuredFidelity, ops: garden.circuit.ops.length });
  }, [phase, challenge, garden.measuredFidelity, garden.circuit.ops.length, baseline]);

  // the eyes-closed progress bar: after each move, a short chord says how close the mix is (silent otherwise)
  const closeness = useMemo(() => closenessOf(challenge, garden.ideal.probabilities, garden.circuit.ops.length), [challenge, garden.ideal, garden.circuit.ops.length]);
  const cued = useRef<{ circuit: unknown; closeness: number } | null>(null);
  useEffect(() => {
    const prev = cued.current;
    cued.current = { circuit: garden.circuit, closeness };
    if (!prev || (prev.circuit === garden.circuit && prev.closeness === closeness)) return; // arrival (and StrictMode's second run) stay silent
    mixer.hum(closeness);
  }, [closeness, garden.circuit]);
  useEffect(() => () => mixer.hum(null), []);

  const play = useCallback(async () => {
    setPhase('playing');
    const r = await garden.bloom(challenge.beats, { noise: challenge.noisy, moments: 1, step: 3.0 });
    if (!r) setPhase('build');
  }, [challenge, garden]);

  const code = useCallback(() => garden.code(challenge.beats), [garden, challenge.beats]);
  const busy = garden.busy || phase === 'playing';
  // progressive exposure: gate names from puzzle 1, bits and odds from 2, the code once solved from 3, everything at 4
  const gates = details || challenge.exposure >= 1;
  const readings = details || challenge.exposure >= 2;
  const codeOnSolve = details || challenge.exposure >= 3;

  let caption: string;
  if (phase === 'result' && garden.measured) {
    const heard = describeHeard(garden.measured, assignment, garden.result?.memory?.[0] ?? null);
    caption = goalMet ? `Solved. You heard ${heard}.` : `You heard ${heard}. ${challenge.noisy ? '' : 'Change the mix and Play again, or Play again to hear another landing.'}`;
    if (challenge.noisy && garden.measuredFidelity !== null) {
      caption += ` Match to the clean mix: ${pct(garden.measuredFidelity)}`;
      caption += baseline && garden.circuit.ops.length < baseline.ops ? ` (it was ${pct(baseline.fidelity)} with ${baseline.ops} moves; yours has ${garden.circuit.ops.length}).` : '.';
    }
  } else {
    caption = `${challenge.goal} The hum says: ${closenessWord(closeness)}.`;
  }

  return (
    <div className="scene scene--puzzle">
      <header className="puzzle__head">
        <p className="eyebrow">Puzzle {challenge.index} of 4</p>
        <h2>{challenge.title}</h2>
        <p className="story">{challenge.story}</p>
      </header>

      <GardenView garden={garden} tracks={challenge.tracks} assignment={assignment} details={readings} caption={caption} />

      {phase === 'result' && garden.result && (
        <div className={`verdict${goalMet ? ' is-good' : ''}`} aria-live="polite">
          <div className="row">
            {goalMet && <button type="button" className="primary" onClick={onNext}>{isLast ? 'Open the studio' : 'Next puzzle'}</button>}
            <button type="button" className="ghost" onClick={() => { setPhase('playing'); garden.replay(); }}>Hear it again</button>
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
      <Board seedNames={trackNames} allowed={challenge.allowed} ops={garden.circuit.ops} disabled={busy} showGates={gates}
        onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset()}
        bloom={{ label: phase === 'playing' ? 'Playing…' : 'Play', onClick: play }}
        extra={phase === 'playing' && garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.skip}>Skip</button> : null} />
      {garden.error && <p className="error" role="alert">{garden.error}</p>}
      <details className="rulesfold">
        <summary>The moves</summary>
        <ul>
          {(['flip', 'split', 'twist', 'link', 'bloom'] as const).filter((k) => k === 'bloom' || challenge.allowed.includes(k)).map((k) => (
            <li key={k}><b className={`rule__title rule__title--${k}`}>{ACTIONS[k].verb}</b> {ACTIONS[k].what}{gates && <code> {ACTIONS[k].gate}</code>}</li>
          ))}
        </ul>
      </details>
      {solved && codeOnSolve && !why && (
        <section className="reveal reveal--code" aria-label="The circuit you built">
          <p className="eyebrow">The circuit you just built, in Qiskit</p>
          <CodePanel load={code} />
        </section>
      )}
      {solved && why && (
        <section className="reveal" aria-label="Why it works">
          <p className="eyebrow">Why it works · the quantum behind it</p>
          <h3>{challenge.reveal.title}</h3>
          {challenge.reveal.body.map((b, i) => <p key={i}>{b}</p>)}
          <PathView nQubits={challenge.tracks.length} seedNames={trackNames} ops={garden.circuit.ops} showGates disabled onRemove={() => {}} />
          <CodePanel load={code} />
          {challenge.deeper && <DeeperPanel garden={garden} deeper={challenge.deeper} shots={challenge.beats} moments={challenge.moments} step={challenge.step} />}
        </section>
      )}
    </div>
  );
}
