/**
 * A Pyodide-shaped stand-in for qollab/qsg/circuit.py, used only by the built-bundle smoke test. It answers with
 * the same JSON strings the Python module returns, computed by the TypeScript statevector, and exposes
 * `callPromising` like a Pyodide function proxy. The fake `backend` records what the bundle asked it to run.
 */
import { probabilities, amplitudes, simulate, sampleCounts, rng } from '../engine/statevector';
import { qiskitCode } from '../engine/code';
import type { Op } from '../engine/types';

export const calls: Array<{ fn: string; args: unknown[] }> = [];

function withPromising<T extends (...a: never[]) => unknown>(name: string, fn: T) {
  const wrapped = ((...args: unknown[]) => { calls.push({ fn: name, args }); return (fn as (...a: unknown[]) => unknown)(...args); }) as unknown as T & { callPromising: (...a: unknown[]) => Promise<unknown> };
  wrapped.callPromising = async (...args: unknown[]) => { calls.push({ fn: `${name}.callPromising`, args }); return (fn as (...a: unknown[]) => unknown)(...args); };
  return wrapped;
}

export const ideal_json = withPromising('ideal_json', (n: number, opsJson: string, basis = 'z') => {
  const ops = JSON.parse(opsJson) as Op[];
  const s = simulate({ nQubits: n, ops, basis: basis as 'z' | 'x' });
  return JSON.stringify({ n_qubits: n, basis, probabilities: probabilities(s), amplitudes: amplitudes(s), depth: ops.length, gate_count: ops.length });
});

export const qiskit_code = withPromising('qiskit_code', (n: number, opsJson: string, shots = 256, basis = 'z') =>
  qiskitCode({ nQubits: n, ops: JSON.parse(opsJson) as Op[], basis: basis as 'z' | 'x' }, shots));

export const run_json = withPromising('run_json', (backend: { name: string; run: (n: number, ops: Op[], shots: number, basis: string) => Record<string, number> }, n: number, opsJson: string, shots = 256, basis = 'z') => {
  const ops = JSON.parse(opsJson) as Op[];
  const counts = backend.run(n, ops, shots, basis);
  return JSON.stringify({ counts, shots, counts_kind: 'counts', backend_name: backend.name, backend_class: 'FakeBackend', basis });
});

export const describe_backend_json = withPromising('describe_backend_json', (backend: { name: string }) =>
  JSON.stringify({ name: backend.name, class: 'BasicSimulator', module: 'qiskit.providers.basic_provider', kind: backend.name.includes('ionq') ? 'ionq-simulator' : 'local-ideal' }));

/** A backend that samples from the statevector, like Qollab's built-in simulator would. */
export function makeFakeBackend(name: string) {
  const random = rng(7);
  return {
    name,
    jobs: 0,
    run(n: number, ops: Op[], shots: number, basis: string) {
      this.jobs++;
      return sampleCounts(probabilities(simulate({ nQubits: n, ops, basis: basis as 'z' | 'x' })), shots, random);
    },
  };
}
