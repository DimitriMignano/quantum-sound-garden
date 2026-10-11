import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { ACTIONS, assignmentFor, closenessOf, closenessWord, describeOps, SOUND_LINGO, type Challenge } from '../content/content';
import { LingoProvider } from './lingo';
import { mixer } from '../audio/mixer';
import { useGarden } from './useGarden';
import { marginalOne } from '../engine/outcomes';
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
const sameOps = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** One puzzle: the goal panel, the tiles, Play, hints that lead to the solution, Show solution, and the quantum lesson once solved. */
export function ChallengeScene({ engine, challenge, details, onNext, onSolved, isLast }: Props) {
  const lingo = challenge.lingo ?? SOUND_LINGO;
  const quantum = lingo.mode === 'quantum';
  const trackNames = useMemo(() => challenge.tracks.map((t, q) => lingo.trackName(q, t.name)), [challenge, lingo]);
  const assignment = useMemo(() => assignmentFor(challenge.tracks), [challenge]);
  const garden = useGarden(engine, challenge.tracks.length, assignment, challenge.start);
  const [hintsShown, setHintsShown] = useState(0);
  const [phase, setPhase] = useState<Phase>('build');
  const [solved, setSolved] = useState(false);
  const [deeper, setDeeper] = useState(false);
  const [plays, setPlays] = useState(0);
  const [solutionLoaded, setSolutionLoaded] = useState(false);
  const [playedOps, setPlayedOps] = useState<string | null>(null); // the mix the last Play measured
  const [baseline, setBaseline] = useState<{ fidelity: number; ops: number } | null>(null);

  useEffect(() => { setPhase('build'); }, [garden.circuit]);
  useEffect(() => { if (garden.playback?.finished && phase === 'playing') setPhase('result'); }, [garden.playback, phase]);

  // any mix that does the job counts: the check reads the odds, not the moves
  const goalMet = useMemo(() => challenge.success(garden.ideal, garden.circuit, garden.measuredFidelity ?? undefined), [challenge, garden.ideal, garden.circuit, garden.measuredFidelity]);
  // a result counts only for the mix it measured: loading a solution after a missed Play must not read as solved
  const resultIsCurrent = phase === 'result' && playedOps === JSON.stringify(garden.circuit.ops);
  useEffect(() => { if (resultIsCurrent && goalMet) { setSolved(true); onSolved(); } }, [resultIsCurrent, goalMet, onSolved]);
  useEffect(() => {
    if (phase !== 'result' || !challenge.noisy || garden.measuredFidelity === null || baseline !== null || garden.circuit.ops.length !== challenge.start.length) return;
    setBaseline({ fidelity: garden.measuredFidelity, ops: garden.circuit.ops.length });
  }, [phase, challenge, garden.measuredFidelity, garden.circuit.ops.length, baseline]);

  // how close the mix is to the goal: a word on the page (nothing sounds unless Play is pressed)
  const closeness = useMemo(() => closenessOf(challenge, garden.ideal.probabilities, garden.circuit.ops.length), [challenge, garden.ideal, garden.circuit.ops.length]);
  // the success moment: once, when the goal is met after a Play
  const [celebrate, setCelebrate] = useState(false);
  const dinged = useRef(false);
  useEffect(() => {
    if (resultIsCurrent && goalMet && !dinged.current) { dinged.current = true; setCelebrate(true); mixer.ding(); }
  }, [resultIsCurrent, goalMet]);

  const play = useCallback(async () => {
    setPhase('playing');
    setPlays((n) => n + 1);
    setPlayedOps(JSON.stringify(garden.circuit.ops));
    const r = await garden.bloom(challenge.beats, { noise: challenge.noisy, moments: 1, step: 3.0 });
    if (!r) setPhase('build');
  }, [challenge, garden]);

  // nobody gets stuck: once a Play has missed, the solution is one press away; it loads the mix and says it in words
  const showSolution = () => { garden.reset(challenge.solution); setSolutionLoaded(true); setHintsShown(challenge.hints.length); };
  const onSolution = solutionLoaded && sameOps(garden.circuit.ops, challenge.solution);
  const stuck = plays > 0 && !goalMet && !onSolution;

  const code = useCallback(() => garden.code(challenge.beats), [garden, challenge.beats]);
  const busy = garden.busy || phase === 'playing';
  // progressive exposure: gate names from puzzle 1, bits and odds from 2; the circuit and the code wait under Go deeper
  const gates = details || challenge.exposure >= 1;
  const readings = details || challenge.exposure >= 2 || quantum;

  let caption: string;
  if (resultIsCurrent && garden.measured) {
    const played = garden.result?.memory?.[0] ?? null;
    const heard = describeHeard(garden.measured, assignment, played);
    const said = played ? lingo.measured(played, heard) : `You heard ${heard}`;
    caption = goalMet ? `Solved. ${said}.` : `${said}.`;
    if (challenge.noisy && garden.measuredFidelity !== null) {
      caption += ` Match to the clean mix: ${pct(garden.measuredFidelity)}`;
      caption += baseline && garden.circuit.ops.length < baseline.ops ? ` (it was ${pct(baseline.fidelity)} with ${baseline.ops} moves; yours has ${garden.circuit.ops.length}).` : '.';
    }
  } else if (onSolution) {
    caption = `Solution loaded: ${describeOps(challenge.solution, trackNames, lingo)}. Press ${lingo.verbs.bloom}.`;
  } else {
    caption = lingo.pressToPlay;
  }
  const closenessLabel = solved && goalMet ? 'Solved' : closenessWord(closeness);
  const nextLabel = isLast ? (quantum ? 'Make a beat' : 'Play them as qubits') : 'Next puzzle';

  return (
    <LingoProvider value={lingo}>
    <div className="scene scene--puzzle">
      <header className="puzzle__head">
        <p className="eyebrow">{quantum ? 'Qubits · puzzle' : 'Puzzle'} {challenge.index} of 4</p>
        <h2>{challenge.title}</h2>
        {challenge.story && <p className="story">{challenge.story}</p>}
        <div className={`goal${solved && goalMet ? ' is-met' : ''}`}>
          <div className="goal__row">
            <span className="goal__label">Goal</span>
            <span className={`goal__closeness goal__closeness--${closenessLabel.toLowerCase()}`} aria-live="polite">{closenessLabel === 'Solved' ? 'Solved' : `Closeness: ${closenessLabel}`}</span>
          </div>
          <p className="goal__text">{challenge.goal}</p>
          <p className="goal__done"><span className="goal__label">Done when</span>{challenge.done}</p>
        </div>
      </header>

      <GardenView garden={garden} tracks={challenge.tracks} assignment={assignment} details={readings} caption={caption} />

      {celebrate && (
        <div className="success" role="status">
          <div className="success__text">
            <p className="success__title">Solved</p>
            <p className="success__body">{isLast ? (quantum ? 'That was the last puzzle. The studio is yours.' : 'That was the last sound puzzle. Next, the same four as qubits.') : 'Next puzzle, or keep playing with this mix.'}</p>
          </div>
          <div className="row">
            <button type="button" className="primary" onClick={onNext}>{nextLabel}</button>
            <button type="button" className="ghost" onClick={() => setCelebrate(false)}>Keep playing</button>
          </div>
        </div>
      )}
      {resultIsCurrent && garden.result && !celebrate && (
        <div className={`verdict${goalMet ? ' is-good' : ''}`} aria-live="polite">
          <div className="row">
            {goalMet && <button type="button" className="primary" onClick={onNext}>{nextLabel}</button>}
            <button type="button" className="ghost" onClick={() => { setPhase('playing'); garden.replay(); }}>Hear it again</button>
            {!goalMet && hintsShown < challenge.hints.length && <button type="button" className="ghost" onClick={() => setHintsShown((h) => h + 1)}>Hint</button>}
            {stuck && <button type="button" className="ghost" onClick={showSolution}>Show solution</button>}
          </div>
          <ResultNote result={garden.result} />
        </div>
      )}
      {hintsShown > 0 && !goalMet && (
        <div className="hints" aria-label="Hints">
          {challenge.hints.slice(0, hintsShown).map((h, i) => <p key={i}><span className="eyebrow">Hint {i + 1}</span> {h}</p>)}
        </div>
      )}
      <Board steady={Array.from({ length: challenge.tracks.length }, (_, q) => { const p = marginalOne(garden.ideal.probabilities, q); return p < 1e-6 || p > 1 - 1e-6; })} seedNames={trackNames} allowed={challenge.allowed} ops={garden.circuit.ops} disabled={busy} showGates={gates}
        onRetune={(i, t) => garden.setOps(garden.circuit.ops.map((o, k) => (k === i && o.op === 'twist' ? { ...o, turns: t } : o)))} onAdd={garden.addOp} onRemove={garden.removeOp} onReset={() => garden.reset()}
        bloom={{ label: phase === 'playing' ? lingo.playing : lingo.verbs.bloom, onClick: play }}
        extra={phase === 'playing' && garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.skip}>Skip</button> : null} />
      {garden.error && <p className="error" role="alert">{garden.error}</p>}
      {solved && (
        <section className="quantum" aria-label="In quantum terms">
          <p className="quantum__label">{lingo.lessonLabel}</p>
          <h3 className="quantum__concept">{challenge.quantum.concept}</h3>
          {challenge.quantum.lines.map((l, i) => <p key={i}>{l}</p>)}
          <div className="row">
            <button type="button" className="ghost" aria-expanded={deeper} onClick={() => setDeeper((d) => !d)}>{deeper ? 'Hide the circuit' : 'Go deeper: the circuit and the code'}</button>
          </div>
          {deeper && (
            <>
              <PathView nQubits={challenge.tracks.length} seedNames={trackNames} ops={garden.circuit.ops} showGates disabled onRemove={() => {}} />
              <CodePanel load={code} title="Your mix, in Qiskit" />
              {challenge.deeper && <DeeperPanel garden={garden} deeper={challenge.deeper} shots={challenge.beats} moments={challenge.moments} step={challenge.step} />}
            </>
          )}
        </section>
      )}
      <details className="rulesfold">
        <summary>{quantum ? 'The gates' : 'The moves'}</summary>
        <ul>
          {(['flip', 'split', 'twist', 'link', 'bloom'] as const).filter((k) => k === 'bloom' || challenge.allowed.includes(k)).map((k) => (
            <li key={k}><b className={`rule__title rule__title--${k}`}>{lingo.verbs[k]}</b> {lingo.whats[k]}{gates && !quantum && <code> {ACTIONS[k].gate}</code>}</li>
          ))}
        </ul>
      </details>
    </div>
    </LingoProvider>
  );
}
