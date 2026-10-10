import { useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { assignmentFor, LESSONS, LESSON_TRACKS, type Lesson } from '../content/content';
import { useGarden } from './useGarden';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';

interface Props { engine: QuantumEngine; reducedMotion: boolean; details: boolean; onDone(): void }

const sameOps = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Learn: one page per idea. Each page has one or two sentences, the moves it is about, Try it, Play and Next. */
export function TutorialScene({ engine, reducedMotion, details, onDone }: Props) {
  const trackNames = useMemo(() => LESSON_TRACKS.map((t) => t.name), []);
  const assignment = useMemo(() => assignmentFor(LESSON_TRACKS), []);
  const garden = useGarden(engine, LESSON_TRACKS.length, assignment, []);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState<Lesson | null>(null);
  const [played, setPlayed] = useState<string | null>(null); // the lesson whose Play finished
  const lesson = LESSONS[step];
  const last = step === LESSONS.length - 1;

  // Try it: load the lesson's mix, then Play once the circuit state has caught up
  useEffect(() => {
    if (!pending || !sameOps(garden.circuit.ops, pending.ops)) return;
    const l = pending; setPending(null);
    garden.bloom(l.beats, { moments: l.beats, step: 0.6, label: l.title }).then((r) => { if (r) setPlayed(l.id); });
  }, [pending, garden]);

  const tryIt = () => { setPlayed(null); garden.reset(lesson.ops); setPending(lesson); };
  const play = () => { setPlayed(null); garden.bloom(lesson.beats, { moments: lesson.beats, step: 0.6, label: lesson.title }).then((r) => { if (r) setPlayed(lesson.id); }); };
  const go = (i: number) => { setStep(i); setPlayed(null); garden.reset([]); };

  const caption = garden.playback?.finished && played === lesson.id ? lesson.hear
    : garden.busy ? undefined
    : lesson.show.length === 0 ? 'Press Try it.'
    : `Press Try it, or build it yourself with ${lesson.show.length === 1 ? 'the move' : 'the moves'} below and press Play.`;

  return (
    <div className="scene scene--learn">
      <header className="puzzle__head">
        <p className="eyebrow">Learn · {step + 1} of {LESSONS.length}</p>
        <h2>{lesson.title}</h2>
        <p className="lesson__text">{lesson.text}</p>
      </header>

      <GardenView garden={garden} seedNames={trackNames} assignment={assignment} reducedMotion={reducedMotion} details={details} caption={caption} />

      <div className="lesson__actions">
        <button type="button" className="primary" onClick={tryIt} disabled={garden.busy}>Try it</button>
        {step > 0 && <button type="button" className="ghost" onClick={() => go(step - 1)} disabled={garden.busy}>Back</button>}
        {!last && <button type="button" className={`ghost${played === lesson.id ? ' is-next' : ''}`} onClick={() => go(step + 1)} disabled={garden.busy}>Next</button>}
        {last && <button type="button" className="primary learn__go" onClick={onDone} disabled={garden.busy}>Start the puzzles</button>}
        {!last && <button type="button" className="linklike learn__go" onClick={onDone} disabled={garden.busy}>Skip to the puzzles</button>}
      </div>

      <Board seedNames={trackNames} allowed={lesson.show} ops={garden.circuit.ops} disabled={garden.busy} showGates={details}
        onAdd={(op) => { setPlayed(null); garden.addOp(op); }} onRemove={(i) => { setPlayed(null); garden.removeOp(i); }} onReset={() => { setPlayed(null); garden.reset([]); }}
        bloom={{ label: garden.busy ? 'Playing…' : 'Play', onClick: play }}
        extra={garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button> : null} />
      {details && <CodePanel load={() => garden.code(lesson.beats)} />}
    </div>
  );
}
