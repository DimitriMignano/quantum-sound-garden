/**
 * Qollab entry. Qollab resolves `qsg.circuit` to qollab/qsg/circuit.py (Pyodide) and pre-creates `backend`
 * from the Select QPU dialog. We hand both to the app through one global, then start it.
 *
 * A JS project's Run ends when this module returns, and Qollab relays a remote (IonQ) job only while the Run is open.
 * So the module waits on `runOpen` until the engine releases it: at once on a local simulator, after the one job has
 * come back on IonQ (see QollabEngine). Qollab's docs: "A run has no time limit. Stop ends it."
 */
import * as circuitPy from 'qsg.circuit';
import type { CircuitPyModule } from './engine/qollab';

declare const backend: unknown;

const chosen: unknown = typeof backend !== 'undefined' ? backend : (globalThis as { backend?: unknown }).backend;
let releaseRun = () => {};
const runOpen = new Promise<void>((resolve) => { releaseRun = resolve; });
window.__QSG_QOLLAB__ = { py: circuitPy as unknown as CircuitPyModule, backend: chosen, releaseRun };

await import('./main');
if (chosen !== undefined) await runOpen; // without a backend the app uses another engine, which never releases
