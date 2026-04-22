.PHONY: check-env migrate

check-env:
	python bin/check_env.py

migrate: check-env
	@if [ -x ".venv/bin/alembic" ]; then \
		.venv/bin/alembic upgrade head; \
	else \
		python -m alembic upgrade head; \
	fi
