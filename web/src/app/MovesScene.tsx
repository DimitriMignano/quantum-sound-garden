import { useEffect, useMemo, useState } from 'react';
import type { QuantumEngine } from '../engine/types';
import { assignmentFor, RULES, RULE_SEEDS, RULE_ZERO_SOUND, type Rule } from '../content/content';
import { useGarden } from './useGarden';
import { GardenView } from './GardenView';
import { Board } from './Board';
import { CodePanel } from './CodePanel';

interface Props { engine: QuantumEngine; reducedMotion: boolean; details: boolean; onDone(): void }

const sameOps = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The rulebook: nine one-line rules, each one playable in the same garden the learner can then grow freely. */
export function MovesScene({ engine, reducedMotion, details, onDone }: Props) {
  const seedNames = useMemo(() => RULE_SEEDS.map((s) => s.name), []);
  const assignment = useMemo(() => assignmentFor(RULE_SEEDS, RULE_ZERO_SOUND), []);
  const garden = useGarden(engine, RULE_SEEDS.length, assignment, []);
  const [current, setCurrent] = useState<Rule | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const [pending, setPending] = useState<Rule | null>(null);

  // "Hear it": load the rule's garden, then bloom it once the circuit state has caught up
  useEffect(() => {
    if (!pending || !sameOps(garden.circuit.ops, pending.ops)) return;
    const rule = pending;
    setPending(null);
    garden.bloom(rule.shots, { moments: rule.shots, step: 0.55, label: rule.title }).then((r) => { if (r) setHeard((h) => (h.includes(rule.id) ? h : [...h, rule.id])); });
  }, [pending, garden]);

  const hear = (rule: Rule) => { setCurrent(rule); garden.reset(rule.ops); setPending(rule); };
  const finished = current && garden.playback?.finished && garden.resultLabel === current.title;
  const caption = finished ? current.hear
    : current && garden.busy ? current.text
    : garden.circuit.ops.length > 0 && !current ? undefined
    : 'Press Hear it on any rule. Then grow your own garden with the moves below.';

  return (
    <div className="scene scene--moves">
      <div className="scene__main">
        <GardenView garden={garden} seedNames={seedNames} assignment={assignment} reducedMotion={reducedMotion} details={details} caption={caption} />
        <Board seedNames={seedNames} allowed={['flip', 'split', 'twist', 'link']} ops={garden.circuit.ops} disabled={garden.busy} showGates={details}
          onAdd={(op) => { setCurrent(null); garden.addOp(op); }} onRemove={(i) => { setCurrent(null); garden.removeOp(i); }} onReset={() => { setCurrent(null); garden.reset([]); }}
          bloom={{ label: 'Bloom', onClick: () => { setCurrent(null); garden.bloom(8, { moments: 8, step: 0.55 }); } }}
          extra={garden.playback && !garden.playback.finished ? <button type="button" className="ghost" onClick={garden.stopPlayback}>Stop</button> : null} />
        {details && <CodePanel load={() => garden.code(8)} />}
      </div>
      <aside className="rules" aria-label="The moves">
        <header className="rules__head">
          <p className="eyebrow">The moves</p>
          <h2>Nine rules. Hear each one.</h2>
        </header>
        <ol className="rules__list">
          {RULES.map((r) => {
            const on = current?.id === r.id;
            const done = heard.includes(r.id);
            return (
              <li key={r.id} className={`rule rule--${r.move}${on ? ' is-on' : ''}${done ? ' is-heard' : ''}`}>
                <span className="rule__title">{r.title}</span>
                <span className="rule__text">{r.text}</span>
                <button type="button" className={`chip${on && garden.busy ? ' is-on' : ''}`} disabled={garden.busy} onClick={() => hear(r)} aria-label={`Hear it: ${r.title}`}>
                  {done ? 'Again' : 'Hear it'}
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" className="primary moves__go" onClick={onDone}>Start the puzzles</button>
        <p className="help">{heard.length} of {RULES.length} heard. The puzzles use only these moves.</p>
      </aside>
    </div>
  );
}
