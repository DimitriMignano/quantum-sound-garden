import { useState, type ReactNode } from 'react';
import type { Op } from '../engine/types';
import { ACTIONS } from '../content/content';
import { PathView } from './PathView';

interface Props {
  seedNames: string[];
  allowed: Array<Op['op']>;
  ops: Op[];
  disabled?: boolean;
  showGates: boolean;
  /** twist amounts offered, in turns (default half and quarter) */
  turns?: number[];
  onAdd(op: Op): void;
  onRemove(index: number): void;
  onReset(): void;
  bloom: { label: string; onClick(): void; disabled?: boolean };
  /** buttons that sit next to Bloom (Replay, Stop) */
  extra?: ReactNode;
}

const TURN: Record<string, { label: string; math: string }> = {
  '0.5': { label: '½', math: 'π' }, '0.25': { label: '¼', math: 'π/2' }, '0.125': { label: '⅛', math: 'π/4' }, '-0.25': { label: '−¼', math: '−π/2' },
};

/** The board: which track, the four moves, Play, and the mix as beads underneath. Every mix is a circuit. */
export function Board({ seedNames, allowed, ops, disabled, showGates, turns = [0.5, 0.25], onAdd, onRemove, onReset, bloom, extra }: Props) {
  const [seed, setSeed] = useState(0);
  const [turn, setTurn] = useState(turns[0]);
  const n = seedNames.length;
  const other = n > 1 ? (seed + 1) % n : seed;

  const move = (kind: Op['op'], op: Op) => {
    if (!allowed.includes(kind)) return null;
    const a = ACTIONS[kind];
    return (
      <button key={kind} type="button" className={`move move--${kind}`} disabled={disabled} onClick={() => onAdd(op)} title={a.what} aria-label={`${a.verb}${showGates ? `, the ${a.gate} gate` : ''}: ${a.what}`}>
        <span className="move__verb">{a.verb}</span>
        {kind === 'link' && n > 1 && <span className="move__sub">to {seedNames[other]}</span>}
        {kind === 'twist' && <span className="move__sub">{TURN[String(turn)]?.label ?? turn} turn</span>}
        {showGates && <span className="move__gate">{a.gate}</span>}
      </button>
    );
  };

  return (
    <div className="board">
      {n > 1 && (
        <div className="board__seeds" role="group" aria-label="Which track the next move applies to">
          <span className="label">Moves apply to</span>
          {seedNames.map((name, i) => (
            <button key={i} type="button" className={`chip${seed === i ? ' is-on' : ''}`} aria-pressed={seed === i} disabled={disabled} onClick={() => setSeed(i)}>{name}</button>
          ))}
        </div>
      )}
      <div className="board__moves">
        {move('flip', { op: 'flip', q: seed })}
        {move('split', { op: 'split', q: seed })}
        {allowed.includes('twist') && (
          <div className="move-group">
            {move('twist', { op: 'twist', q: seed, turns: turn })}
            <div className="move-group__amounts" role="group" aria-label="Twist amount">
              {turns.map((t) => (
                <button key={t} type="button" className={`chip chip--small${turn === t ? ' is-on' : ''}`} aria-pressed={turn === t} disabled={disabled} onClick={() => setTurn(t)}
                  title={`${TURN[String(t)]?.label ?? t} turn${showGates ? ` (${TURN[String(t)]?.math})` : ''}`}>
                  {TURN[String(t)]?.label ?? t}{showGates && <small> {TURN[String(t)]?.math}</small>}
                </button>
              ))}
            </div>
          </div>
        )}
        {n > 1 && move('link', { op: 'link', control: seed, target: other })}
        <div className="board__bloom">
          <button type="button" className="primary bloom" onClick={bloom.onClick} disabled={disabled || bloom.disabled}>{bloom.label}</button>
          {extra}
        </div>
      </div>
      <PathView nQubits={n} seedNames={seedNames} ops={ops} showGates={showGates} disabled={disabled} onRemove={onRemove} />
      {ops.length > 0 && <div className="board__foot"><button type="button" className="linklike" disabled={disabled} onClick={onReset}>Start over</button></div>}
    </div>
  );
}
