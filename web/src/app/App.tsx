import { useEffect, useState } from 'react';
import type { EngineInfo, QuantumEngine } from '../engine/types';
import { audio } from '../audio/engine';
import { APP, CHALLENGES } from '../content/content';
import { TopBar } from './TopBar';
import { MovesScene } from './MovesScene';
import { ChallengeScene } from './ChallengeScene';
import { CreatorScene } from './CreatorScene';

interface Props { engine: QuantumEngine }

export function App({ engine }: Props) {
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [scene, setScene] = useState<string>('welcome');
  const [unlocked, setUnlocked] = useState(1);
  const [details, setDetails] = useState(false);
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
    // #moves, #c3 or #creator in the URL opens that scene directly (for demos and testing); the gesture is still required.
    const hash = window.location.hash.replace('#', '');
    if (/^c[1-4]$/.test(hash) || hash === 'creator' || hash === 'moves') { setUnlocked(CHALLENGES.length); setScene(hash); return; }
    setScene('moves');
  };

  const goNext = (index: number) => {
    const next = index + 1;
    setUnlocked((u) => Math.max(u, next));
    setScene(next > CHALLENGES.length ? 'creator' : `c${next}`);
  };

  return (
    <div className={`app${reducedMotion ? ' is-still' : ''}`} data-scene={scene}>
      <TopBar info={info} scene={scene} onScene={setScene} reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} details={details} onDetails={setDetails} unlocked={unlocked} entered={scene !== 'welcome'} />
      {scene === 'welcome' && (
        <main className="welcome">
          <div className="welcome__card">
            <p className="eyebrow">A sound garden grown from quantum circuits</p>
            <h2>{APP.tagline}</h2>
            <p className="welcome__lead">{APP.lead}</p>
            <button type="button" className="primary primary--big" onClick={enter}>{APP.startButton}</button>
            <p className="help">{APP.startHint}</p>
            {audioOk === false && <p className="error" role="alert">Audio could not start in this browser. The garden still works visually.</p>}
            <details className="howto">
              <summary>What you are actually hearing</summary>
              <p className="honesty">{APP.honesty}</p>
              {info && <p className="help">Quantum engine: <b>{info.name}</b>. {info.note}</p>}
              <p className="help">Press Circuit in the top bar at any time to see gate names, bits, percentages and the Qiskit code behind every garden.</p>
            </details>
          </div>
        </main>
      )}
      {scene === 'moves' && (
        <main><MovesScene engine={engine} reducedMotion={reducedMotion} details={details} onDone={() => setScene('c1')} /></main>
      )}
      {CHALLENGES.map((c) => scene === `c${c.index}` && (
        <main key={c.id}>
          <ChallengeScene engine={engine} challenge={c} reducedMotion={reducedMotion} details={details} onNext={() => goNext(c.index)} onSolved={() => setUnlocked((u) => Math.max(u, c.index + 1))} isLast={c.index === CHALLENGES.length} />
        </main>
      ))}
      {scene === 'creator' && info && (
        <main>
          <CreatorScene engine={engine} backends={info.backends} defaultBackendId={info.defaultBackendId} reducedMotion={reducedMotion} details={details} />
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
