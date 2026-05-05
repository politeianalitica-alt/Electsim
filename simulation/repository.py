"""
simulation/repository.py — Acceso DB para escenarios de simulación.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def _get_conn():
    try:
        from db.connection import get_db_connection
        return get_db_connection()
    except Exception:
        return None


class SimulationRepository:
    """Repository de acceso DB para simulaciones."""

    def create_scenario(self, scenario_data: dict) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO simulation_scenarios (
                        scenario_id, tenant_id, name, scenario_type,
                        status, config, results, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (scenario_id) DO NOTHING
                    """,
                    (
                        scenario_data.get("scenario_id", f"sc_{datetime.utcnow().timestamp()}"),
                        scenario_data.get("tenant_id", "default"),
                        scenario_data.get("name", ""),
                        scenario_data.get("scenario_type", "electoral"),
                        scenario_data.get("status", "draft"),
                        json.dumps(scenario_data.get("config", {})),
                        json.dumps(scenario_data.get("results", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.debug("SimulationRepository.create_scenario error: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass
            return False
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def list_scenarios(self, tenant_id: str, limit: int = 50) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM simulation_scenarios WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s",
                    (tenant_id, limit),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("SimulationRepository.list_scenarios error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_scenario(self, scenario_id: str, tenant_id: str) -> dict | None:
        conn = _get_conn()
        if conn is None:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM simulation_scenarios WHERE scenario_id=%s AND tenant_id=%s",
                    (scenario_id, tenant_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))
        except Exception as exc:
            logger.debug("SimulationRepository.get_scenario error: %s", exc)
            return None
        finally:
            try:
                conn.close()
            except Exception:
                pass
