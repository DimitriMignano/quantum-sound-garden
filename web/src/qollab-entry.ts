/**
 * Qollab entry. Qollab resolves `qsg.circuit` to qollab/qsg/circuit.py (Pyodide) and pre-creates `backend`
 * from the Select QPU dialog. We hand both to the app through one global, then start it.
 */
import * as circuitPy from 'qsg.circuit';
import type { CircuitPyModule } from './engine/qollab';

declare const backend: unknown;

const chosen: unknown = typeof backend !== 'undefined' ? backend : (globalThis as { backend?: unknown }).backend;
window.__QSG_QOLLAB__ = { py: circuitPy as unknown as CircuitPyModule, backend: chosen };

await import('./main');
