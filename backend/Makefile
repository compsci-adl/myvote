.PHONY: freeze deps dev start

dev:
	fastapi dev app/main.py

start:
	fastapi run app/main.py

freeze:
	uv pip freeze | uv pip compile - -o requirements.txt

deps:
	uv venv
	uv pip sync requirements.txt
