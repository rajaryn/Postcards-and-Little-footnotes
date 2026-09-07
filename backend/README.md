# Postcards & Little Footnotes Backend

Backend API service for Postcards & Little Footnotes PWA built with Python, Flask, and TiDB as the sole relational database.

## Setup & Running with `uv`

1. **Install dependencies:**
   ```bash
   uv sync
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and configure your TiDB and Cloudflare R2 credentials:
   ```bash
   cp .env.example .env
   ```

3. **Run development server:**
   ```bash
   uv run python app.py
   ```

4. **Run tests:**
   ```bash
   uv run pytest
   ```
