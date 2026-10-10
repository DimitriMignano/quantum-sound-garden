import { useState } from 'react';
import type { Deeper } from '../content/content';
import type { Op } from '../engine/types';
import type { GardenApi } from './useGarden';
import { ResultNote } from './ResultNote';

/** The learner's garden and a copy with a half-turn twist inserted before its last Split (the recombination). */
export function dephasedTwins(ops: Op[]): Op[][] {
  let last = -1;
  ops.forEach((o, i) => { if (o.op === 'split') last = i; });
  if (last < 0) return [ops, ops];
  const q = (ops[last] as { q: number }).q;
  return [ops, [...ops.slice(0, last), { op: 'twist', q, turns: 0.5 }, ...ops.slice(last)]];
}

interface Props { garden: GardenApi; deeper: Deeper; shots: number; moments: number; step: number }

/** The quantum-versus-classical A/B: the same question asked of the learner's garden and of a classical twin. */
export function DeeperPanel({ garden, deeper, shots, moments, step }: Props) {
  const [last, setLast] = useState<string | null>(null);
  const run = deeper.runs.find((r) => r.id === last);
  return (
    <section className="deeper" aria-label={deeper.title}>
      <p className="eyebrow">Go deeper</p>
      <h3>{deeper.title}</h3>
      <p>{deeper.intro}</p>
      <div className="row wrap">
        {deeper.runs.map((r) => (
          <button key={r.id} type="button" className={`chip${last === r.id ? ' is-on' : ''}`} disabled={garden.busy} onClick={async () => {
            setLast(r.id);
            const twins = r.dephaseLearner ? dephasedTwins(garden.circuit.ops) : r.twins;
            await garden.bloom(shots, { basis: r.basis, mixture: twins, moments, step, label: r.label });
          }}>{r.label}</button>
        ))}
      </div>
      {run && garden.result && garden.resultLabel === run.label && (
        <div className="deeper__result" aria-live="polite">
          <p><b>{run.label}{garden.result.basis === 'x' ? ' (X basis)' : ''}:</b> {run.explain}</p>
          <ResultNote result={garden.result} />
        </div>
      )}
      <p className="help">{deeper.outro}</p>
    </section>
  );
}
