import { useEffect, useState } from 'react';
import type { EngineInfo, QuantumEngine } from '../engine/types';
import { audio } from '../audio/engine';
import { APP, CHALLENGES } from '../content/content';
import { TopBar } from './TopBar';
import { Welcome } from './Welcome';
import { TutorialScene } from './TutorialScene';
import { ChallengeScene } from './ChallengeScene';
import { StudioScene } from './StudioScene';

interface Props { engine: QuantumEngine }

export function App({ engine }: Props) {
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [scene, setScene] = useState<string>('welcome');
  const [unlocked, setUnlocked] = useState(1);
  const [details, setDetails] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [audioOk, setAudioOk] = useState<boolean | null>(null);

  useEffect(() => { engine.info().then(setInfo).catch(() => setInfo(null)); }, [engine]);
  // a new scene starts at the top, so its heading and the picture are what you see first
  useEffect(() => { window.scrollTo?.({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [scene]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const fn = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const start = async () => {
    const ok = await audio.start();
    setAudioOk(ok);
    // #learn, #c3 or #studio in the URL opens that scene directly (for demos and testing); the gesture is still required.
    const hash = window.location.hash.replace('#', '');
    if (/^c[1-4]$/.test(hash) || hash === 'studio' || hash === 'learn') { setUnlocked(CHALLENGES.length); setScene(hash); return; }
    setScene('learn');
  };

  const goNext = (index: number) => {
    const next = index + 1;
    setUnlocked((u) => Math.max(u, next));
    setScene(next > CHALLENGES.length ? 'studio' : `c${next}`);
  };

  return (
    <div className={`app${reducedMotion ? ' is-still' : ''}`} data-scene={scene}>
      <TopBar info={info} scene={scene} onScene={setScene} reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} details={details} onDetails={setDetails} unlocked={unlocked} entered={scene !== 'welcome'} />
      {scene === 'welcome' && <Welcome info={info} reducedMotion={reducedMotion} audioOk={audioOk} onStart={start} />}
      {scene === 'learn' && (
        <main><TutorialScene engine={engine} reducedMotion={reducedMotion} details={details} onDone={() => setScene('c1')} /></main>
      )}
      {CHALLENGES.map((c) => scene === `c${c.index}` && (
        <main key={c.id}>
          <ChallengeScene engine={engine} challenge={c} reducedMotion={reducedMotion} details={details} onNext={() => goNext(c.index)} onSolved={() => setUnlocked((u) => Math.max(u, c.index + 1))} isLast={c.index === CHALLENGES.length} />
        </main>
      ))}
      {scene === 'studio' && info && (
        <main>
          <StudioScene engine={engine} backends={info.backends} defaultBackendId={info.defaultBackendId} reducedMotion={reducedMotion} details={details} />
        </main>
      )}
      {scene === 'studio' && !info && <main><p className="help">Loading the quantum engine…</p></main>}
      <footer className="footer">
        <span>This effort is supported by Qollab &amp; IonQ.</span>
        <span>MIT licensed. Sounds are procedural (no recordings). {APP.honesty}</span>
      </footer>
    </div>
  );
}
