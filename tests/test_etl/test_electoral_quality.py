import pandas as pd

from etl.electoral.quality import validate_poll_rows, validate_results_frame


def test_validate_results_frame_flags_duplicates():
    df = pd.DataFrame(
        {
            "codigo_provincia": ["28", "28"],
            "codigo_partido": ["000001", "000001"],
            "fecha_eleccion": ["2023-07-23", "2023-07-23"],
            "votos": [100, 100],
            "candidatos_electos": [1, 1],
            "porcentaje": [10.0, 10.0],
        }
    )

    report = validate_results_frame(df, 0.35)

    assert not report.ok
    assert any(issue.code == "duplicate_rows" for issue in report.issues)


def test_validate_poll_rows_warns_on_volume_drop():
    df = pd.DataFrame(
        {
            "poll_key": ["a"],
            "partido": ["PP"],
            "fecha_publicacion": ["2026-04-20"],
            "porcentaje": [33.4],
        }
    )

    report = validate_poll_rows(df, 0.10, previous_metrics={"row_count": 5})

    assert report.ok
    assert any(issue.code == "row_count_drop" for issue in report.warnings)
