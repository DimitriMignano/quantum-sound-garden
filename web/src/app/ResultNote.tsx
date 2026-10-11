import type { RunResult } from '../engine/types';
import { BACKEND_NOTES } from '../content/content';

/** The honest line under every measured result: who produced it, and any fallback. */
export function ResultNote({ result }: { result: RunResult }) {
  const b = result.backend;
  return (
    <p className="resultnote">
      <span className={`pill pill--${b.qiskit ? (b.remote ? 'ionq' : 'qiskit') : 'browser'}`}>{b.label}</span>
      {' '}{result.shots} shots in {result.elapsedMs} ms.
      {result.fallbackFrom && <> {BACKEND_NOTES.fallback(result.fallbackFrom, result.fallbackReason ?? 'unknown', b.label)}</>}
      {result.countsKind === 'probabilities' && <> {BACKEND_NOTES.probabilities}</>}
      {result.simulatedNoise && <> Noise: {result.simulatedNoise.label}.</>}
      {!b.qiskit && !result.simulatedNoise && <> {BACKEND_NOTES.browser}</>}
    </p>
  );
}
