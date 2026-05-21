# ETL Workers

Workers de larga duración o ejecución programada que viven fuera del request
cycle de la API. Cada uno es idempotente y falla cerrado: si la configuración
necesaria no está, sale con código 0 sin romper pipelines aguas abajo.

## `ais_ingest_worker` · AIS real desde AISStream

WebSocket persistente a [AISStream](https://aisstream.io). Suscribe a las
BoundingBoxes de los puertos del catálogo y persiste posiciones en la tabla
`vessel_positions`. Activa el modo "LIVE" del módulo Puertos (los badges
`<DataQualityBadge />` pasan de **SYNTH** a **LIVE** cuando esta tabla tiene
datos recientes).

### Activación

1. **Registro en AISStream** · https://aisstream.io → free tier, sin tarjeta.
2. **Variable de entorno**:
   - Local: añadir `AISSTREAM_API_KEY=...` a `.env`
   - Vercel: Project Settings → Environment Variables (Production + Preview)
   - Railway/Fly/Render: env vars del proyecto backend
3. **Lanzar el worker**:
   ```bash
   # Desarrollo · 5 minutos sobre todo el catálogo
   python -m etl.workers.ais_ingest_worker --duration 300

   # Producción · daemon perpetuo
   python -m etl.workers.ais_ingest_worker
   ```

### Verificación

```bash
# Lleva 1-2 min poblar la tabla. Comprobar:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM vessel_positions"

# Endpoint /data-sources/status reportará AISStream live:
curl http://localhost:8000/api/v1/ports/data-sources/status | jq

# Frontend · cada card en /puertos lleva badge LIVE en lugar de SYNTH
```

### Scheduling en producción

- **systemd unit** (`/etc/systemd/system/ais-ingest.service`):
  ```ini
  [Unit]
  Description=AIS ingest worker (AISStream → vessel_positions)
  After=network.target

  [Service]
  Type=simple
  WorkingDirectory=/srv/electsim
  ExecStart=/srv/electsim/.venv/bin/python -m etl.workers.ais_ingest_worker
  EnvironmentFile=/srv/electsim/.env
  Restart=always
  RestartSec=10

  [Install]
  WantedBy=multi-user.target
  ```

- **Docker Compose**:
  ```yaml
  ais-worker:
    image: electsim-backend:latest
    command: python -m etl.workers.ais_ingest_worker
    environment:
      AISSTREAM_API_KEY: ${AISSTREAM_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
    restart: unless-stopped
  ```

- **Railway/Fly** · proceso adicional con `Procfile`:
  ```
  worker: python -m etl.workers.ais_ingest_worker
  ```

### Comportamiento sin `AISSTREAM_API_KEY`

El worker loguea un warning y sale con código 0:
```
WARNING ais_ingest_worker · AISSTREAM_API_KEY no configurada · worker exit 0.
```
Las páginas `/puertos` seguirán funcionando en modo **synthetic** marcado en
cada card con badge SYNTH. El usuario sabe en todo momento qué dato es real.

### Detalles técnicos

- Lib: `websockets>=12.0` (asyncio-native)
- Reconnect con back-off exponencial · 1s → 60s
- Persistence via `etl.sources.ports.ais_client.persist_position(msg)`
- Upsert `INSERT ... ON CONFLICT (imo, ts) DO NOTHING` · idempotente
- `near_port_slug` se asigna best-effort buscando puerto a < 30nm
- MMSI → IMO resolution vía `vessels_master` (si está populada) · si no,
  guarda con prefijo `MMSI:<n>` para reconciliar luego

### Pipeline complementario

Una vez `vessel_positions` tiene datos, lanza el job de cómputo de port calls:

```bash
# Cada noche o cada 10 min (cron):
python -m etl.pipelines.ports.port_calls_compute
```

Detecta arrivals (vessel anchored ≥ 30 min) y cierra departures cuando el
buque sale del polígono del puerto. Pobla `port_call_events`.

---

## `commodity_alerts_worker` · evalúa reglas multi-condición

Ya documentado en `etl/sources/commodities/alerts_service.py`. Worker
existente del módulo Vesper.
