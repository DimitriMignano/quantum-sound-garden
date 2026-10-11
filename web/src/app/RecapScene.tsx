import { QUBITS, QUANTUM_CHALLENGES } from '../content/content';

interface Props { unlocked: number; onOpen(scene: string): void }

/** The door into the qubit puzzles: the same board with its real names, and the four puzzles, unlocked in order. */
export function RecapScene({ unlocked, onOpen }: Props) {
  return (
    <div className="scene scene--recap">
      <header className="puzzle__head">
        <p className="eyebrow">Qubits</p>
        <h2>{QUBITS.title}</h2>
        <p className="story">{QUBITS.lead}</p>
      </header>
      <table className="recap">
        <thead><tr><th>In the studio</th><th>In Qiskit</th><th>What it does</th></tr></thead>
        <tbody>
          {QUBITS.rows.map((r) => (
            <tr key={r.move}><td className="recap__move">{r.move}</td><td><code>{r.gate}</code></td><td>{r.meaning}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button type="button" className="primary" onClick={() => onOpen('q1')}>{QUBITS.start}</button>
      </div>
      <div className="row wrap" role="group" aria-label={QUBITS.puzzles}>
        <span className="label">{QUBITS.puzzles}</span>
        {QUANTUM_CHALLENGES.map((c) => {
          const locked = 4 + c.index > unlocked;
          return <button key={c.id} type="button" className="chip" disabled={locked} title={locked ? 'Solve the previous puzzle first' : c.goal} onClick={() => onOpen(`q${c.index}`)}>{c.index}. {c.title}</button>;
        })}
      </div>
    </div>
  );
}
