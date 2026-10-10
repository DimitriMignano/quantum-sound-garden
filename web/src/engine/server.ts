/** Local FastAPI + Qiskit server engine (standalone app and development). */
import type { BackendDescriptor, Circuit, EngineInfo, EngineKind, Ideal, NoiseSpec, QuantumEngine, RunResult } from './types';
import { previewIdeal } from './browser';
import { sampleNoisy, rng } from './statevector';

interface ServerBackend {
  id: string; label: string; kind: string; produced_by: string; noisy: boolean; remote: boolean; available: boolean; reason: string | null;
}

const KIND_MAP: Record<string, EngineKind> = {
  'local-ideal': 'server-local',
  'local-noisy': 'server-local-noisy',
  'ionq-ideal': 'server-ionq',
  'ionq-noisy': 'server-ionq-noisy',
};

function toDescriptor(b: ServerBackend): BackendDescriptor {
  return { id: b.id, label: b.label, kind: KIND_MAP[b.kind] ?? 'server-local', qiskit: true, noisy: b.noisy, remote: b.remote, available: b.available, reason: b.reason ?? undefined };
}

export class ServerEngine implements QuantumEngine {
  constructor(private base = '') {}

  static async probe(base = '', timeoutMs = 1500): Promise<ServerEngine | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(`${base}/api/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const body = await r.json();
      return body?.ok ? new ServerEngine(base) : null;
    } catch {
      return null;
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(`${this.base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      let detail = `${r.status}`;
      try { detail = (await r.json()).detail ?? detail; } catch { /* keep status */ }
      throw new Error(`quantum server: ${detail}`);
    }
    return r.json() as Promise<T>;
  }

  async info(): Promise<EngineInfo> {
    const r = await fetch(`${this.base}/api/backends`);
    const list = (await r.json()) as ServerBackend[];
    const backends = list.map(toDescriptor);
    return {
      name: 'Local Qiskit server',
      backends,
      defaultBackendId: 'local-ideal',
      note: 'Circuits are built and run by Qiskit on this computer (Aer). IonQ backends run on IonQ’s cloud when the server has an IonQ key.',
    };
  }

  async ideal(circuit: Circuit): Promise<Ideal> {
    const r = await this.post<{ probabilities: Record<string, number>; amplitudes: Record<string, [number, number]>; gate_count: number; depth: number }>(
      '/api/ideal', { n_qubits: circuit.nQubits, ops: circuit.ops, basis: circuit.basis ?? 'z' });
    return { nQubits: circuit.nQubits, probabilities: r.probabilities, amplitudes: r.amplitudes, gateCount: r.gate_count, depth: r.depth, source: 'qiskit' };
  }

  async qiskitCode(circuit: Circuit, shots: number): Promise<string> {
    const r = await this.post<{ qiskit_code: string }>('/api/ideal', { n_qubits: circuit.nQubits, ops: circuit.ops, basis: circuit.basis ?? 'z' });
    return r.qiskit_code.replace(/shots=\d+/, `shots=${shots}`);
  }

  async run(circuit: Circuit, shots: number, backendId = 'local-ideal', noise?: NoiseSpec): Promise<RunResult> {
    // The server has its own Aer noise presets; a request for in-app noise on top is honored only on the browser engine.
    // When the caller asks for teaching noise and picked an ideal server backend, route to the Aer teaching preset.
    const id = noise && backendId === 'local-ideal' ? 'local-noisy-teaching' : backendId;
    const r = await this.post<{
      counts: Record<string, number>; shots: number; counts_kind: 'counts' | 'probabilities'; elapsed_ms: number;
      backend: ServerBackend; fallback_from: string | null; fallback_reason: string | null; memory: string[] | null; basis: 'z' | 'x';
    }>('/api/run', { n_qubits: circuit.nQubits, ops: circuit.ops, shots, backend_id: id, basis: circuit.basis ?? 'z' });
    return {
      counts: r.counts,
      shots: r.shots,
      countsKind: r.counts_kind,
      backend: toDescriptor(r.backend),
      elapsedMs: r.elapsed_ms,
      fallbackFrom: r.fallback_from ?? undefined,
      fallbackReason: r.fallback_reason ?? undefined,
      memory: r.memory ?? undefined,
      basis: r.basis ?? 'z',
    };
  }

  /** Browser preview is still used for instant visuals; exposed for symmetry with the other engines. */
  preview(circuit: Circuit): Ideal { return previewIdeal(circuit); }
  /** Unused here; kept so the noise helper is tree-shaken consistently across engines. */
  protected _noisyPreview(circuit: Circuit, shots: number, noise: NoiseSpec) { return sampleNoisy(circuit, shots, noise, rng(1)); }
}
