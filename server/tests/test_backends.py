"""Sampling behaviors on the local Aer backends, plus the honest-fallback contract for IonQ without a key."""
import os

import pytest

from qsg import backends as B
from qsg import circuit as C

SPLIT = {"op": "split", "q": 0}
LINK = {"op": "link", "control": 0, "target": 1}


def test_list_backends_marks_ionq_unavailable_without_key(monkeypatch):
    for var in ("IONQ_API_KEY", "QISKIT_IONQ_API_TOKEN", "IONQ_API_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    infos = {b.id: b for b in B.list_backends()}
    assert infos["local-ideal"].available and not infos["ionq-ideal"].available
    assert "IONQ_API_KEY" in infos["ionq-ideal"].reason


def test_deterministic_preparation_samples_one_outcome():
    r = B.run("local-ideal", 2, [{"op": "flip", "q": 0}], 300, seed=1)
    assert r.counts == {"00": 0, "01": 300, "10": 0, "11": 0}
    assert r.backend.produced_by == "qiskit-aer" and r.fallback_from is None


def test_hadamard_shots_are_approximately_balanced():
    r = B.run("local-ideal", 1, [SPLIT], 4000, seed=2)
    p1 = r.counts["1"] / 4000
    assert abs(p1 - 0.5) < 0.03  # 4 sigma is about 0.032


def test_phase_then_recombination_changes_sampled_distribution():
    quiet = B.run("local-ideal", 1, [SPLIT, SPLIT], 500, seed=3).counts
    loud = B.run("local-ideal", 1, [SPLIT, {"op": "twist", "q": 0, "turns": 0.5}, SPLIT], 500, seed=3).counts
    assert quiet["0"] == 500 and loud["1"] == 500


def test_bell_shots_are_correlated():
    r = B.run("local-ideal", 2, [SPLIT, LINK], 2000, seed=4)
    assert r.counts["01"] == 0 and r.counts["10"] == 0
    assert abs(r.counts["11"] / 2000 - 0.5) < 0.04


def test_teaching_noise_produces_unintended_outcomes_and_rewards_shorter_circuits():
    minimal = [SPLIT, LINK]
    # the same Bell state with redundant gates (H H and CX CX pairs cancel ideally)
    padded = [SPLIT, {"op": "split", "q": 1}, {"op": "split", "q": 1}, LINK, LINK, LINK]
    assert C.ideal(2, minimal)["probabilities"] == pytest.approx(C.ideal(2, padded)["probabilities"])
    ideal = C.ideal(2, minimal)["probabilities"]
    r_min = B.run("local-noisy-teaching", 2, minimal, 3000, seed=5)
    r_pad = B.run("local-noisy-teaching", 2, padded, 3000, seed=5)
    assert r_min.backend.noisy and r_min.counts["01"] + r_min.counts["10"] > 0  # noise shows up
    fid_min = _fidelity(C.distribution(r_min.counts), ideal)
    fid_pad = _fidelity(C.distribution(r_pad.counts), ideal)
    assert fid_min > fid_pad  # fewer gates, less noise


def test_ionq_without_key_falls_back_and_says_so(monkeypatch):
    for var in ("IONQ_API_KEY", "QISKIT_IONQ_API_TOKEN", "IONQ_API_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    r = B.run("ionq-ideal", 1, [SPLIT], 100, seed=6)
    assert r.backend.id == "local-ideal" and r.fallback_from == "ionq-ideal"
    assert "IONQ_API_KEY" in (r.fallback_reason or "")
    d = r.to_dict()
    assert d["backend"]["produced_by"] == "qiskit-aer" and sum(d["distribution"].values()) == pytest.approx(1.0)


@pytest.mark.skipif(not B.ionq_key_present(), reason="IONQ_API_KEY not set")
def test_ionq_ideal_simulator_live():
    r = B.run("ionq-ideal", 2, [SPLIT, LINK], 100)
    assert r.fallback_from is None, r.fallback_reason
    assert r.backend.produced_by == "qiskit-ionq"
    assert r.counts["01"] == 0 and r.counts["10"] == 0 and sum(r.counts.values()) == 100


def _fidelity(p: dict, q: dict) -> float:
    return sum((p.get(k, 0.0) * q.get(k, 0.0)) ** 0.5 for k in set(p) | set(q)) ** 2


def test_local_runs_return_real_shot_order_and_sideways_bell_is_correlated():
    r = B.run("local-ideal", 2, [SPLIT, LINK], 200, seed=9, basis="x")
    assert r.basis == "x" and r.counts["01"] == 0 and r.counts["10"] == 0
    assert r.memory is not None and len(r.memory) == 200 and set(r.memory) <= {"00", "11"}
    assert sum(1 for m in r.memory if m == "11") == r.counts["11"]


def test_teaching_noise_model_is_the_stochastic_pauli_channel():
    # a single X gate under teaching noise: wrong answers appear at about p1*(2/3) + readout (Z does not flip)
    r = B.run("local-noisy-teaching", 1, [{"op": "flip", "q": 0}], 10000, seed=11)
    wrong = r.counts["0"] / r.shots
    expected = 0.02 * 2 / 3 + 0.02 - (0.02 * 2 / 3) * 0.02 * 2
    assert abs(wrong - expected) < 0.006
