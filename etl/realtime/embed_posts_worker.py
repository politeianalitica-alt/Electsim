from __future__ import annotations

from time import sleep

from etl.quality.backfill_embeddings_posts import backfill_embeddings


def run_worker(interval_seconds: int = 30) -> None:
    while True:
        updated = backfill_embeddings()
        if updated == 0:
            sleep(interval_seconds)


if __name__ == "__main__":
    run_worker()
