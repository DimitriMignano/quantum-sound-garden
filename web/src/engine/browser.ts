/** Browser-math engine: TypeScript statevector. Always labeled "not Qiskit". Also the live-preview math everywhere. */
import type { BackendDescriptor, Circuit, EngineInfo, Ideal, NoiseSpec, QuantumEngine, RunResult } from './types';
import { amplitudes, probabilities, rng, sampleCounts, sampleNoisy, simulate } from './statevector';
import { qiskitCode } from './code';

export const BROWSER_BACKEND: BackendDescriptor = {
  id: 'browser',
  label: 'Browser math (not Qiskit)',
  kind: 'browser',
  qiskit: false,
  noisy: false,
  remote: false,
  available: true,
};

export const TEACHING_NOISE: NoiseSpec = { p1: 0.02, p2: 0.06, readout: 0.02, label: 'in-app simulated noise (exaggerated for teaching)' };

export function previewIdeal(circuit: Circuit): Ideal {
  const s = simulate(circuit);
  const gateCount = circuit.ops.length;
  return {
    nQubits: circuit.nQubits,
    probabilities: probabilities(s),
    amplitudes: amplitudes(s),
    gateCount,
    depth: gateCount, // close enough for the preview; Qiskit reports the true depth
    source: 'browser',
  };
}

export class BrowserEngine implements QuantumEngine {
  private seedCounter = 1;
  constructor(private note = 'No quantum engine reachable: results come from in-browser math, not Qiskit.') {}

  async info(): Promise<EngineInfo> {
    return { name: 'Browser math', backends: [BROWSER_BACKEND], defaultBackendId: 'browser', note: this.note };
  }

  async ideal(circuit: Circuit): Promise<Ideal> {
    return previewIdeal(circuit);
  }

  async qiskitCode(circuit: Circuit, shots: number): Promise<string> {
    return qiskitCode(circuit, shots);
  }

  async run(circuit: Circuit, shots: number, _backendId?: string, noise?: NoiseSpec): Promise<RunResult> {
    const t0 = performance.now();
    const random = rng(Date.now() ^ (this.seedCounter++ * 7919));
    const counts = noise ? sampleNoisy(circuit, shots, noise, random) : sampleCounts(probabilities(simulate(circuit)), shots, random);
    return {
      counts,
      shots,
      countsKind: 'counts',
      backend: { ...BROWSER_BACKEND, noisy: !!noise },
      elapsedMs: Math.round(performance.now() - t0),
      simulatedNoise: noise,
    };
  }
}
