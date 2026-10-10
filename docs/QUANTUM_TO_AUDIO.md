# Quantum → audio: the mapping, precisely

1. **State.** The garden's ops build a Qiskit circuit on n qubits. Before measurement the ideal state is a vector of
   2ⁿ complex amplitudes; the app shows the probabilities |a|² and, for each seed, the marginal probability of
   reading 1 (orb brightness) and the relative phase of its 1-branch (the magenta ring).
2. **Hearing the odds (no measurement).** Each outcome bitstring is assigned one or more sounds. A sound's level is
   the total probability of the outcomes that include it, scaled to 0.55 so a blend sits under a bloom. For a Bell
   pair the rain layer and the thunder layer each sit at 0.5 and the hush at 0.5. This is a sonification of the
   ideal distribution, not of the state's phases; phases are shown, not heard, until interference makes them count.
3. **Bloom (measurement).** The engine runs the circuit for N shots and returns counts. The counts are shuffled with a
   seeded generator into a sequence (providers return counts, not order), thinned to at most 24 moments, and played
   at 0.75–0.95 s per moment: the sounds of the measured outcome swell to 1 and event sounds fire; every other sound
   sinks to a bed of 0.12 × its probability mass. Captions name each moment ("Shot 4 of 12: rain falling").
4. **Bars.** Under the garden, each outcome shows predicted (ideal) and measured (counts/N) side by side. A
   Bhattacharyya fidelity between the two is computed for challenge 4.
5. **Noise.** With noise on, counts come from a stochastic Pauli trajectory model (in-app) or an Aer/provider noise
   model, so outcomes with ideal probability 0 appear and are heard.

What the mapping does not claim: nothing is "quantum audio"; no amplitude is played directly; there is no
"superposition as crossfade" (a split seed's blend is the probability-weighted mix of outcome sounds, and a measured
shot plays exactly one outcome).
