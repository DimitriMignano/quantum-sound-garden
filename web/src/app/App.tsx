import { useEffect, useState } from 'react';
import type { EngineInfo, QuantumEngine } from '../engine/types';
import { audio } from '../audio/engine';
import { APP, CHALLENGES } from '../content/content';
import { TopBar } from './TopBar';
import { ChallengeScene } from './ChallengeScene';
import { CreatorScene } from './CreatorScene';

interface Props { engine: QuantumEngine }

export function App({ engine }: Props) {
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [scene, setScene] = useState<string>('welcome');
  const [unlocked, setUnlocked] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [audioOk, setAudioOk] = useState<boolean | null>(null);

  useEffect(() => { engine.info().then(setInfo).catch(() => setInfo(null)); }, [engine]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const fn = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const enter = async () => {
    const ok = await audio.start();
    setAudioOk(ok);
    // #c3 or #creator in the URL opens that scene directly (for demos and testing); the gesture is still required.
    const hash = window.location.hash.replace('#', '');
    if (/^c[1-4]$/.test(hash) || hash === 'creator') { setUnlocked(CHALLENGES.length); setScene(hash); return; }
    setScene('c1');
  };

  const goNext = (index: number) => {
    const next = index + 1;
    setUnlocked((u) => Math.max(u, next));
    setScene(next > CHALLENGES.length ? 'creator' : `c${next}`);
  };

  return (
    <div className={`app${reducedMotion ? ' is-still' : ''}`} data-scene={scene}>
      <TopBar info={info} scene={scene} onScene={setScene} reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} unlocked={unlocked} />
      {scene === 'welcome' && (
        <main className="welcome">
          <div className="welcome__card">
            <p className="eyebrow">A learning and creation experience</p>
            <h2>{APP.tagline}</h2>
            <p>Four short challenges teach superposition, entanglement, interference and noise by ear, through rain, thunder, footsteps and birds. Then a creator mode makes your own soundscape and shows the Qiskit code behind it.</p>
            <p className="honesty">{APP.honesty}</p>
            <button type="button" className="primary primary--big" onClick={enter}>{APP.startButton}</button>
            <p className="help">{APP.startHint}</p>
            {info && <p className="help">Quantum engine: <b>{info.name}</b>. {info.note}</p>}
            {audioOk === false && <p className="error" role="alert">Audio could not start in this browser. The garden still works visually.</p>}
          </div>
        </main>
      )}
      {CHALLENGES.map((c) => scene === `c${c.index}` && (
        <main key={c.id}>
          <ChallengeScene engine={engine} challenge={c} reducedMotion={reducedMotion} onNext={() => goNext(c.index)} isLast={c.index === CHALLENGES.length} />
        </main>
      ))}
      {scene === 'creator' && info && (
        <main>
          <CreatorScene engine={engine} backends={info.backends} defaultBackendId={info.defaultBackendId} reducedMotion={reducedMotion} />
        </main>
      )}
      {scene === 'creator' && !info && <main><p className="help">Loading the quantum engine…</p></main>}
      <footer className="footer">
        <span>This effort is supported by Qollab &amp; IonQ.</span>
        <span>MIT licensed. Sounds are procedural (no recordings). {APP.honesty}</span>
      </footer>
    </div>
  );
}
