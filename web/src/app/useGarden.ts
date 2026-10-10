/**
 * One hook owns a garden: its circuit, the instant browser preview, the authoritative Qiskit ideal (when the engine
 * is Qiskit), runs, playback and captions. Challenge and creator scenes both sit on it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Circuit, Ideal, NoiseSpec, Op, QuantumEngine, RunResult } from '../engine/types';
import { previewIdeal, TEACHING_NOISE } from '../engine/browser';
import { OneJobLimitError } from '../engine/qollab';
import { distribution, fidelity, shotSequence } from '../engine/outcomes';
import { audio } from '../audio/engine';
import { mixer, type Assignment, GardenMixer } from '../audio/mixer';

export interface Playback {
  index: number;       // current moment
  total: number;
  outcome: string | null;
  caption: string;
}

export interface GardenApi {
  circuit: Circuit;
  ideal: Ideal;                // instant preview (browser math) — always present
  qiskitIdeal: Ideal | null;   // authoritative, when the engine is Qiskit; null on the browser engine
  idealAgrees: boolean | null; // browser preview vs Qiskit, within 1e-6
  result: RunResult | null;
  measured: Record<string, number> | null;
  measuredFidelity: number | null;
  playback: Playback | null;
  busy: boolean;
  error: string | null;
  addOp(op: Op): void;
  removeOp(index: number): void;
  setOps(ops: Op[]): void;
  reset(ops?: Op[]): void;
  bloom(shots: number, opts?: { noise?: boolean; backendId?: string; moments?: number; step?: number }): Promise<RunResult | null>;
  replay(): void;
  stopPlayback(): void;
  hearOdds(): void;
  code(shots: number): Promise<string>;
}

export function useGarden(engine: QuantumEngine, nQubits: number, assignment: Assignment, startOps: Op[] = []): GardenApi {
  const [ops, setOpsState] = useState<Op[]>(startOps);
  const circuit = useMemo<Circuit>(() => ({ nQubits, ops }), [nQubits, ops]);
  const ideal = useMemo(() => previewIdeal(circuit), [circuit]);
  const [qiskitIdeal, setQiskitIdeal] = useState<Ideal | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef<string[]>([]);
  const assignmentRef = useRef(assignment);
  assignmentRef.current = assignment;
  const lastStepRef = useRef(0.9);

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

  // the circuit changed: hear the new odds (quietly), forget the old measurement
  useEffect(() => {
    setResult(null);
    setPlayback(null);
    if (audio.started) mixer.blend(assignmentRef.current, ideal.probabilities);
  }, [ideal]);

  const measured = useMemo(() => (result ? distribution(result.counts) : null), [result]);
  const measuredFidelity = useMemo(() => (measured ? fidelity(measured, ideal.probabilities) : null), [measured, ideal]);

  const setOps = useCallback((next: Op[]) => { setOpsState(next); setError(null); }, []);
  const addOp = useCallback((op: Op) => setOpsState((prev) => [...prev, op]), []);
  const removeOp = useCallback((index: number) => setOpsState((prev) => prev.filter((_, i) => i !== index)), []);
  const reset = useCallback((next?: Op[]) => { mixer.stopSequence(); setOpsState(next ?? startOps); setResult(null); setPlayback(null); setError(null); }, [startOps]);

  const play = useCallback((seq: string[], step: number) => {
    const probs = ideal.probabilities;
    setPlayback({ index: -1, total: seq.length, outcome: null, caption: '' });
    mixer.playSequence(assignmentRef.current, seq, probs, {
      step,
      onMoment: (index, outcome, caption) => setPlayback({ index, total: seq.length, outcome, caption }),
      onEnd: () => setPlayback((p) => (p ? { ...p, outcome: null, index: p.total } : null)),
    });
  }, [ideal]);

  const bloom = useCallback(async (shots: number, opts: { noise?: boolean; backendId?: string; moments?: number; step?: number } = {}) => {
    setBusy(true); setError(null);
    mixer.stopSequence();
    try {
      const noise: NoiseSpec | undefined = opts.noise ? TEACHING_NOISE : undefined;
      const r = await engine.run(circuit, shots, opts.backendId, noise);
      setResult(r);
      const full = shotSequence(r.counts, shots * 7919 + r.elapsedMs);
      const seq = GardenMixer.thin(full, opts.moments ?? Math.min(24, shots));
      seqRef.current = seq;
      lastStepRef.current = opts.step ?? 0.9;
      if (audio.started) play(seq, lastStepRef.current);
      return r;
    } catch (e) {
      setError(e instanceof OneJobLimitError ? e.message : e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [engine, circuit, play]);

  const replay = useCallback(() => { if (seqRef.current.length && audio.started) play(seqRef.current, lastStepRef.current); }, [play]);
  const stopPlayback = useCallback(() => { mixer.stopSequence(); setPlayback(null); if (audio.started) mixer.blend(assignmentRef.current, ideal.probabilities); }, [ideal]);
  const hearOdds = useCallback(() => { if (audio.started) mixer.blend(assignmentRef.current, ideal.probabilities, 0.5); }, [ideal]);
  const code = useCallback((shots: number) => engine.qiskitCode(circuit, shots), [engine, circuit]);

  return { circuit, ideal, qiskitIdeal, idealAgrees, result, measured, measuredFidelity, playback, busy, error, addOp, removeOp, setOps, reset, bloom, replay, stopPlayback, hearOdds, code };
}
