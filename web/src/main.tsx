import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEngine } from './engine';
import { App } from './app/App';
import './styles.css';

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
