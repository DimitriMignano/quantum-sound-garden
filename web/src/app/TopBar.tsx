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
  unlocked: number; // how many challenges are reachable
}

export function TopBar({ info, scene, onScene, reducedMotion, onReducedMotion, unlocked }: Props) {
  const [, force] = useState(0);
  useEffect(() => audio.onChange(() => force((n) => n + 1)), []);
  const b = info?.backends.find((x) => x.id === info.defaultBackendId) ?? info?.backends[0];
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        <h1>{APP.title}</h1>
      </div>
      <nav className="topbar__nav" aria-label="Scenes">
        {[1, 2, 3, 4].map((i) => (
          <button key={i} type="button" className={`navbtn${scene === `c${i}` ? ' is-on' : ''}`} aria-current={scene === `c${i}` ? 'page' : undefined} disabled={i > unlocked} onClick={() => onScene(`c${i}`)} title={i > unlocked ? 'Finish the previous challenge first' : `Challenge ${i}`}>{i}</button>
        ))}
        <button type="button" className={`navbtn navbtn--wide${scene === 'creator' ? ' is-on' : ''}`} aria-current={scene === 'creator' ? 'page' : undefined} onClick={() => onScene('creator')}>Creator</button>
      </nav>
      <div className="topbar__tools">
        {b && <span className={`pill pill--${b.qiskit ? (b.remote ? 'ionq' : 'qiskit') : 'browser'}`} title={info?.note}>{b.label}</span>}
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
