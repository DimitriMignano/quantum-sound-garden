/** Qiskit code generation in TypeScript, byte-for-byte the same as server/qsg/circuit.py:qiskit_code (parity-tested). */
import type { Circuit, Op } from './types';

const EXPLAIN: Record<Op['op'], string> = {
  flip: 'Swap (X gate): switches the track to its other sound, |0> becomes |1>',
  split: 'Shuffle (Hadamard): one path becomes two equal paths, a coin toss at Play',
  twist: 'Turn (phase gate): rotates the |1> path; silent until paths recombine',
  link: 'Sync (CNOT): the control track decides whether the target flips',
};

export function turnsExpr(turns: number): string {
  const frac = turns * 2; // in units of pi
  for (const denom of [1, 2, 3, 4, 6, 8]) {
    let num = frac * denom;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      num = Math.round(num);
      if (num === 0) return '0';
      const sign = num < 0 ? '-' : '';
      num = Math.abs(num);
      if (denom === 1) return num === 1 ? `${sign}math.pi` : `${sign}${num} * math.pi`;
      return num === 1 ? `${sign}math.pi / ${denom}` : `${sign}${num} * math.pi / ${denom}`;
    }
  }
  return (turns * 2 * Math.PI).toFixed(6);
}

export function qiskitCode(circuit: Circuit, shots = 256): string {
  const n = circuit.nQubits;
  const lines = [
    'from qiskit import QuantumCircuit',
    'from qiskit.quantum_info import Statevector',
    'import math',
    '',
    `qc = QuantumCircuit(${n}, ${n})   # ${n} track${n !== 1 ? 's' : ''}, one classical bit each`,
  ];
  for (const op of circuit.ops) {
    if (op.op === 'flip') lines.push(`qc.x(${op.q})        # ${EXPLAIN.flip}`);
    else if (op.op === 'split') lines.push(`qc.h(${op.q})        # ${EXPLAIN.split}`);
    else if (op.op === 'twist') lines.push(`qc.p(${turnsExpr(op.turns)}, ${op.q})   # ${EXPLAIN.twist}`);
    else if (op.op === 'link') lines.push(`qc.cx(${op.control}, ${op.target})    # ${EXPLAIN.link}`);
  }
  const regs = Array.from({ length: n }, (_, i) => String(i)).join(', ');
  if (circuit.basis === 'x') for (let q = 0; q < n; q++) lines.push(`qc.h(${q})        # Play sideways: rotate track ${q} into the X basis before measuring`);
  lines.push(
    `qc.measure([${regs}], [${regs}])   # Play: measure every track`,
    '',
    '# Ideal probabilities, before any shots:',
    'state = Statevector.from_instruction(qc.remove_final_measurements(inplace=False))',
    'print(state.probabilities_dict())',
    '',
    '# Run it. On Qollab `backend` is the device you picked; locally use AerSimulator().',
    `job = backend.run(qc, shots=${Math.trunc(shots)})`,
    'print(job.result().get_counts())',
  );
  return lines.join('\n') + '\n';
}
