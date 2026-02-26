#!/usr/bin/env python3
"""Entry point to run the VAP Global Resources application."""

from dotenv import load_dotenv
import uvicorn

load_dotenv()  # Load environment variables from .env file

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
