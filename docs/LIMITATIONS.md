# Limitations and careful claims

## What the app claims, and what it does not
- You never hear a quantum state. Audio is classical, rendered from ideal probabilities (the blend) and measured
  counts (a bloom). Phases are shown (the magenta ring) and only become audible through interference, which is the
  point of challenge 3.
- "Qiskit" means a `qiskit.QuantumCircuit` built by `qsg/circuit.py` and either (a) run as a job on a backend
  (Qollab's chosen device, Aer, or IonQ through qiskit-ionq) or (b) evaluated exactly with `Statevector`. Every result
  in the UI names which: a backend label, "Qiskit Statevector in your browser (shots sampled locally)", or
  "Browser math (not Qiskit)".
- Entanglement: challenge 2's normal bloom shows correlation in one basis, which two classical coins could mimic. The
  "Go deeper" panel adds the complementary (X-basis) question and a classical-twins comparison. That is a
  two-question demonstration, not a full Bell/CHSH test with multiple angles.
- Noise: the teaching model is a stochastic Pauli channel with exaggerated rates (about 20× an IonQ Aria-class
  device), identical on Aer and in-app. It is a teaching device, not a model of any specific machine. On Qollab,
  picking an IBM or IonQ noise-model backend replaces it with the provider's model. "Shorter circuits measure closer
  to intention" is true in this model and often on hardware; real devices also depend on native gates, routing, idle
  time and calibration.
- Order of shots: Aer reports per-shot memory, so the local server plays the real order. Other backends return
  counts only; the garden then plays a seeded shuffle of the counts and says so.
- Textures (rain drips, bird clusters) use non-quantum randomness for feel. It never changes which sound plays or
  when a moment starts; those come from the measured outcomes.

## Platform limits
- Qollab allows one `backend.run` job per Run on IonQ backends. The challenges therefore bloom on Qiskit's
  Statevector (computed in Pyodide, shots sampled in the browser) when an IonQ backend is selected, and the creator
  spends the single IonQ job on request. The built-in simulator has no such limit.
- The Qollab bundle could not be executed in this repository's test environment (Qollab's Pyodide build of Qiskit
  is not available locally). The adapter is unit-tested against a fake backend and a Pyodide-shaped module; the first
  upload to Qollab is the live test. See WORKLOG.md.
- Browser math fallback exists so the page never dies, but it is labeled and should not be mistaken for a Qiskit run.
- Safari is not supported by Qollab's runtime; the standalone app works in current Chrome, Edge, Firefox.

## Not done (stretch)
- Custom uploads or recordings, downloadable audio export, more than two qubits in the creator, a CHSH game, real
  per-shot order from IonQ (qiskit-ionq exposes per-shot data; not wired).
