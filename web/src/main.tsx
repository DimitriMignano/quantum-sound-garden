import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEngine } from './engine';
import { App } from './app/App';
import { audio } from './audio/engine';
import './styles.css';

// dev only: lets a browser session ask "is sound actually coming out?" (window.__QSG_AUDIO__.level())
if (import.meta.env.DEV) (window as unknown as { __QSG_AUDIO__: unknown }).__QSG_AUDIO__ = audio;

const rootEl = document.getElementById('qsg-root');
if (!rootEl) throw new Error('#qsg-root missing');
const root = createRoot(rootEl);
root.render(<p className="qsg-boot">Waking the garden…</p>);
createEngine().then((engine) => {
  root.render(
    <StrictMode>
      <App engine={engine} />
    </StrictMode>,
  );
});
