/**
 * One hook owns a garden: its circuit, the instant browser preview, the authoritative Qiskit ideal (when the engine
 * is Qiskit), runs, playback and captions. Challenge and creator scenes both sit on it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Basis, Circuit, Ideal, NoiseSpec, Op, QuantumEngine, RunResult } from '../engine/types';
import { previewIdeal, TEACHING_NOISE } from '../engine/browser';
import { OneJobLimitError } from '../engine/qollab';
import { distribution, fidelity, shotSequence } from '../engine/outcomes';
import { mixer, type Assignment, GardenMixer } from '../audio/mixer';

export interface Playback {
  index: number;       // current moment
  total: number;
  outcome: string | null;
  caption: string;
  finished: boolean;
}

export interface BloomOptions {
  noise?: boolean;
  backendId?: string;
  moments?: number;
  step?: number;
  basis?: Basis;
  /** A "twin": several circuits sharing the shots, counts merged (a classical mixture). */
  mixture?: Op[][];
  label?: string;
}

export interface GardenApi {
  circuit: Circuit;
  ideal: Ideal;                // instant preview (browser math) — always present
  qiskitIdeal: Ideal | null;   // authoritative, when the engine is Qiskit; null on the browser engine
  idealAgrees: boolean | null; // browser preview vs Qiskit, within 1e-6
  result: RunResult | null;
  resultLabel: string | null;  // what the last bloom was ("Bloom sideways", "Classical twins, sideways")
  measured: Record<string, number> | null;
  measuredFidelity: number | null;
  playback: Playback | null;
  busy: boolean;
  error: string | null;
  oddsHidden: boolean;
  setOddsHidden(v: boolean): void;
  addOp(op: Op): void;
  removeOp(index: number): void;
  setOps(ops: Op[]): void;
  reset(ops?: Op[]): void;
  bloom(shots: number, opts?: BloomOptions): Promise<RunResult | null>;
  replay(): void;
  skip(): void;
  stopPlayback(): void;
  hearOdds(): void;
  code(shots: number): Promise<string>;
}

export function useGarden(engine: QuantumEngine, nQubits: number, assignment: Assignment, startOps: Op[] = [], hideOddsUntilAsked = false): GardenApi {
  const [ops, setOpsState] = useState<Op[]>(startOps);
  const circuit = useMemo<Circuit>(() => ({ nQubits, ops }), [nQubits, ops]);
  const ideal = useMemo(() => previewIdeal(circuit), [circuit]);
  const [qiskitIdeal, setQiskitIdeal] = useState<Ideal | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oddsHidden, setOddsHidden] = useState(hideOddsUntilAsked);
  const seqRef = useRef<string[]>([]);
  const assignmentRef = useRef(assignment);
  const lastStepRef = useRef(0.9);
  const playRef = useRef<(seq: string[], step: number) => void>(() => {});

  // authoritative ideal from Qiskit (debounced), when available
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const q = await engine.ideal(circuit);
        if (alive) setQiskitIdeal(q.source === 'qiskit' ? q : null);
      } catch (e) {
        if (alive) { setQiskitIdeal(null); setError(e instanceof Error ? e.message : String(e)); }
      }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [engine, circuit]);

  const idealAgrees = useMemo(() => {
    if (!qiskitIdeal) return null;
    return Object.keys(ideal.probabilities).every((k) => Math.abs((qiskitIdeal.probabilities[k] ?? 0) - ideal.probabilities[k]) < 1e-6);
  }, [ideal, qiskitIdeal]);

  // the circuit changed: forget the old measurement; hide the odds again if this garden asks for predictions first
  useEffect(() => {
    setResult(null);
    setResultLabel(null);
    setPlayback(null);
    if (hideOddsUntilAsked) setOddsHidden(true);
  }, [ideal, hideOddsUntilAsked]);

  // nothing sounds unless Play is pressed: a change to the mix only changes the picture
  useEffect(() => { assignmentRef.current = assignment; }, [assignment]);

  // leaving the scene: nothing keeps playing underneath the next one
  useEffect(() => () => { mixer.silence(0.5); }, []);

  const measured = useMemo(() => (result ? distribution(result.counts) : null), [result]);
  const measuredFidelity = useMemo(() => (measured ? fidelity(measured, ideal.probabilities) : null), [measured, ideal]);

  const setOps = useCallback((next: Op[]) => { setOpsState(next); setError(null); }, []);
  const addOp = useCallback((op: Op) => setOpsState((prev) => [...prev, op]), []);
  const removeOp = useCallback((index: number) => setOpsState((prev) => prev.filter((_, i) => i !== index)), []);
  const reset = useCallback((next?: Op[]) => { mixer.stopSequence(); setOpsState(next ?? startOps); setResult(null); setResultLabel(null); setPlayback(null); setError(null); }, [startOps]);

  playRef.current = (seq: string[], step: number) => {
    setPlayback({ index: -1, total: seq.length, outcome: null, caption: '', finished: false });
    mixer.playSequence(assignmentRef.current, seq, ideal.probabilities, {
      step,
      onMoment: (index, outcome, caption) => setPlayback({ index, total: seq.length, outcome, caption, finished: false }),
      onEnd: () => setPlayback((p) => (p ? { ...p, outcome: null, index: p.total, finished: true } : null)),
    });
  };

  const bloom = useCallback(async (shots: number, opts: BloomOptions = {}) => {
    setBusy(true); setError(null);
    mixer.stopSequence();
    try {
      const noise: NoiseSpec | undefined = opts.noise ? TEACHING_NOISE : undefined;
      const basis = opts.basis ?? 'z';
      let r: RunResult;
      if (opts.mixture && opts.mixture.length > 1) {
        // a classical mixture: each twin gets a share of the shots, counts are merged, the order is shuffled
        const share = Math.max(1, Math.floor(shots / opts.mixture.length));
        const parts: RunResult[] = [];
        for (const twinOps of opts.mixture) parts.push(await engine.run({ nQubits, ops: twinOps, basis }, share, opts.backendId, noise));
        const counts: Record<string, number> = {};
        for (const p of parts) for (const [k, v] of Object.entries(p.counts)) counts[k] = (counts[k] ?? 0) + v;
        r = { ...parts[0], counts, shots: share * parts.length, memory: undefined, elapsedMs: parts.reduce((s, p) => s + p.elapsedMs, 0) };
      } else {
        r = await engine.run({ ...circuit, basis }, shots, opts.backendId, noise);
      }
      setResult(r);
      setResultLabel(opts.label ?? null);
      const full = r.memory && r.memory.length === r.shots ? r.memory : shotSequence(r.counts, r.shots * 7919 + r.elapsedMs);
      const seq = GardenMixer.thin(full, opts.moments ?? Math.min(24, r.shots));
      seqRef.current = seq;
      lastStepRef.current = opts.step ?? 0.9;
      playRef.current(seq, lastStepRef.current);
      return r;
    } catch (e) {
      setError(e instanceof OneJobLimitError ? e.message : e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [engine, circuit, nQubits]);

  const replay = useCallback(() => { if (seqRef.current.length) playRef.current(seqRef.current, lastStepRef.current); }, []);
  const skip = useCallback(() => { mixer.stopSequence(); setPlayback((p) => (p ? { ...p, outcome: null, index: p.total, finished: true } : null)); }, []);
  const stopPlayback = useCallback(() => { mixer.stopSequence(); setPlayback((p) => (p ? { ...p, outcome: null, index: p.total, finished: true } : null)); }, []);
  const hearOdds = useCallback(() => { setOddsHidden(false); }, []);
  const code = useCallback((shots: number) => engine.qiskitCode(circuit, shots), [engine, circuit]);

  return { circuit, ideal, qiskitIdeal, idealAgrees, result, resultLabel, measured, measuredFidelity, playback, busy, error, oddsHidden, setOddsHidden, addOp, removeOp, setOps, reset, bloom, replay, skip, stopPlayback, hearOdds, code };
}
