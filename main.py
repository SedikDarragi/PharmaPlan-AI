"""
PharmaPlan AI — Backend entry point.

Usage
-----
    uvicorn main:app --reload          # development
    gunicorn main:app -w 4             # production (Render, etc.)
"""

import os
import uvicorn

from app.core.config import create_app
from app.routes.api import router

app = create_app()
app.include_router(router)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
