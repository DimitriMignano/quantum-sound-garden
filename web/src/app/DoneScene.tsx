import { useCallback } from 'react';
import type { Circuit, QuantumEngine } from '../engine/types';
import { DONE } from '../content/content';
import { CodePanel } from './CodePanel';

interface Props { engine: QuantumEngine; onDone(): void }

const PAIR: Circuit = { nQubits: 2, ops: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }] };

/** After the last qubit puzzle: what they can do now, in plain words, with the code, then the studio. */
export function DoneScene({ engine, onDone }: Props) {
  const code = useCallback(() => engine.qiskitCode(PAIR, 64), [engine]);
  return (
    <div className="scene scene--done">
      <header className="puzzle__head">
        <p className="eyebrow">What you can do now</p>
        <h2>{DONE.title}</h2>
        <p className="story">{DONE.lead}</p>
      </header>
      <ol className="did" aria-label="What you did">
        {DONE.did.map((d, i) => <li key={i}>{d}</li>)}
      </ol>
      <section className="reveal reveal--code" aria-label={DONE.codeTitle}>
        <CodePanel load={code} title={DONE.codeTitle} />
      </section>
      <div className="row">
        <button type="button" className="primary primary--big" onClick={onDone}>{DONE.next}</button>
      </div>
    </div>
  );
}
