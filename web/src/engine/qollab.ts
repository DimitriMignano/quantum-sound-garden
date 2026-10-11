/**
 * Qollab engine: Qiskit runs in the browser (Pyodide); `backend` is whatever the person picked in Select QPU.
 * main.js imports the Python module `qsg.circuit` and calls it through Pyodide proxies. Everything crosses the
 * boundary as JSON strings. See docs/ARCHITECTURE.md.
 *
 * Two backends are offered inside Qollab:
 *   'qollab'       the device from Select QPU (a real backend.run job)
 *   'statevector'  Qiskit's Statevector computed in Pyodide, shots sampled in the browser (no job)
 * On IonQ backends Qollab allows ONE job per Run, so the challenges use 'statevector' there and the one job is
 * spent only when the person asks for it in the creator. The guard marks the job consumed BEFORE submitting.
 */
import type { BackendDescriptor, Basis, Circuit, EngineInfo, EngineKind, Ideal, NoiseSpec, QuantumEngine, RunResult } from './types';
import { rng, sampleCounts, sampleNoisy } from './statevector';

/** Shape of the Pyodide module proxy for qsg/circuit.py (only what we call). */
export interface CircuitPyModule {
  ideal_json: PyFn;
  qiskit_code: PyFn;
  run_json: PyFn;
  describe_backend_json: PyFn;
  /** the measured circuit as an object, so JavaScript can submit it to `backend.run` itself (see runFromJs) */
  build_circuit_for_run?: PyFn;
  normalize_counts_json?: PyFn;
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
    super('Qollab allows one IonQ job per Run, and this Run has used it. Press Run again in Qollab for another IonQ bloom, or keep blooming on the Qiskit statevector.');
  }
}

/** The last meaningful line of a Pyodide traceback, so a person never meets a wall of red. */
export function shortReason(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|ConnectionError|Connection aborted|POST/i.test(text)) {
    return 'the job could not be submitted from the browser: Qollab blocks POST requests from project code';
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? 'unknown error';
  return last.length > 180 ? last.slice(0, 177) + '…' : last;
}

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} did not answer within ${Math.round(ms / 1000)} s`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });

async function call(fn: PyFn, ...args: unknown[]): Promise<string> {
  const out = fn.callPromising ? await fn.callPromising(...args) : fn(...args);
  if (typeof out === 'string') return out;
  const asString = (out as { toString?: () => string } | null)?.toString?.();
  if (typeof asString === 'string') return asString;
  throw new Error('qsg.circuit returned something that is not a string');
}

export class QollabEngine implements QuantumEngine {
  private device: BackendDescriptor | null = null;
  private jobConsumed = false;
  private seedCounter = 1;

  constructor(private rt: QollabRuntime) {}

  /**
   * Submit the job from JavaScript: `await backend.run(qc, { shots })`, then `await job.result()`. Qollab's runtime
   * proxies a remote (IonQ) job only on this path; the same call made inside Python tries to POST from the sandbox
   * and is blocked. Measured 2026-10-11 on qollab.xyz: 709 ms to an IonQ Aria 1 simulator job, counts returned.
   */
  private async runFromJs(circuit: Circuit, shots: number, basis: Basis): Promise<{ counts: Record<string, number>; shots: number; counts_kind: 'counts' | 'probabilities' }> {
    const build = this.rt.py.build_circuit_for_run, normalize = this.rt.py.normalize_counts_json;
    if (!build?.callPromising || !normalize) throw new Error('the Python module has no build_circuit_for_run');
    const backend = this.rt.backend as { run?: (qc: unknown, opts: { shots: number }) => unknown } | null;
    if (typeof backend?.run !== 'function') throw new Error('backend.run is not a function');
    const qc = await build.callPromising(circuit.nQubits, JSON.stringify(circuit.ops), basis);
    const job = (await backend.run(qc, { shots })) as { result: () => unknown };
    const res = (await job.result()) as { get_counts: () => unknown };
    const got = res.get_counts();
    const asJs = (got as { toJs?: () => unknown })?.toJs?.();
    const obj: Record<string, number> = asJs instanceof Map ? Object.fromEntries(asJs as Map<string, number>) : typeof got === 'object' && got !== null ? (got as Record<string, number>) : {};
    const raw = await call(normalize, JSON.stringify(obj), circuit.nQubits, shots);
    return JSON.parse(raw) as { counts: Record<string, number>; shots: number; counts_kind: 'counts' | 'probabilities' };
  }

  private async describe(): Promise<BackendDescriptor> {
    if (this.device) return this.device;
    let name = 'the backend you picked', kind: EngineKind = 'qollab-local', unknown = false;
    try {
      const d = JSON.parse(await call(this.rt.py.describe_backend_json, this.rt.backend)) as { name: string; kind: string };
      name = d.name;
      if (d.kind === 'ionq-simulator' || d.kind === 'ionq-qpu') kind = 'qollab-ionq';
      else if (d.kind === 'local-noisy') kind = 'qollab-noisy';
      else if (d.kind === 'unknown') { kind = 'qollab-local'; unknown = true; }
    } catch {
      unknown = true;
    }
    const ionq = kind === 'qollab-ionq';
    this.device = {
      id: 'qollab',
      label: ionq ? `IonQ via Qollab (${name})` : kind === 'qollab-noisy' ? `Qollab noise-model simulator (${name})` : unknown ? `Qollab backend (${name})` : `Qollab simulator (${name})`,
      kind,
      qiskit: true,
      noisy: kind === 'qollab-noisy' || ionq,
      remote: ionq,
      available: true,
      oneJobPerRun: ionq,
    };
    return this.device;
  }

  private statevectorBackend(): BackendDescriptor {
    return { id: 'statevector', label: 'Qiskit Statevector in your browser (shots sampled locally)', kind: 'qollab-statevector', qiskit: true, noisy: false, remote: false, available: true };
  }

  async info(): Promise<EngineInfo> {
    const device = await this.describe();
    const sv = this.statevectorBackend();
    return {
      name: 'Qollab',
      backends: device.oneJobPerRun ? [sv, device] : [device, sv],
      defaultBackendId: device.oneJobPerRun ? sv.id : device.id,
      note: device.oneJobPerRun
        ? 'Qiskit runs in your browser on Pyodide. This IonQ backend accepts ONE job per Run, so the challenges bloom on Qiskit’s statevector and the creator can spend the IonQ job when you choose.'
        : 'Qiskit runs in your browser on Pyodide; every Bloom runs on the backend you picked in Select QPU.',
    };
  }

  async ideal(circuit: Circuit): Promise<Ideal> {
    const raw = await call(this.rt.py.ideal_json, circuit.nQubits, JSON.stringify(circuit.ops), circuit.basis ?? 'z');
    const r = JSON.parse(raw) as { probabilities: Record<string, number>; amplitudes: Record<string, [number, number]>; gate_count: number; depth: number };
    return { nQubits: circuit.nQubits, probabilities: r.probabilities, amplitudes: r.amplitudes, gateCount: r.gate_count, depth: r.depth, source: 'qiskit' };
  }

  async qiskitCode(circuit: Circuit, shots: number): Promise<string> {
    return call(this.rt.py.qiskit_code, circuit.nQubits, JSON.stringify(circuit.ops), shots, circuit.basis ?? 'z');
  }

  /** What the challenges should use by default on this device. */
  async defaultBackendId(): Promise<string> { return (await this.info()).defaultBackendId; }

  async run(circuit: Circuit, shots: number, backendId?: string, noise?: NoiseSpec): Promise<RunResult> {
    const device = await this.describe();
    const t0 = performance.now();
    const basis: Basis = circuit.basis ?? 'z';
    const id = backendId ?? (device.oneJobPerRun ? 'statevector' : 'qollab');
    const random = rng(Date.now() ^ (this.seedCounter++ * 7919));

    if (noise && (id === 'statevector' || !device.noisy)) {
      // Noisy garden with no provider noise in play (an ideal device, or the no-job statevector path on an IonQ
      // device): the noise is simulated in-app (stochastic Pauli model) and SAID so.
      const counts = sampleNoisy(circuit, shots, noise, random);
      return { counts, shots, countsKind: 'counts', backend: { ...this.statevectorBackend(), id: 'statevector+noise', label: 'Browser math with in-app noise (not a Qiskit run)', qiskit: false, noisy: true }, elapsedMs: Math.round(performance.now() - t0), simulatedNoise: noise, basis };
    }
    if (id === 'statevector') {
      const ideal = await this.ideal(circuit); // Qiskit computes the state; the shots are sampled here
      const counts = sampleCounts(ideal.probabilities, shots, random);
      return { counts, shots, countsKind: 'counts', backend: this.statevectorBackend(), elapsedMs: Math.round(performance.now() - t0), basis };
    }
    if (device.oneJobPerRun) {
      if (this.jobConsumed) throw new OneJobLimitError();
      this.jobConsumed = true; // before submitting: a failed result must not trigger a second submission
    }
    try {
      let r: { counts: Record<string, number>; shots: number; counts_kind: 'counts' | 'probabilities' };
      try {
        r = await withTimeout(this.runFromJs(circuit, shots, basis), 180_000, device.label);
      } catch (eJs) {
        if (device.remote) throw eJs; // a remote job is only ever proxied on the JavaScript path
        // a local simulator: the Python path (backend.run inside run_json) works there too
        const raw = await withTimeout(call(this.rt.py.run_json, this.rt.backend, circuit.nQubits, JSON.stringify(circuit.ops), shots, basis), 120_000, device.label);
        r = JSON.parse(raw) as typeof r;
      }
      return { counts: r.counts, shots: r.shots, countsKind: r.counts_kind, backend: device, elapsedMs: Math.round(performance.now() - t0), basis };
    } catch (e) {
      if (!device.remote) throw new Error(`${device.label} could not run the circuit: ${shortReason(e)}`);
      // A remote job that never left the sandbox (Qollab allows project code only GET requests) spent nothing: free the
      // guard, answer from Qiskit's statevector, and SAY what was requested and why it fell back.
      this.jobConsumed = false;
      const ideal = await this.ideal(circuit);
      const counts = sampleCounts(ideal.probabilities, shots, random);
      return { counts, shots, countsKind: 'counts', backend: this.statevectorBackend(), elapsedMs: Math.round(performance.now() - t0), basis, fallbackFrom: device.label, fallbackReason: shortReason(e) };
    }
  }
}
