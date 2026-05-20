# Forecast µservice · Politeia

Microservicio dedicado a forecasting de series temporales (commodities,
indicadores macro). Sustituye el stub `drift_naive_v1` del endpoint
`/api/v1/commodities/forecast` del backend principal.

## Modelos disponibles

| Modelo | Dep | Recomendado para |
|---|---|---|
| `prophet` | `prophet>=1.1.5` | Series >= 60 obs con estacionalidad |
| `auto_arima` | `statsforecast>=1.7` | Series cortas / sin estacionalidad clara |
| `naive_drift` | stdlib | Fallback siempre disponible |
| `auto` | — | Default · elige Prophet > AutoARIMA > naive |

Si la dep del modelo pedido no está instalada, el endpoint hace **fallback
automático a `naive_drift`** y lo señaliza en `model` y `warning`.

## API

### `POST /forecast`

Request:

```json
{
  "closes": [12.3, 12.5, 12.4, ...],
  "horizon": 30,
  "model": "auto",
  "start_date": "2026-05-20",
  "cv_window": 30
}
```

Response:

```json
{
  "model": "prophet",
  "horizon": 30,
  "n_obs": 365,
  "forecast": [
    {"date": "2026-05-21", "value": 12.55,
     "lower_80": 12.30, "upper_80": 12.80,
     "lower_95": 12.10, "upper_95": 13.00}
  ],
  "accuracy_mape_30d": 4.2,
  "accuracy_dir_pct": 58.6
}
```

### `GET /health`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "models": {"naive_drift": true, "prophet": true, "auto_arima": true}
}
```

## Local

### Sin Docker (Python 3.11)

```bash
pip install -r apps/forecast-service/requirements.txt
uvicorn apps.forecast_service.main:app --host 0.0.0.0 --port 8001
```

### Con Docker

```bash
docker build -t politeia/forecast-service:latest \
  -f apps/forecast-service/Dockerfile .
docker run --rm -p 8001:8001 politeia/forecast-service:latest
```

## Integración con backend principal

Backend principal lo descubre vía la variable de entorno:

```bash
export FORECAST_SERVICE_URL=http://forecast-service:8001
```

El cliente está en `etl/sources/commodities/forecast_client.py`. Si el
microservicio no está disponible o devuelve >5s, el endpoint
`/api/v1/commodities/{slug}/forecast` cae al stub `naive_drift` interno
sin romper la SPA.

## Tamaño imagen

- Base `python:3.11-slim`: ~120 MB
- Prophet + statsforecast + numpy + pandas: ~1.0-1.2 GB
- **Total estimado: ~1.2 GB**

Si quieres reducir, edita `requirements.txt` y deja solo uno de los dos
modelos. El otro hará fallback automático.
