/** The circuit the person builds, in garden words. Mirrors server/qsg/circuit.py exactly. */
export type Op =
  | { op: 'flip'; q: number }
  | { op: 'split'; q: number }
  | { op: 'twist'; q: number; turns: number }
  | { op: 'link'; control: number; target: number };

export type OpKind = Op['op'];

export const GATE_NAME: Record<OpKind, string> = {
  flip: 'X',
  split: 'H (Hadamard)',
  twist: 'P(θ) phase',
  link: 'CX (CNOT)',
};

export type Basis = 'z' | 'x';

export interface Circuit {
  nQubits: number;
  ops: Op[];
  /** 'z' (default) measures as usual; 'x' is "Bloom sideways": H on every qubit before measuring. */
  basis?: Basis;
}

/** Exact statevector result before measurement. Keys are Qiskit bitstrings (qubit 0 rightmost). */
export interface Ideal {
  nQubits: number;
  probabilities: Record<string, number>;
  amplitudes: Record<string, [number, number]>;
  gateCount: number;
  depth: number;
  /** Where the numbers came from. */
  source: 'qiskit' | 'browser';
}

export type EngineKind =
  | 'qollab-local' // Qollab's in-browser simulator chosen in Select QPU
  | 'qollab-noisy' // an IBM noise-model simulator chosen in Qollab
  | 'qollab-ionq' // an IonQ cloud simulator (or QPU) chosen in Qollab
  | 'qollab-statevector' // Qiskit Statevector computed in Pyodide, shots sampled in the browser (no backend job)
  | 'server-local' // local Aer through the FastAPI server
  | 'server-local-noisy' // local Aer with a noise preset
  | 'server-ionq' // IonQ cloud simulator through qiskit-ionq
  | 'server-ionq-noisy'
  | 'browser'; // TypeScript math, not Qiskit

export interface BackendDescriptor {
  id: string;
  label: string;
  kind: EngineKind;
  /** True when a real Qiskit object produced the result. */
  qiskit: boolean;
  noisy: boolean;
  remote: boolean;
  available: boolean;
  reason?: string;
  /** Qollab: IonQ backends allow one backend.run per Run. */
  oneJobPerRun?: boolean;
}

export interface RunResult {
  counts: Record<string, number>;
  shots: number;
  /** 'counts' = real shots; 'probabilities' = the backend returned exact probabilities scaled to shots. */
  countsKind: 'counts' | 'probabilities';
  backend: BackendDescriptor;
  elapsedMs: number;
  /** Set when the requested backend could not run and another one produced this result. */
  fallbackFrom?: string;
  fallbackReason?: string;
  /** In-app simulated noise applied (browser engine only). */
  simulatedNoise?: NoiseSpec;
  /** The real per-shot order when the backend provided it (Aer memory); otherwise undefined and the UI shuffles. */
  memory?: string[];
  basis: Basis;
}

export interface NoiseSpec {
  /** probability of a random Pauli after each 1-qubit gate */
  p1: number;
  /** after each 2-qubit gate */
  p2: number;
  /** readout flip probability */
  readout: number;
  label: string;
}

export interface EngineInfo {
  name: string;
  backends: BackendDescriptor[];
  defaultBackendId: string;
  /** Short honest sentence shown under the backend pill. */
  note: string;
}

export interface QuantumEngine {
  info(): Promise<EngineInfo>;
  ideal(circuit: Circuit): Promise<Ideal>;
  qiskitCode(circuit: Circuit, shots: number): Promise<string>;
  run(circuit: Circuit, shots: number, backendId?: string, noise?: NoiseSpec): Promise<RunResult>;
}
