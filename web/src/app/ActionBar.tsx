import { useState } from 'react';
import type { Op } from '../engine/types';
import { ACTIONS } from '../content/content';

interface Props {
  nQubits: number;
  seedNames: string[];
  allowed: Array<Op['op']>;
  disabled?: boolean;
  showGates: boolean;
  onAdd(op: Op): void;
}

const TURNS = [
  { v: 0.5, label: '½ turn', math: 'π' },
  { v: 0.25, label: '¼ turn', math: 'π/2' },
  { v: 0.125, label: '⅛ turn', math: 'π/4' },
  { v: -0.25, label: '−¼ turn', math: '−π/2' },
];

/** The four garden actions (plus Flip) as big buttons; a seed picker when there is more than one seed. */
export function ActionBar({ nQubits, seedNames, allowed, disabled, showGates, onAdd }: Props) {
  const [seed, setSeed] = useState(0);
  const [turns, setTurns] = useState(0.5);
  const [target, setTarget] = useState(nQubits > 1 ? 1 : 0);
  const otherSeeds = seedNames.map((_, i) => i).filter((i) => i !== seed);
  const safeTarget = otherSeeds.includes(target) ? target : otherSeeds[0] ?? 0;

  const btn = (kind: Op['op'], op: Op) => {
    if (!allowed.includes(kind)) return null;
    const a = ACTIONS[kind];
    return (
      <button key={kind} type="button" className={`action action--${kind}`} disabled={disabled} onClick={() => onAdd(op)} title={a.what} aria-label={`${a.verb}${showGates ? `, the ${a.gate} gate` : ''}: ${a.what}`}>
        <span className="action__verb">{a.verb}</span>
        {showGates && <span className="action__gate">{a.gate}</span>}
      </button>
    );
  };

  return (
    <div className="actionbar">
      {nQubits > 1 && (
        <div className="actionbar__row" role="group" aria-label="Which seed">
          <span className="label">Seed</span>
          {seedNames.map((n, i) => (
            <button key={i} type="button" className={`chip${seed === i ? ' is-on' : ''}`} aria-pressed={seed === i} onClick={() => setSeed(i)}>{n}</button>
          ))}
        </div>
      )}
      <div className="actionbar__row actionbar__actions">
        {btn('flip', { op: 'flip', q: seed })}
        {btn('split', { op: 'split', q: seed })}
        {btn('twist', { op: 'twist', q: seed, turns })}
        {nQubits > 1 && btn('link', { op: 'link', control: seed, target: safeTarget })}
      </div>
      {allowed.includes('twist') && (
        <div className="actionbar__row" role="group" aria-label="Twist amount">
          <span className="label">Twist by</span>
          {TURNS.map((t) => (
            <button key={t.v} type="button" className={`chip${turns === t.v ? ' is-on' : ''}`} aria-pressed={turns === t.v} onClick={() => setTurns(t.v)}>
              {t.label}{showGates && <small> {t.math}</small>}
            </button>
          ))}
        </div>
      )}
      {nQubits > 1 && allowed.includes('link') && otherSeeds.length > 0 && (
        <div className="actionbar__row" role="group" aria-label="Link target">
          <span className="label">Link {seedNames[seed]} to</span>
          {otherSeeds.map((i) => (
            <button key={i} type="button" className={`chip${safeTarget === i ? ' is-on' : ''}`} aria-pressed={safeTarget === i} onClick={() => setTarget(i)}>{seedNames[i]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
