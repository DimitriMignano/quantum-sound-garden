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
    <div className="path" role="group" aria-label="The path: actions in order. Activate an action to remove it.">
      {Array.from({ length: nQubits }, (_, q) => (
        <div key={q} className="path__lane">
          <span className="path__seed">{seedNames[q]}{showGates && <small> q[{q}]</small>}</span>
          <div className="path__beads">
            {ops.length === 0 && q === 0 && <span className="path__empty">No actions yet. The seeds are 0.</span>}
            {ops.map((op, i) => {
              const onLane = op.op === 'link' ? op.control === q || op.target === q : op.q === q;
              if (!onLane) return <span key={i} className="path__gap" aria-hidden="true" />;
              const a = ACTIONS[op.op];
              const role = op.op === 'link' ? (op.control === q ? 'control' : 'target') : '';
              const text = op.op === 'twist' ? `${a.verb} ${turnsLabel(op.turns)}` : op.op === 'link' ? (role === 'control' ? 'Link ●' : 'Link ⊕') : a.verb;
              const gate = op.op === 'link' ? (role === 'control' ? 'CX control' : 'CX target') : a.gate;
              return (
                <button key={i} type="button" className={`bead bead--${op.op}`} disabled={disabled} onClick={() => onRemove(i)}
                  aria-label={`Step ${i + 1}: ${text}${showGates ? ` (${gate})` : ''} on ${seedNames[q]}. Remove.`} title="Remove this action">
                  <span>{text}</span>{showGates && <small>{gate}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
