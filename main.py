"""
PharmaPlan AI — Backend entry point.

Usage
-----
    uvicorn main:app --reload          # development
    uvicorn main:app --host 0.0.0.0    # production-ready
"""

import uvicorn

from app.core.config import create_app
from app.routes.api import router

app = create_app()
app.include_router(router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
