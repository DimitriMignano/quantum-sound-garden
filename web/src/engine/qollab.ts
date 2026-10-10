/**
 * Qollab engine: Qiskit runs in the browser (Pyodide); `backend` is whatever the person picked in Select QPU.
 * main.js imports the Python module `qsg.circuit` and calls it through Pyodide proxies. Everything crosses the
 * boundary as JSON strings. See docs/ARCHITECTURE.md.
 */
import type { BackendDescriptor, Circuit, EngineInfo, EngineKind, Ideal, NoiseSpec, QuantumEngine, RunResult } from './types';
import { rng, sampleNoisy } from './statevector';

/** Shape of the Pyodide module proxy for qsg/circuit.py (only what we call). */
export interface CircuitPyModule {
  ideal_json: PyFn;
  qiskit_code: PyFn;
  run_json: PyFn;
  describe_backend_json: PyFn;
}
export interface PyFn {
  (...args: unknown[]): unknown;
  callPromising?: (...args: unknown[]) => Promise<unknown>;
}

export interface QollabRuntime {
  py: CircuitPyModule;
  backend: unknown;
}

export class OneJobLimitError extends Error {
  code = 'one-job-limit' as const;
  constructor() {
    super('Qollab allows one IonQ job per Run. Press Run again in Qollab to bloom again, or pick the built-in simulator in Select QPU.');
  }
}

async function call(fn: PyFn, ...args: unknown[]): Promise<unknown> {
  const out = fn.callPromising ? await fn.callPromising(...args) : fn(...args);
  return typeof out === 'string' ? out : (out as { toString(): string })?.toString?.() ?? out;
}

export class QollabEngine implements QuantumEngine {
  private descriptor: BackendDescriptor | null = null;
  private runsDone = 0;

  constructor(private rt: QollabRuntime) {}

  private async describe(): Promise<BackendDescriptor> {
    if (this.descriptor) return this.descriptor;
    let name = 'Qollab backend', kind: EngineKind = 'qollab-local';
    try {
      const d = JSON.parse((await call(this.rt.py.describe_backend_json, this.rt.backend)) as string) as { name: string; kind: string };
      name = d.name;
      kind = d.kind === 'ionq-simulator' || d.kind === 'ionq-qpu' ? 'qollab-ionq' : d.kind === 'local-noisy' ? 'qollab-noisy' : 'qollab-local';
    } catch {
      /* keep defaults */
    }
    const ionq = kind === 'qollab-ionq';
    this.descriptor = {
      id: 'qollab',
      label: ionq ? `IonQ via Qollab (${name})` : kind === 'qollab-noisy' ? `Qollab noise-model simulator (${name})` : `Qollab simulator (${name})`,
      kind,
      qiskit: true,
      noisy: kind !== 'qollab-local',
      remote: ionq,
      available: true,
      oneJobPerRun: ionq,
    };
    return this.descriptor;
  }

  async info(): Promise<EngineInfo> {
    const b = await this.describe();
    return {
      name: 'Qollab',
      backends: [b],
      defaultBackendId: b.id,
      note: b.oneJobPerRun
        ? 'Qiskit runs in your browser; this IonQ backend accepts ONE job per Run, so one Bloom per Run. Pick the built-in simulator for unlimited Blooms.'
        : 'Qiskit runs in your browser on Pyodide; Blooms run on the backend you picked in Select QPU.',
    };
  }

  async ideal(circuit: Circuit): Promise<Ideal> {
    const raw = (await call(this.rt.py.ideal_json, circuit.nQubits, JSON.stringify(circuit.ops))) as string;
    const r = JSON.parse(raw) as { probabilities: Record<string, number>; amplitudes: Record<string, [number, number]>; gate_count: number; depth: number };
    return { nQubits: circuit.nQubits, probabilities: r.probabilities, amplitudes: r.amplitudes, gateCount: r.gate_count, depth: r.depth, source: 'qiskit' };
  }

  async qiskitCode(circuit: Circuit, shots: number): Promise<string> {
    return (await call(this.rt.py.qiskit_code, circuit.nQubits, JSON.stringify(circuit.ops), shots)) as string;
  }

  async run(circuit: Circuit, shots: number, _backendId?: string, noise?: NoiseSpec): Promise<RunResult> {
    const b = await this.describe();
    const t0 = performance.now();
    if (noise && !b.noisy) {
      // The person asked for the noisy teaching garden on an ideal backend: simulate the noise in-app and SAY so.
      const counts = sampleNoisy(circuit, shots, noise, rng(Date.now()));
      return { counts, shots, countsKind: 'counts', backend: { ...b, id: 'qollab+noise', label: `${b.label} + in-app noise`, noisy: true, qiskit: false }, elapsedMs: Math.round(performance.now() - t0), simulatedNoise: noise };
    }
    if (b.oneJobPerRun && this.runsDone >= 1) throw new OneJobLimitError();
    const raw = (await call(this.rt.py.run_json, this.rt.backend, circuit.nQubits, JSON.stringify(circuit.ops), shots)) as string;
    this.runsDone++;
    const r = JSON.parse(raw) as { counts: Record<string, number>; shots: number; counts_kind: 'counts' | 'probabilities'; backend_name: string };
    return { counts: r.counts, shots: r.shots, countsKind: r.counts_kind, backend: b, elapsedMs: Math.round(performance.now() - t0) };
  }
}
