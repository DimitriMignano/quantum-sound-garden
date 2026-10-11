import { describe, expect, it } from 'vitest';
import { QollabEngine, OneJobLimitError, shortReason, type QollabRuntime } from './qollab';
import { amplitudes, probabilities, simulate } from './statevector';
import type { Op } from './types';

/** A Qollab-shaped runtime whose device is an IonQ simulator; `backend.run` is the JavaScript-side call the runtime proxies. */
function ionqRuntime(runBehavior: 'blocked' | 'ok'): QollabRuntime & { runs: number } {
  const rt = {
    runs: 0,
    backend: {
      run: async (_qc: unknown, opts: { shots: number }) => {
        rt.runs += 1;
        if (runBehavior === 'blocked') throw new Error('PythonError: Traceback (most recent call last):\n  ...\nrequests.exceptions.ConnectionError: (\'Connection aborted.\', HTTPException(\'Failed to fetch\'))');
        const half = Math.floor(opts.shots / 2);
        return { result: async () => ({ get_counts: () => ({ toJs: () => new Map([['00', half], ['11', opts.shots - half]]) }) }) };
      },
    },
    py: {
      describe_backend_json: { callPromising: async () => JSON.stringify({ name: 'ionq_simulator', class: 'IonQSimulatorBackend', module: 'qiskit_ionq', kind: 'ionq-simulator' }) },
      ideal_json: { callPromising: async (n: number, opsJson: string) => {
        const ops = JSON.parse(opsJson) as Op[];
        const st = simulate({ nQubits: n, ops });
        return JSON.stringify({ probabilities: probabilities(st), amplitudes: amplitudes(st), gate_count: ops.length, depth: ops.length });
      } },
      qiskit_code: { callPromising: async () => '# code' },
      build_circuit_for_run: { callPromising: async (n: number, opsJson: string, basis: string) => ({ n, ops: JSON.parse(opsJson), basis }) },
      normalize_counts_json: { callPromising: async (countsJson: string, _n: number, shots: number) => JSON.stringify({ counts: { '00': 0, '01': 0, '10': 0, '11': 0, ...JSON.parse(countsJson) }, shots, counts_kind: 'counts' }) },
      run_json: { callPromising: async () => { throw new Error('the Python path is never used for a remote job'); } },
    },
  };
  return rt as unknown as QollabRuntime & { runs: number };
}
const BELL: Op[] = [{ op: 'split', q: 0 }, { op: 'link', control: 0, target: 1 }];

describe('the Qollab engine on an IonQ backend', () => {
  it('turns a sandbox-blocked job into a statevector result with an honest note, and spends no job', async () => {
    const rt = ionqRuntime('blocked');
    const engine = new QollabEngine(rt);
    const r = await engine.run({ nQubits: 2, ops: BELL }, 64, 'qollab');
    expect(r.backend.id).toBe('statevector');
    expect(r.fallbackFrom).toContain('IonQ via Qollab');
    expect(r.fallbackReason).toContain('could not be submitted from the browser');
    expect(r.shots).toBe(64);
    expect((r.counts['00'] ?? 0) + (r.counts['11'] ?? 0)).toBe(64); // a Bell pair, sampled from the statevector
    // the guard was released: a second attempt tries again instead of claiming the job was spent
    const again = await engine.run({ nQubits: 2, ops: BELL }, 8, 'qollab');
    expect(again.fallbackFrom).toBeTruthy();
    expect(rt.runs).toBe(2);
  });

  it('spends exactly one job when the backend answers, and refuses a second', async () => {
    const engine = new QollabEngine(ionqRuntime('ok'));
    const r = await engine.run({ nQubits: 2, ops: BELL }, 8, 'qollab');
    expect(r.backend.id).toBe('qollab');
    expect(r.fallbackFrom).toBeUndefined();
    expect(r.counts).toEqual({ '00': 4, '01': 0, '10': 0, '11': 4 });
    await expect(engine.run({ nQubits: 2, ops: BELL }, 8, 'qollab')).rejects.toBeInstanceOf(OneJobLimitError);
  });

  it('cuts a traceback down to one line a person can read', () => {
    expect(shortReason(new Error('Traceback …\nrequests.exceptions.ConnectionError: Failed to fetch'))).toContain('Qollab blocks POST');
    expect(shortReason(new Error('line one\nValueError: bad shots'))).toBe('ValueError: bad shots');
  });
});
