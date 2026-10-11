import { useState, type ReactNode } from 'react';
import type { Op } from '../engine/types';
import { ACTIONS } from '../content/content';
import { PathView } from './PathView';
import { useLingo } from './lingo';

interface Props {
  seedNames: string[];
  allowed: Array<Op['op']>;
  ops: Op[];
  disabled?: boolean;
  showGates: boolean;
  /** twist amounts offered, in turns (default half and quarter) */
  turns?: number[];
  /** per track: true when the track is steady (always one sound), so a Turn would do nothing */
  steady?: boolean[];
  /** change the amount of an existing Turn (index into ops); with this, the amount chips act as a live dial */
  onRetune?(index: number, turns: number): void;
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
export function Board({ seedNames, allowed, ops, disabled, showGates, turns = [0.5, 0.25], steady, onAdd, onRemove, onReset, onRetune, bloom, extra }: Props) {
  const lingo = useLingo();
  const quantum = lingo.mode === 'quantum';
  const math = showGates || quantum; // the amounts carry their angle whenever the gates are in view
  const [seed, setSeed] = useState(0);
  const [turn, setTurn] = useState(turns[0]);
  const n = seedNames.length;
  const other = n > 1 ? (seed + 1) % n : seed;
  // the last Turn on the selected track, if any: the amount chips then turn that dial live
  let lastTurn = -1;
  ops.forEach((o, i) => { if (o.op === 'twist' && o.q === seed) lastTurn = i; });
  const dial = lastTurn >= 0 && onRetune ? (ops[lastTurn] as { turns: number }).turns : turn;
  const pick = (t: number) => { setTurn(t); if (lastTurn >= 0 && onRetune) onRetune(lastTurn, t); };

  const move = (kind: Op['op'], op: Op) => {
    if (!allowed.includes(kind)) return null;
    const a = ACTIONS[kind];
    const verb = lingo.verbs[kind], what = lingo.whats[kind], sub = lingo.subs?.[kind];
    return (
      <button key={kind} type="button" className={`move move--${kind}`} disabled={disabled} onClick={() => onAdd(op)} title={what} aria-label={`${verb}${showGates && !quantum ? `, the ${a.gate} gate` : ''}: ${what}`}>
        <span className="move__verb">{verb}</span>
        {kind === 'link' && n > 1 && <span className="move__sub">to {seedNames[other]}</span>}
        {sub && <span className="move__sub">{sub}</span>}
        {showGates && !quantum && <span className="move__gate">{a.gate}</span>}
      </button>
    );
  };

  // Turn is one card: the move on top, its amounts inside it. Tapping an amount sets the next Turn, or retunes the last one.
  const dialCard = () => {
    const a = ACTIONS.twist;
    const verb = lingo.verbs.twist, what = lingo.whats.twist, sub = lingo.subs?.twist;
    const warn = Boolean(steady?.[seed]);
    const label = TURN[String(turn)]?.label ?? String(turn);
    return (
      <div className={`move move--twist move--dial${disabled ? ' is-disabled' : ''}`} style={{ flexGrow: 1 + 0.7 * Math.max(0, turns.length - 2) }}>
        <button type="button" className="move__face" disabled={disabled} onClick={() => onAdd({ op: 'twist', q: seed, turns: turn })} title={what}
          aria-label={`${verb} by ${label}${showGates && !quantum ? `, the ${a.gate} gate` : ''}: ${what}`}>
          <span className="move__verb">{verb}</span>
          {sub && <span className="move__sub">{sub}</span>}
          {warn && <span className="move__sub move__sub--warn">{quantum ? 'no effect: the qubit is in a basis state' : 'no effect: track is steady'}</span>}
          {showGates && !quantum && <span className="move__gate">{a.gate}</span>}
        </button>
        <div className="move__amounts" role="group" aria-label={lastTurn >= 0 && onRetune ? 'Turn amount (changes the Turn on this track)' : 'Turn amount'}>
          {turns.map((t) => (
            <button key={t} type="button" className={`chip chip--small${dial === t ? ' is-on' : ''}`} aria-pressed={dial === t} disabled={disabled} onClick={() => pick(t)}
              title={`${TURN[String(t)]?.label ?? t} turn${lastTurn >= 0 && onRetune ? ' (turns the dial already on this track)' : ''}${math ? ` (${TURN[String(t)]?.math})` : ''}`}>
              {TURN[String(t)]?.label ?? t}{math && <small> {TURN[String(t)]?.math}</small>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="board">
      {n > 1 && (
        <div className="board__seeds" role="group" aria-label="Which track the next move applies to">
          <span className="label">{lingo.applyTo}</span>
          {seedNames.map((name, i) => (
            <button key={i} type="button" className={`chip${seed === i ? ' is-on' : ''}`} aria-pressed={seed === i} disabled={disabled} onClick={() => setSeed(i)}>{name}</button>
          ))}
        </div>
      )}
      <div className="board__moves">
        {move('flip', { op: 'flip', q: seed })}
        {move('split', { op: 'split', q: seed })}
        {allowed.includes('twist') && dialCard()}
        {n > 1 && move('link', { op: 'link', control: seed, target: other })}
        <div className="board__bloom">
          {/* inert rather than disabled while a sound plays, so keyboard focus stays on Play for the next press */}
          <button type="button" className={`primary bloom${disabled || bloom.disabled ? ' is-inert' : ''}`} aria-disabled={disabled || bloom.disabled || undefined}
            onClick={() => { if (!(disabled || bloom.disabled)) bloom.onClick(); }}>{bloom.label}</button>
          {extra}
        </div>
      </div>
      <PathView nQubits={n} seedNames={seedNames} ops={ops} showGates={showGates} disabled={disabled} onRemove={onRemove} />
      {ops.length > 0 && <div className="board__foot"><button type="button" className="linklike" disabled={disabled} onClick={onReset}>Start over</button></div>}
    </div>
  );
}
