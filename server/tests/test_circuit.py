"""Programmatic validation of the quantum behaviors the garden teaches (pure Qiskit, no sampling)."""
import json
import math

import pytest
from qiskit.quantum_info import Statevector

from qsg import circuit as C


def P(n, ops):
    return C.ideal(n, ops)["probabilities"]


def test_deterministic_basis_state_preparation():
    assert P(1, []) == {"0": 1.0, "1": 0.0}
    assert P(1, [{"op": "flip", "q": 0}]) == {"0": 0.0, "1": 1.0}
    # two seeds: flipping seed 0 gives '01' (qubit 0 is the rightmost bit)
    assert P(2, [{"op": "flip", "q": 0}])["01"] == 1.0
    assert P(2, [{"op": "flip", "q": 1}])["10"] == 1.0


def test_split_is_balanced():
    p = P(1, [{"op": "split", "q": 0}])
    assert p["0"] == pytest.approx(0.5) and p["1"] == pytest.approx(0.5)


def test_twist_alone_leaves_probabilities_unchanged():
    base = P(1, [{"op": "split", "q": 0}])
    for turns in (0.1, 0.25, 0.5, 0.9):
        twisted = P(1, [{"op": "split", "q": 0}, {"op": "twist", "q": 0, "turns": turns}])
        assert twisted == pytest.approx(base)


def test_phase_then_recombination_changes_the_outcome():
    split = {"op": "split", "q": 0}
    # H H = I : the second split undoes the first -> seed 0 is silent (|0>) with certainty
    assert P(1, [split, split])["0"] == pytest.approx(1.0)
    # H Z H = X : a half-turn twist between two splits flips the outcome -> footsteps certain
    assert P(1, [split, {"op": "twist", "q": 0, "turns": 0.5}, split])["1"] == pytest.approx(1.0)
    # a quarter turn (pi/2) gives 50/50 again: p(1) = sin^2(theta/2)
    assert P(1, [split, {"op": "twist", "q": 0, "turns": 0.25}, split])["1"] == pytest.approx(0.5)
    for turns in (0.05, 0.15, 0.3, 0.4):
        theta = turns * 2 * math.pi
        assert P(1, [split, {"op": "twist", "q": 0, "turns": turns}, split])["1"] == pytest.approx(
            math.sin(theta / 2) ** 2
        )


def test_bell_state_correlations():
    p = P(2, [{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}])
    assert p["00"] == pytest.approx(0.5) and p["11"] == pytest.approx(0.5)
    assert p["01"] == 0.0 and p["10"] == 0.0
    # marginals are each 50/50 (individually unpredictable), yet perfectly correlated
    p_q0 = p["01"] + p["11"]
    p_q1 = p["10"] + p["11"]
    assert p_q0 == pytest.approx(0.5) and p_q1 == pytest.approx(0.5)


def test_link_without_split_is_classical_copy():
    # control certain -> target follows deterministically; no entanglement
    p = P(2, [{"op": "flip", "q": 0}, {"op": "link", "control": 0, "target": 1}])
    assert p["11"] == pytest.approx(1.0)


def test_qiskit_code_rebuilds_the_same_circuit():
    ops = [
        {"op": "split", "q": 0},
        {"op": "twist", "q": 0, "turns": 0.25},
        {"op": "link", "control": 0, "target": 1},
        {"op": "flip", "q": 1},
    ]
    code = C.qiskit_code(2, ops)
    assert "qc.h(0)" in code and "qc.p(math.pi / 2, 0)" in code and "qc.cx(0, 1)" in code and "qc.x(1)" in code
    assert "Hadamard" in code and "CNOT" in code  # real names are revealed, not hidden
    # execute everything up to the run line and compare statevectors
    head = code.split("# Run it.")[0]
    ns: dict = {}
    exec(head, ns)  # noqa: S102 - our own generated code, in tests
    expected = Statevector.from_instruction(C.build_circuit(2, ops, measure=False))
    actual = Statevector.from_instruction(ns["qc"].remove_final_measurements(inplace=False))
    assert actual.equiv(expected)


def test_turns_render_as_friendly_pi_fractions():
    assert C._turns_expr(0.5) == "math.pi"
    assert C._turns_expr(0.25) == "math.pi / 2"
    assert C._turns_expr(0.125) == "math.pi / 4"
    assert C._turns_expr(1.0) == "2 * math.pi"
    assert C._turns_expr(0.0) == "0"
    assert C._turns_expr(-0.25) == "-math.pi / 2"


def test_normalize_counts_shapes():
    counts, kind = C.normalize_counts({"11": 50, "00": 48, "1 0": 2}, 2, 100)
    assert kind == "counts" and counts == {"00": 48, "01": 0, "10": 2, "11": 50}
    # probabilities (IonQ ideal simulator) scale to shots exactly
    counts, kind = C.normalize_counts({"0": 0.3, "1": 0.7}, 1, 10)
    assert kind == "probabilities" and counts == {"0": 3, "1": 7} and sum(counts.values()) == 10
    counts, kind = C.normalize_counts({"00": 1 / 3, "11": 2 / 3}, 2, 100)
    assert sum(counts.values()) == 100 and counts["11"] == 67
    # hex keys (some providers)
    counts, kind = C.normalize_counts({"0x3": 5, "0x0": 5}, 2, 10)
    assert counts == {"00": 5, "01": 0, "10": 0, "11": 5}
    dist = C.distribution(counts)
    assert sum(dist.values()) == pytest.approx(1.0)


def test_validation_rejects_bad_ops():
    with pytest.raises(C.CircuitError):
        C.validate(2, [{"op": "link", "control": 0, "target": 0}])
    with pytest.raises(C.CircuitError):
        C.validate(2, [{"op": "split", "q": 2}])
    with pytest.raises(C.CircuitError):
        C.validate(5, [])
    with pytest.raises(C.CircuitError):
        C.validate(1, [{"op": "dance", "q": 0}])
    with pytest.raises(C.CircuitError):
        C.validate(1, [{"op": "twist", "q": 0, "turns": "a lot"}])


def test_json_entry_points_round_trip():
    out = json.loads(C.ideal_json(2, json.dumps([{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}])))
    assert out["probabilities"]["11"] == pytest.approx(0.5)
    assert out["amplitudes"]["11"][0] == pytest.approx(math.sqrt(0.5))
    assert out["gate_count"] == 2


def test_build_circuit_for_run_and_normalize_counts_json_serve_the_javascript_submission_path():
    # Qollab proxies a remote job only when JavaScript calls backend.run itself: Python hands over the measured
    # circuit, and normalizes whatever counts the job returned.
    qc = C.build_circuit_for_run(2, json.dumps([{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}]))
    assert [i.operation.name for i in qc.data] == ["h", "cx", "measure", "measure"]
    assert qc.num_clbits == 2
    out = json.loads(C.normalize_counts_json(json.dumps({"00": 5, "11": 3}), 2, 8))
    assert out == {"counts": {"00": 5, "01": 0, "10": 0, "11": 3}, "shots": 8, "counts_kind": "counts"}
    probs = json.loads(C.normalize_counts_json(json.dumps({"00": 0.5, "11": 0.5}), 2, 8))
    assert probs["counts_kind"] == "probabilities" and sum(probs["counts"].values()) == 8
    # what Qollab's JavaScript actually hands back: the Counts object from get_counts(), unconverted
    from qiskit.result import Counts

    direct = json.loads(C.normalize_counts_json(Counts({"00": 4, "11": 4}), 2, 8))
    assert direct == {"counts": {"00": 4, "01": 0, "10": 0, "11": 4}, "shots": 8, "counts_kind": "counts"}


def test_run_json_with_a_fake_backend_returns_normalized_counts():
    class FakeJob:
        def __init__(self, counts):
            self._c = counts

        def result(self):
            job = self

            class R:
                def get_counts(self_inner):
                    return job._c

            return R()

    class LocalBackend:
        name = "basic_simulator"

        def run(self, qc, shots):
            assert qc.num_qubits == 2 and shots == 8
            return FakeJob({"00": 4, "11": 4})

    out = json.loads(C.run_json(LocalBackend(), 2, json.dumps([{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}]), 8))
    assert out["counts"] == {"00": 4, "01": 0, "10": 0, "11": 4}
    assert out["backend_name"] == "basic_simulator" and out["counts_kind"] == "counts"
    assert json.loads(C.describe_backend_json(LocalBackend()))["kind"] == "local-ideal"


def test_bloom_sideways_distinguishes_a_bell_pair_from_correlated_coins():
    bell = [{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}]
    # In the usual basis the Bell pair shows only 00 and 11 ...
    assert C.ideal(2, bell)["probabilities"] == pytest.approx({"00": 0.5, "01": 0, "10": 0, "11": 0.5})
    # ... and sideways (X basis) it is STILL perfectly correlated: only 00 and 11.
    assert C.ideal(2, bell, basis="x")["probabilities"] == pytest.approx({"00": 0.5, "01": 0, "10": 0, "11": 0.5})
    # Two classically correlated seeds (|00> half the time, |11> half the time) agree in the usual basis, but
    # sideways each definite state spreads over all four outcomes: the correlation is gone.
    both_off = C.ideal(2, [], basis="x")["probabilities"]
    both_on = C.ideal(2, [{"op": "flip", "q": 0}, {"op": "flip", "q": 1}], basis="x")["probabilities"]
    mixture = {k: 0.5 * both_off[k] + 0.5 * both_on[k] for k in both_off}
    assert mixture == pytest.approx({"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25})
    code = C.qiskit_code(2, bell, basis="x")
    assert code.count("Play sideways") == 2 and "qc.measure([0, 1], [0, 1])" in code


def test_dephased_twin_loses_interference():
    split = {"op": "split", "q": 0}
    twist = {"op": "twist", "q": 0, "turns": 0.5}
    # coherent: Split, Twist half, Split -> footsteps certain
    assert C.ideal(1, [split, twist, split])["probabilities"]["1"] == pytest.approx(1.0)
    # dephased twin: a random half-turn after the first split half of the time (phase scrambled) -> 50/50 whatever
    # the twist: the paths no longer interfere.
    a = C.ideal(1, [split, twist, split])["probabilities"]
    b = C.ideal(1, [split, {"op": "twist", "q": 0, "turns": 0.5}, twist, split])["probabilities"]
    mixture = {k: 0.5 * a[k] + 0.5 * b[k] for k in a}
    assert mixture == pytest.approx({"0": 0.5, "1": 0.5})
