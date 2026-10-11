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
  const call = fn as unknown as (...a: unknown[]) => unknown;
  const wrapped = ((...args: unknown[]) => { calls.push({ fn: name, args }); return call(...args); }) as unknown as T & { callPromising: (...a: unknown[]) => Promise<unknown> };
  wrapped.callPromising = async (...args: unknown[]) => { calls.push({ fn: `${name}.callPromising`, args }); return call(...args); };
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

/** The measured circuit "object": the fake keeps the recipe, and the fake backend samples it. */
export const build_circuit_for_run = withPromising('build_circuit_for_run', (n: number, opsJson: string, basis = 'z') =>
  ({ n, ops: JSON.parse(opsJson) as Op[], basis }));

export const normalize_counts_json = withPromising('normalize_counts_json', (countsJson: string, n: number, shots: number) => {
  const raw = JSON.parse(countsJson) as Record<string, number>;
  const counts: Record<string, number> = {};
  for (let i = 0; i < 2 ** n; i++) { const k = i.toString(2).padStart(n, '0'); counts[k] = raw[k] ?? 0; }
  return JSON.stringify({ counts, shots, counts_kind: 'counts' });
});

export const describe_backend_json = withPromising('describe_backend_json', (backend: { name: string }) =>
  JSON.stringify({ name: backend.name, class: 'BasicSimulator', module: 'qiskit.providers.basic_provider', kind: backend.name.includes('ionq') ? 'ionq-simulator' : 'local-ideal' }));

/** A backend that samples from the statevector, like Qollab's built-in simulator would. Its `run` takes the circuit
 *  object from build_circuit_for_run and `{ shots }`, like the real PyProxy does from JavaScript, and returns a job
 *  whose result's get_counts gives a Map (what a Pyodide dict's toJs gives). */
export function makeFakeBackend(name: string) {
  const random = rng(7);
  return {
    name,
    jobs: 0,
    run(qc: { n: number; ops: Op[]; basis: string }, opts: { shots: number }) {
      this.jobs++;
      const counts = sampleCounts(probabilities(simulate({ nQubits: qc.n, ops: qc.ops, basis: qc.basis as 'z' | 'x' })), opts.shots, random);
      const job = { result: async () => ({ get_counts: () => ({ toJs: () => new Map(Object.entries(counts)) }) }) };
      return Promise.resolve(job);
    },
  };
}
