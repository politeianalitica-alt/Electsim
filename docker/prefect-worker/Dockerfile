FROM prefecthq/prefect:2-python3.11

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY . .

RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install -e .

CMD ["prefect", "worker", "start", "--pool", "electsim-pool"]
