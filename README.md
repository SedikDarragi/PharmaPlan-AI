<div align="center">

# PharmaPlan AI

**Executive Factory Intelligence Dashboard for Pharmaceutical Manufacturers**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

**Live demo** · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Docs](#-api-endpoints)

</div>

## 📖 Overview

PharmaPlan AI is a **B2B SaaS executive dashboard** that helps local pharmaceutical manufacturers optimise their production lines by:

1. **Scanning** unstructured public medication shortage bulletins (PDFs, circulars, tenders)
2. **Extracting** actionable shortage data via an AI/RAG (Retrieval-Augmented Generation) pipeline
3. **Running** a mathematical optimisation engine that re-allocates factory capacity to maximise revenue capture

The system is designed for **emerging-market pharmaceutical manufacturers** who need to respond to national drug shortages quickly. It connects to multiple data sources — from the US FDA's OpenFDA API to the Pharmacie Centrale de Tunisie (PCT) portal — and gracefully falls back to realistic cached data when live sources are unreachable.

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│                              │     │                              │
│   Data Sources               │     │   Factory Output             │
│                              │     │                              │
│  • OpenFDA (US FDA)  ────────┼─────┼──► Priority-ranked          │
│  • PCT (Tunisia)     ────────┼─────┼──► shortages found           │
│  • Mock / Simulated  ────────┼─────┼──► Optimised production      │
│                              │     │     schedule                 │
│   AI RAG Pipeline            │     │  • Before/after analysis     │
│  • OpenAI / Gemini / Mock ───┼─────┼──► Revenue impact ($595K+)   │
│                              │     │                              │
└──────────────────────────────┘     └──────────────────────────────┘
```

## ✨ Features

| Feature | Description |
|---|---|
| **📋 Factory Catalogue** | View your entire manufacturing capability — 6 molecules with dosage, form, capacity, and margin data |
| **🔍 Multi-Source Shortage Ingestion** | Pull shortage data from OpenFDA (live, free, no API key), from the PCT Tunisian portal, or from mock/simulated bulletins |
| **🤖 Pluggable AI RAG Pipeline** | Parse messy regulatory text with OpenAI, Google Gemini, or a deterministic regex mock — all interchangeable at runtime |
| **⚡ Production Optimisation Engine** | Re-allocate production lines with a mathematical algorithm: `Optimized Boxes = Min(Remaining Capacity, National Deficit)` |
| **📊 Executive KPIs** | Animated counters showing capacity load, shortage matches, uncaptured revenue, and captured revenue |
| **🔄 Live PCT Sync** | Background scraper that polls the Pharmacie Centrale de Tunisie portal with automatic PDF text extraction and real-time connection state indicators |
| **📱 Molecule Detail Drawer** | Deep clinical knowledge panel — ATC codes, brand aliases, mechanism of action, therapeutic class, and safety warnings |
| **📈 Before/After Comparison** | Per-line allocation breakdown with delta badges and aggregate financial impact |
| **🎯 Activity Feed** | Real-time event log showing every pipeline action with colour-coded timestamps |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)              │
│   ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐ │
│   │Factory   │ │Deficit   │ │KPI      │ │Before/After│ │
│   │Catalog   │ │Feed      │ │Cards    │ │Comparison  │ │
│   └──────────┘ └──────────┘ └─────────┘ └────────────┘ │
│   ┌──────────┐ ┌──────────┐ ┌─────────┐                │
│   │Molecule  │ │Capacity  │ │Activity │                │
│   │Detail    │ │Gauge     │ │Feed     │                │
│   └──────────┘ └──────────┘ └─────────┘                │
└──────────────────────┬───────────────────────────────────┘
                       │ Vite Proxy (/api → :8000)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    Backend (FastAPI + Uvicorn)           │
│                                                          │
│   ┌──────────────┐  ┌──────────────────────────────┐    │
│   │  Routes      │  │  Core Services                │    │
│   │  /api        │  │  ┌────────────────────────┐   │    │
│   │              │  │  │  LLM Abstraction       │   │    │
│   │  /inventory  │  │  │  • MockLLMClient       │   │    │
│   │  /upload-    │  │  │  • OpenAILLMClient     │   │    │
│   │    circular  │  │  │  • GoogleLLMClient     │   │    │
│   │  /optimize-  │  │  └────────────────────────┘   │    │
│   │    schedule  │  │  ┌────────────────────────┐   │    │
│   │  /sync-live- │  │  │  RAG Pipeline          │   │    │
│   │    pct       │  │  └────────────────────────┘   │    │
│   │  /pct-cache  │  │  ┌────────────────────────┐   │    │
│   └──────────────┘  │  │  Optimisation Engine   │   │    │
│                      │  └────────────────────────┘   │    │
│                      │  ┌────────────────────────┐   │    │
│                      │  │  PCT Scraper           │   │    │
│                      │  └────────────────────────┘   │    │
│                      │  ┌────────────────────────┐   │    │
│                      │  │  Web Scraper (OpenFDA) │   │    │
│                      │  └────────────────────────┘   │    │
│                      └──────────────────────────────┘    │
│                                                          │
│   ┌──────────────┐  ┌──────────────────────────────┐    │
│   │  Models      │  │  In-Memory Database          │    │
│   │  (Pydantic)  │  │  (Factory Catalogue)         │    │
│   └──────────────┘  └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Source →   2. Scraper →   3. RAG Pipeline →   4. Optimizer →   5. Dashboard
                │               │                                      │
  OpenFDA       │   httpx      │  LLM parse        Math engine        Animated
  PCT Portal    │   BS4        │  Alias resolve    Line balance        KPIs
  Mock Circular │   pdfplumber │  Priority score   Revenue calc       Before/After
                │               │                                      │
                ▼               ▼                                      ▼
          Raw text        Structured JSON                         Executive view
          (messy)         (shortages + scores)                    (live updates)
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS | SPA with dark industrial cockpit theme |
| **Backend** | Python 3.11+ + FastAPI + Uvicorn | REST API with automatic OpenAPI docs |
| **LLM/ML** | OpenAI / Google Gemini / Regex Mock | Pluggable AI client with graceful fallback |
| **Scraping** | httpx + BeautifulSoup4 + pdfplumber | Live data ingestion from PCT portal |
| **Data** | Pydantic + In-memory Python lists | Validated schemas, swappable for SQL/Postgres |
| **External API** | OpenFDA (free, no API key) | US FDA drug shortage data |
| **Infrastructure** | Vite proxy (`/api → :8000`) | Dev proxy; production would use Nginx/Caddy |

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A terminal with bash

### 1. Clone & Install Backend

```bash
git clone https://github.com/your-org/pharmaplan-ai.git
cd pharmaplan-ai

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

This starts the Vite dev server at `http://localhost:5173` with automatic proxy to the backend.

### 3. Start the Backend

Open a **second terminal** in the project root:

```bash
source venv/bin/activate
uvicorn main:app --reload
```

The API is now live at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### 4. Open the Dashboard

Navigate to **`http://localhost:5173`** in your browser. You should see the PharmaPlan AI executive dashboard.

## ⚙️ Configuration

Create a `.env` file in the project root (optional — everything works with defaults):

```env
# LLM Provider: "mock", "openai", "google", or "anthropic"
LLM_PROVIDER=mock

# OpenAI (required if LLM_PROVIDER=openai)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Google Gemini (required if LLM_PROVIDER=google)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash

# Anthropic (reserved for future use)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

> **No configuration is required for the demo.** The default `mock` LLM provider is a fully deterministic regex engine that works offline with zero dependencies.

## 🎬 Demo Script (5-Minute Pitch)

Here's how to present PharmaPlan AI to stakeholders:

### Act 1: The Problem (30s)

> *"Tunisia's Pharmacie Centrale publishes drug shortage circulars as PDFs on their website — but there's no structured data feed. Pharma companies need to ingest that unstructured data, extract shortages, and optimise production."*

### Act 2: Live Data from OpenFDA (2 min)

Click **"Live Data"** → the system fetches real shortage data from the US FDA.

1. A bulletin populates with actual drug names and shortage quantities
2. Click **"Submit to RAG Engine"** → the LLM parses it into structured shortages
3. Click a row → the **Molecule Detail Drawer** opens with clinical data

> *"The RAG pipeline identified shortages matching molecules our factory can produce — each with variant names, deficit volumes, and priority scores."*

### Act 3: AI Optimisation (1 min)

Click **"Apply AI Line Optimization"** → the mathematical engine re-allocates capacity.

- Before/after comparison table animates in
- KPI counters animate from baseline to optimised values
- Capacity gauge ticks up (65% → 88%)
- Revenue captured: **+$595,000**

### Act 4: PCT Sync Architecture (1 min)

Click **"Sync Live PCT Network Feeds"** → the scraper attempts a live connection.

- If PCT is unreachable (geo-blocked), a **fallback indicator** appears: ⚠️ Fallback Mode
- The dashboard still shows rich Tunisian pharmaceutical shortage data
- A **Retry** button lets you re-connect

> *"The system is designed for emerging markets — it's resilient enough to handle unreliable data sources. When the PCT site is reachable, it scrapes live circulars and extracts PDF content. When it's not, the fallback cache ensures the demo never breaks."*

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/inventory` | Full factory catalogue with capacities and margins |
| `GET` | `/api/mock-public-circular` | Simulated regulatory bulletin (deterministic) |
| `GET` | `/api/live-public-circular` | Real shortage data from OpenFDA |
| `POST` | `/api/upload-circular` | Run RAG pipeline on a raw circular text |
| `POST` | `/api/optimize-schedule` | Execute the optimisation engine |
| `POST` | `/api/sync-live-pct` | Trigger PCT live sync (auto-process option) |
| `GET` | `/api/pct-cache` | Inspect current PCT cache state |

Full interactive documentation at **`http://localhost:8000/docs`** (Swagger UI).

## 📁 Project Structure

```
pharmaplan-ai/
├── main.py                          # FastAPI entry point
├── requirements.txt                 # Python dependencies
├── .env                             # Environment variables (optional)
│
├── app/
│   ├── core/
│   │   ├── config.py                # FastAPI app factory + CORS
│   │   ├── settings.py              # Pydantic settings from env vars
│   │   └── llm.py                   # LLM abstraction (Mock/OpenAI/Gemini/Anthropic)
│   │
│   ├── models/
│   │   ├── schemas.py               # All Pydantic models
│   │   └── database.py              # In-memory factory catalogue
│   │
│   ├── routes/
│   │   └── api.py                   # All REST API endpoints
│   │
│   ├── services/
│   │   ├── pct_scraper.py           # PCT live scraper + PDF extraction + fallback
│   │   ├── rag_pipeline.py          # RAG orchestrator
│   │   ├── optimizer.py             # Production optimisation engine
│   │   └── web_scraper.py           # OpenFDA web scraper
│   │
│   └── utils/
│       └── mock_data_generator.py   # Synthetic bulletin generator
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js               # Vite config with /api proxy
    ├── tailwind.config.js
    └── src/
        ├── main.jsx                 # React entry point
        ├── App.jsx                  # Root component (state + orchestration)
        ├── api.js                   # API client (all fetch wrappers)
        ├── index.css                # Tailwind + custom styles
        ├── data/
        │   └── molecules.js         # Pharmaceutical knowledge base
        └── components/
            ├── FactoryCatalog.jsx           # Molecule table with capacity bars
            ├── DeficitFeed.jsx              # Shortage ingestion + PCT sync
            ├── KpiCards.jsx                 # Animated KPI counters
            ├── MoleculeDetailDrawer.jsx     # Clinical detail side panel
            ├── CapacityGauge.jsx            # SVG donut gauge with animation
            ├── BeforeAfterComparison.jsx    # Optimisation comparison table
            └── ActivityFeed.jsx             # Real-time event log
```

## 🧠 How the RAG Pipeline Works

The mock LLM (deterministic, offline) uses three regex passes to extract shortages:

1. **Standard line items** — matches `"01. Paracetamol 500mg COMPRIME -- Qte: 180,000"`
2. **Postes Infructueux** — matches `"POSTE N° 401: PARACETAMOL 500MG -- QUANTITE NON SERVIE: 65,000"`
3. **Generic fallback** — matches any known molecule alias followed by a quantity

Each match goes through **alias resolution** — drug variants like `"Glucophage 850"` are mapped to `"Metformin"`, `"Amoxil 1000"` to `"Amoxicillin"`, etc. Priority scores (1–10) are computed from the deficit volume using calibrated thresholds.

## 🔐 Data Sources & Provenance

| Source | Type | Status | Notes |
|---|---|---|---|
| **OpenFDA** | Live REST API | ✅ Always available | US FDA drug shortages, free, no API key |
| **PCT Portal** | Live web scrape | ⚠️ Geo-restricted | `phct.com.tn` — requires Tunisian IP |
| **Mock (deterministic)** | Local generation | ✅ Always available | Realistic simulated data for demos |

> **Note on PCT data:** The Pharmacie Centrale de Tunisie does not maintain a public-facing digital shortage database. Shortages are communicated via PDF circulars and "Postes Infructueux" (unsuccessful tender) notices published on their Joomla-based portal. Our scraper attempts live HTML/PDF parsing, then falls back to realistic Tunisian pharmaceutical data mirroring real-world patterns.

## 🧪 Extending

### Adding a New LLM Provider

1. Create a class extending `LLMClient` in `app/core/llm.py`
2. Implement `parse_circular(self, raw_text: str) -> list[dict]`
3. Include automatic fallback to `MockLLMClient` on failure
4. Register it in the `provider_map` dict in `get_llm_client()`

### Adding a New Data Source

1. Create a scraper module in `app/services/`
2. Add a new endpoint in `app/routes/api.py`
3. Add the API function in `frontend/src/api.js`
4. Wire it into the `DeficitFeed` component

### Connecting a Real Database

The factory catalogue lives in `app/models/database.py` as an in-memory list. Replace with SQLite/Postgres by swapping the module to query your database and returning the same `list[ActiveMolecule]` format.

## 📝 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for the Tunisian pharmaceutical industry
</div>
