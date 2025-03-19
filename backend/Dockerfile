# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Install Rust and Cargo
RUN apt-get update && apt-get install -y curl && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    export PATH="$HOME/.cargo/bin:$PATH" && \
    rustup default stable

# Install the project into `/app`
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    export PATH="$HOME/.cargo/bin:$PATH" && uv sync --frozen --no-install-project --no-dev

# Then, add the rest of the project source code and install it
ADD . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    export PATH="$HOME/.cargo/bin:$PATH" && uv sync --frozen --no-dev

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 4040

ENTRYPOINT ["fastapi", "run", "src/main.py", "--port", "4040"]
