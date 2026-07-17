"""
Application settings loaded from environment variables.

Uses pydantic-settings (already installed) for clean, validated config.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Runtime configuration for PharmaPlan AI."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM Provider ──────────────────────────────────────────────────
    LLM_PROVIDER: str = "mock"
    """Which LLM provider to use: ``"mock"``, ``"openai"``, ``"google"``, or ``"anthropic"``."""

    # ── OpenAI ─────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    """API key for OpenAI (required when LLM_PROVIDER = ``"openai"``)."""

    OPENAI_MODEL: str = "gpt-4o-mini"
    """Model name to use for OpenAI completions."""

    # ── Google Gemini (AI Studio) ─────────────────────────────────────
    GEMINI_API_KEY: str = ""
    """API key for Google AI Studio / Gemini (required when LLM_PROVIDER = ``"google"``)."""

    GEMINI_MODEL: str = "gemini-2.0-flash"
    """Model name to use for Gemini completions."""

    # ── Anthropic (reserved for future use) ────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-latest"


# Single module-level instance — import and use directly.
settings = AppSettings()
