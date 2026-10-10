import type { QuantumEngine } from './types';
import { BrowserEngine } from './browser';
import { ServerEngine } from './server';
import { QollabEngine, type QollabRuntime } from './qollab';

declare global {
  interface Window { __QSG_QOLLAB__?: QollabRuntime; __QSG_API_BASE__?: string }
}

/** Pick the most honest engine available: Qollab (Qiskit in-browser) > local Qiskit server > browser math. */
export async function createEngine(): Promise<QuantumEngine> {
  const rt = typeof window !== 'undefined' ? window.__QSG_QOLLAB__ : undefined;
  if (rt?.py && rt.backend !== undefined) return new QollabEngine(rt);
  const base = (typeof window !== 'undefined' && window.__QSG_API_BASE__) || '';
  const server = await ServerEngine.probe(base);
  if (server) return server;
  return new BrowserEngine();
}

export * from './types';
export { previewIdeal, TEACHING_NOISE } from './browser';
export { OneJobLimitError } from './qollab';
