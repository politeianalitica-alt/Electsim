"""Deployment Prefect para tracker de narrativas."""

from __future__ import annotations

from datetime import timedelta

from prefect.deployments import Deployment
from prefect.server.schemas.schedules import IntervalSchedule

from etl.pipelines.tracker_pipeline import tracker_narrativas_flow


def main() -> None:
    deployment = Deployment.build_from_flow(
        flow=tracker_narrativas_flow,
        name="tracker-narrativas-hourly",
        schedule=IntervalSchedule(interval=timedelta(hours=1)),
        work_queue_name="default",
        tags=["tracker", "media", "nlp"],
    )
    deployment.apply()
    print("deployment tracker-narrativas-hourly registrado")


if __name__ == "__main__":
    main()
