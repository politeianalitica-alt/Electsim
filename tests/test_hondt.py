from dashboard.models.seat_simulator import hondt


def test_hondt_total_seats_matches():
    out = hondt({"A": 0.4, "B": 0.35, "C": 0.25}, seats=10, threshold=0.03)
    assert sum(out.values()) == 10


def test_hondt_threshold_filters_small_parties():
    out = hondt({"A": 0.49, "B": 0.49, "C": 0.01}, seats=8, threshold=0.03)
    assert out["C"] == 0


def test_hondt_non_negative():
    out = hondt({"A": 0.5, "B": 0.5}, seats=6, threshold=0.03)
    assert all(v >= 0 for v in out.values())

