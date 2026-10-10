import type { Op } from '../engine/types';
import { ACTIONS } from '../content/content';

interface Props {
  nQubits: number;
  seedNames: string[];
  ops: Op[];
  showGates: boolean;
  disabled?: boolean;
  onRemove(index: number): void;
}

const turnsLabel = (t: number) => (t === 0.5 ? '½' : t === 0.25 ? '¼' : t === 0.125 ? '⅛' : t === -0.25 ? '−¼' : t.toFixed(2));

/** The circuit as a garden path: one lane per seed, one bead per action, in order. Tap a bead to remove it. */
export function PathView({ nQubits, seedNames, ops, showGates, disabled, onRemove }: Props) {
  return (
    <div className="path" role="group" aria-label="The mix: moves in order. Activate a move to remove it.">
      {!disabled && ops.length > 0 && <p className="path__hint">The mix, in order. Tap a move to remove it.</p>}
      {Array.from({ length: nQubits }, (_, q) => (
        <div key={q} className="path__lane">
          <span className="path__seed">{seedNames[q]}{showGates && <small> q[{q}]</small>}</span>
          <div className="path__beads">
            {ops.length === 0 && q === 0 && <span className="path__empty">No moves yet. Every track is on its first sound.</span>}
            {ops.map((op, i) => {
              const onLane = op.op === 'link' ? op.control === q || op.target === q : op.q === q;
              if (!onLane) return <span key={i} className="path__gap" aria-hidden="true" />;
              const a = ACTIONS[op.op];
              const role = op.op === 'link' ? (op.control === q ? 'control' : 'target') : '';
              const text = op.op === 'twist' ? `${a.verb} ${turnsLabel(op.turns)}` : op.op === 'link' ? (role === 'control' ? 'Sync ●' : 'Sync ⊕') : a.verb;
              const gate = op.op === 'link' ? (role === 'control' ? 'CX control' : 'CX target') : a.gate;
              return (
                <button key={i} type="button" className={`bead bead--${op.op}`} disabled={disabled} onClick={() => onRemove(i)}
                  aria-label={`Step ${i + 1}: ${text}${showGates ? ` (${gate})` : ''} on ${seedNames[q]}. Remove.`} title="Remove this move">
                  <span>{text}</span>{showGates && <small>{gate}</small>}
                  {!disabled && <i className="bead__x" aria-hidden="true">×</i>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
