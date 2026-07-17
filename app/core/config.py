"""
Core application configuration.

Creates the FastAPI ASGI application with full CORS middleware
so the frontend can connect without cross-origin issues.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""" "
    app = FastAPI(
        title="PharmaPlan AI",
        description=(
            "B2B SaaS platform that helps local pharmaceutical manufacturers "
            "optimise production lines by scanning unstructured public "
            "medication shortage data."
        ),
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Tighten per environment in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
