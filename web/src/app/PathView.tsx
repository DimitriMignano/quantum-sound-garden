import type { Op } from '../engine/types';
import { ACTIONS } from '../content/content';
import { useLingo } from './lingo';

interface Props {
  nQubits: number;
  seedNames: string[];
  ops: Op[];
  showGates: boolean;
  disabled?: boolean;
  onRemove(index: number): void;
}

const TURN_MATH: Record<string, string> = { '0.5': 'π', '0.25': 'π/2', '0.125': 'π/4', '-0.25': '−π/2' };
const turnsLabel = (t: number) => (t === 0.5 ? '½' : t === 0.25 ? '¼' : t === 0.125 ? '⅛' : t === -0.25 ? '−¼' : t.toFixed(2));

/** The circuit as a garden path: one lane per seed, one bead per action, in order. Tap a bead to remove it. */
export function PathView({ nQubits, seedNames, ops, showGates, disabled, onRemove }: Props) {
  const lingo = useLingo();
  const quantum = lingo.mode === 'quantum';
  return (
    <div className="path" role="group" aria-label={lingo.pathHint}>
      {!disabled && ops.length > 0 && <p className="path__hint">{lingo.pathHint}</p>}
      {Array.from({ length: nQubits }, (_, q) => (
        <div key={q} className="path__lane">
          <span className="path__seed">{seedNames[q]}{showGates && !quantum && <small> q[{q}]</small>}</span>
          <div className="path__beads">
            {ops.length === 0 && q === 0 && <span className="path__empty">{lingo.pathEmpty}</span>}
            {ops.map((op, i) => {
              const onLane = op.op === 'link' ? op.control === q || op.target === q : op.q === q;
              if (!onLane) return <span key={i} className="path__gap" aria-hidden="true" />;
              const a = ACTIONS[op.op];
              const role = op.op === 'link' ? (op.control === q ? 'control' : 'target') : '';
              const verb = lingo.verbs[op.op];
              const text = op.op === 'twist' ? (quantum ? `P(${TURN_MATH[String(op.turns)] ?? turnsLabel(op.turns)})` : `${verb} ${turnsLabel(op.turns)}`) : op.op === 'link' ? `${lingo.sync} ${role === 'control' ? '●' : '⊕'}` : verb;
              const gate = op.op === 'link' ? (role === 'control' ? 'CX control' : 'CX target') : a.gate;
              const small = quantum ? (op.op === 'link' ? role : lingo.subs?.[op.op] ?? null) : showGates ? gate : null;
              return (
                <button key={i} type="button" className={`bead bead--${op.op}`} disabled={disabled} onClick={() => onRemove(i)}
                  aria-label={`Step ${i + 1}: ${text}${small ? ` (${small})` : ''} on ${seedNames[q]}. Remove.`} title={quantum ? 'Remove this gate' : 'Remove this move'}>
                  <span>{text}</span>{small && <small>{small}</small>}
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
