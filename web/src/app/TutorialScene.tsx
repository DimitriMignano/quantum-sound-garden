import { useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { assignmentFor, LESSONS, LESSON_TRACKS, type Lesson } from '../content/content';
import { useGarden } from './useGarden';
import { marginalOne } from '../engine/outcomes';
import { nameFor } from '../audio/mixer';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';

interface Props { engine: QuantumEngine; details: boolean; onDone(): void }

const sameOps = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Learn: one page per idea. Each page has one or two sentences, the moves it is about, Try it, Play and Next. */
export function TutorialScene({ engine, details, onDone }: Props) {
  const ONE = { moments: 1, step: 3.0 };
  const [step, setStep] = useState(0);
  // one track until Sync: the early pages have nothing to select and nothing to confuse
  const count = LESSONS[step].tracks ?? 2;
  const tracks = useMemo(() => LESSON_TRACKS.slice(0, count), [count]);
  const trackNames = useMemo(() => tracks.map((t) => t.name), [tracks]);
  const assignment = useMemo(() => assignmentFor(tracks), [tracks]);
  const garden = useGarden(engine, count, assignment, []);
  const [pending, setPending] = useState<Lesson | null>(null);
  const [played, setPlayed] = useState<string | null>(null); // the lesson whose Play finished
  const lesson = LESSONS[step];
  const last = step === LESSONS.length - 1;

  // Try it: load the lesson's mix, then Play once the circuit state has caught up
  useEffect(() => {
    if (!pending || !sameOps(garden.circuit.ops, pending.ops)) return;
    const l = pending; setPending(null);
    garden.bloom(l.beats, { ...ONE, label: l.title }).then((r) => { if (r) setPlayed(l.id); });
  }, [pending, garden]);

  const tryIt = () => { setPlayed(null); garden.reset(lesson.ops); setPending(lesson); };
  const play = () => { setPlayed(null); garden.bloom(lesson.beats, { ...ONE, label: lesson.title }).then((r) => { if (r) setPlayed(lesson.id); }); };
  const go = (i: number) => { setStep(i); setPlayed(null); garden.reset([]); };

  if (lesson.intro) {
    return (
      <div className="scene scene--learn">
        <header className="puzzle__head">
          <p className="eyebrow">Learn · {step + 1} of {LESSONS.length}</p>
          <h2>{lesson.title}</h2>
          {lesson.text && <p className="lesson__text">{lesson.text}</p>}
        </header>
        <section className="intro" aria-label={lesson.title}>
          {lesson.intro.map((line, i) => <p key={i} className="intro__line"><span className="intro__num" aria-hidden="true">{i + 1}</span>{line}</p>)}
        </section>
        <div className="lesson__actions">
          <button type="button" className="primary" onClick={() => go(step + 1)}>Learn the moves</button>
          <button type="button" className="linklike learn__go" onClick={onDone}>Skip to the puzzles</button>
        </div>
      </div>
    );
  }

  // on a page about the dial, any amount on the Turn still counts as the page's mix
  const shape = (ops: unknown[]) => JSON.stringify(ops.map((o) => (o && typeof o === 'object' && (o as { op: string }).op === 'twist' ? { ...(o as object), turns: 0 } : o)));
  const onLessonMix = lesson.turns ? shape(garden.circuit.ops) === shape(lesson.ops) : sameOps(garden.circuit.ops, lesson.ops);
  const playing = !!garden.playback && !garden.playback.finished;
  const locked = garden.busy || playing;
  const heard = garden.playback?.finished && garden.result?.memory?.[0] ? nameFor(assignment, garden.result.memory[0]) : null;
  const caption = garden.playback?.finished && played === lesson.id && onLessonMix ? lesson.hear
    : heard ? `You heard: ${heard}. The tile shows this mix’s odds. Try it loads the page’s mix.`
    : locked ? undefined
    : lesson.show.length === 0 ? 'Press Try it.'
    : `Press Try it, or build it yourself with ${lesson.show.length === 1 ? 'the move' : 'the moves'} below and press Play.`;

  return (
    <div className="scene scene--learn">
      <header className="puzzle__head">
        <p className="eyebrow">Learn · {step + 1} of {LESSONS.length}</p>
        <h2>{lesson.title}</h2>
        <p className="lesson__text">{lesson.text}</p>
      </header>

      <GardenView garden={garden} tracks={tracks} assignment={assignment} details={details} caption={caption} />

      <div className="lesson__actions">
        <button type="button" className="primary" onClick={tryIt} disabled={locked}>Try it</button>
        {step > 0 && <button type="button" className="ghost" onClick={() => go(step - 1)} disabled={locked}>Back</button>}
        {!last && <button type="button" className={`ghost${played === lesson.id ? ' is-next' : ''}`} onClick={() => go(step + 1)} disabled={locked}>Next</button>}
        {last && <button type="button" className="primary learn__go" onClick={onDone} disabled={locked}>Start the puzzles</button>}
        {!last && <button type="button" className="linklike learn__go" onClick={onDone} disabled={locked}>Skip to the puzzles</button>}
      </div>

      <Board turns={lesson.turns} steady={Array.from({ length: count }, (_, q) => { const p = marginalOne(garden.ideal.probabilities, q); return p < 1e-6 || p > 1 - 1e-6; })} seedNames={trackNames} allowed={lesson.show} ops={garden.circuit.ops} disabled={locked} showGates={details}
        onRetune={(i, t) => garden.setOps(garden.circuit.ops.map((o, k) => (k === i && o.op === 'twist' ? { ...o, turns: t } : o)))} onAdd={(op) => { setPlayed(null); garden.addOp(op); }} onRemove={(i) => { setPlayed(null); garden.removeOp(i); }} onReset={() => { setPlayed(null); garden.reset([]); }}
        bloom={{ label: locked ? 'Playing…' : 'Play', onClick: play }}
        extra={garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button> : null} />
      {details && <CodePanel load={() => garden.code(lesson.beats)} />}
    </div>
  );
}
