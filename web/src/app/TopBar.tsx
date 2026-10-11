import { useEffect, useState } from 'react';
import type { EngineInfo } from '../engine/types';
import { audio } from '../audio/engine';
import { APP } from '../content/content';

interface Props {
  info: EngineInfo | null;
  scene: string;
  onScene(s: string): void;
  reducedMotion: boolean;
  onReducedMotion(v: boolean): void;
  details: boolean;
  onDetails(v: boolean): void;
  unlocked: number; // how many puzzles are reachable
  entered: boolean; // the gesture happened; the nav works
}

export function TopBar({ info, scene, onScene, reducedMotion, onReducedMotion, details, onDetails, unlocked, entered }: Props) {
  const [, force] = useState(0);
  useEffect(() => audio.onChange(() => force((n) => n + 1)), []);
  const b = info?.backends.find((x) => x.id === info.defaultBackendId) ?? info?.backends[0];
  const nav = (id: string, label: string, locked = false, title?: string) => (
    <button key={id} type="button" className={`navbtn${id === 'learn' || id === 'studio' ? ' navbtn--wide' : ''}${scene === id ? ' is-on' : ''}`} aria-current={scene === id ? 'page' : undefined}
      disabled={!entered || locked} onClick={() => onScene(id)} title={title}>{label}</button>
  );
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        <h1>{APP.title}</h1>
      </div>
      <nav className="topbar__nav" aria-label="Scenes">
        {nav('learn', 'Learn')}
        {[1, 2, 3, 4].map((i) => nav(`c${i}`, String(i), i > unlocked, i > unlocked ? 'Solve the previous puzzle first' : `Puzzle ${i}`))}
        {nav('recap', 'Quantum', unlocked < 5, unlocked < 5 ? 'Solve the four puzzles first' : 'The quantum you used')}
        {nav('studio', 'Studio')}
      </nav>
      <div className="topbar__tools">
        {b && <span className={`pill pill--${b.qiskit ? (b.remote ? 'ionq' : 'qiskit') : 'browser'}`} title={info?.note}>{b.label}</span>}
        <button type="button" className="iconbtn" aria-pressed={details} onClick={() => onDetails(!details)} title="Show the circuit: gate names, bits, percentages and the Qiskit code">{details ? 'Circuit: on' : 'Circuit'}</button>
        <label className="vol" title="Volume">
          <span className="sr-only">Volume</span>
          <input type="range" min={0} max={1} step={0.01} value={audio.volume} onChange={(e) => audio.setVolume(parseFloat(e.target.value))} aria-label="Volume" />
        </label>
        <button type="button" className="iconbtn" aria-pressed={audio.muted} onClick={() => audio.setMuted(!audio.muted)} aria-label={audio.muted ? 'Unmute' : 'Mute'}>{audio.muted ? 'Muted' : 'Sound'}</button>
        <button type="button" className="iconbtn" aria-pressed={reducedMotion} onClick={() => onReducedMotion(!reducedMotion)} aria-label="Reduce motion">{reducedMotion ? 'Still' : 'Motion'}</button>
      </div>
    </header>
  );
}
