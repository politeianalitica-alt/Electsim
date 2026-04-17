# Pipelines Prefect

- `pipelines/ingest_all.py`: orquestación completa en orden de dependencias FK.
- Dominios: `ingest_electoral.py`, `ingest_economico.py`, `ingest_sectorial.py`, `ingest_social.py`.

Ejemplo:

```bash
python -m pipelines.ingest_all
```

Con agente Prefect configurado, despliegue los flows con `prefect deploy` según su entorno.
