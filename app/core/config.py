"""
Core application configuration.

Creates the FastAPI ASGI application with full CORS middleware
so the frontend can connect without cross-origin issues.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    app = FastAPI(
        title="PharmaPlan AI",
        description=(
            "B2B SaaS platform that helps local pharmaceutical manufacturers "
            "optimise production lines by scanning unstructured public "
            "medication shortage data."
        ),
        version="0.1.0",
    )

    allowed_origins = os.getenv("CORS_ORIGINS", "").split(",")
    allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

    if not allowed_origins or allowed_origins == ["*"]:
        allowed_origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
