# Forecast µservice · Politeia
# Imagen ~1.2GB · principalmente cmdstanpy + numpy + scipy
#
# Build:
#   docker build -t politeia/forecast-service:latest -f apps/forecast-service/Dockerfile .
#
# Run local:
#   docker run --rm -p 8001:8001 politeia/forecast-service:latest

FROM python:3.11-slim

# Build deps · necesarios para cmdstanpy + numpy compile
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia primero requirements para aprovechar cache de capa Docker
COPY apps/forecast-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Código del servicio
COPY apps/forecast-service /app/apps/forecast_service
RUN touch /app/apps/__init__.py

ENV PYTHONUNBUFFERED=1
ENV FORECAST_PORT=8001
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8001/health || exit 1

CMD ["uvicorn", "apps.forecast_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
