.PHONY: check-env migrate

check-env:
	python bin/check_env.py

migrate: check-env
	alembic upgrade head
