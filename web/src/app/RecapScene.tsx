import { useCallback } from 'react';
import type { Circuit, QuantumEngine } from '../engine/types';
import { RECAP } from '../content/content';
import { CodePanel } from './CodePanel';

interface Props { engine: QuantumEngine; onDone(): void }

const PAIR: Circuit = { nQubits: 2, ops: [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }] };

/** After the last puzzle: the four moves and Play in quantum words, the five ideas, and the pair's Qiskit code. */
export function RecapScene({ engine, onDone }: Props) {
  const code = useCallback(() => engine.qiskitCode(PAIR, 64), [engine]);
  return (
    <div className="scene scene--recap">
      <header className="puzzle__head">
        <p className="eyebrow">Recap</p>
        <h2>{RECAP.title}</h2>
        <p className="story">{RECAP.lead}</p>
      </header>
      <table className="recap">
        <thead><tr><th>In the studio</th><th>In Qiskit</th><th>What it does</th></tr></thead>
        <tbody>
          {RECAP.rows.map((r) => (
            <tr key={r.move}><td className="recap__move">{r.move}</td><td><code>{r.gate}</code></td><td>{r.meaning}</td></tr>
          ))}
        </tbody>
      </table>
      <ul className="concepts" aria-label="The ideas">
        {RECAP.concepts.map((c) => (
          <li key={c.name}><b>{c.name}</b><small>{c.where}</small><span>{c.what}</span></li>
        ))}
      </ul>
      <section className="reveal reveal--code" aria-label={RECAP.codeTitle}>
        <CodePanel load={code} title={RECAP.codeTitle} />
      </section>
      <div className="row">
        <button type="button" className="primary" onClick={onDone}>{RECAP.next}</button>
      </div>
    </div>
  );
}
