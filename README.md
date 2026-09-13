# Postcards & Little Footnotes 📮✨

> *A personal trip memory application — a box of things you brought home from a trip.*

**Postcards & Little Footnotes** is a lightweight, mobile-first Progressive Web App (PWA) designed to make capturing memories during a trip effortless and intimate. 

Collect photographs, sentences, strange little observations, and moments that would otherwise disappear.

---

## ✨ Features

- **⚡ Instant Capture**: Capture a photo, write a footnote caption, or both in seconds. Live-default or custom historical timestamps.
- **🖼️ Postcards & Little Footnotes Composition**: Photographs are rendered as tactile postcard prints; thoughts and marginalia are styled as intimate handwritten footnotes.
- **📅 Chronological Day-Grouped Timeline**: Moments automatically group into days with natural pacing and organic composition.
- **🤝 Shared Journeys & Collaboration**: Invite co-travelers to contribute memories to a single chronological journey. Manage travelers with granular permissions (add moments, edit own moments, delete own moments).
- **✍️ Quiet Author Attributions**: Unobtrusive typographic author attributions (`— Raj`, `— Ananya`) on shared postcards and footnotes without social feed clutter.
- **✉️ Seamless Invitations & SMTP Mailer**: Direct traveler search invitations and shareable private invite links with automated background SMTP invitation emails and in-app pending invite badges.
- **🗓️ Tactile Calendar & Date Presets**: Interactive inline calendar date picker with one-tap presets (*Undated*, *This Weekend*, *Next 7 Days*, *Custom Range*) and mobile swipe-to-dismiss bottom sheet.
- **🗺️ Interactive Desk Canvas (Zoom Out Mode)**: View your journeys scattered across an organic 2D tabletop workspace with smooth pan, zoom in/out, and reset controls.
- **📸 Drag-and-Drop & Apple HEIC Support**: Effortless photo drag-and-drop with transparent client-side on-demand HEIC/HEIF to JPEG WebAssembly conversion.
- **🔒 Privacy-First & Zero Tracking**: No analytics trackers, no advertising cookies, no data selling. Your photographs are securely stored in private Cloudflare R2 object storage with backend-signed short-lived URLs.
- **👤 Traveler Accounts**: Register and sign in with email/password. Demo trips are available for guests. Complete account data purge available at any time.
- **🗑️ Granular Ephemera Curation**: Delete an entire moment, or independently discard just the photo (retaining the footnote) or just the footnote (retaining the postcard).
- **📱 Installable PWA**: Fast offline-ready application shell caching with Web App Manifest and Service Worker (`postcards-shell-v6`).

---

## 🏗️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                      PWA Client                        │
│                                                        │
│ HTML5 / CSS3 / Vanilla JavaScript                      │
│ - SPA Hash Router (#auth, #trips, #trip/<id>, #invite) │
│ - Responsive Editorial & Tabletop Desk Canvas          │
│ - People & Invitations Roster & Granular Permissions   │
│ - Interactive Tactile Calendar & Date Presets          │
│ - Client-Side HEIC/HEIF WebAssembly Image Transcoder   │
│ - Service Worker Static Shell Cache (v6)               │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON (Bearer Token)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Flask Backend API                    │
│                                                        │
│ - Python 3.12+ managed via uv                          │
│ - Secure password hashing & signed session tokens      │
│ - Shared trip memberships & tokenized invite system    │
│ - Cloudflare R2 presigned & streaming direct uploads   │
│ - Non-blocking asynchronous SMTP email notification    │
│ - Health check endpoints (/api/health, /api/ping)      │
└──────────────┬───────────────────────────┬─────────────┘
               │ SQL (TLS)                 │ HTTPS
               ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│          TiDB Cloud          │ │        Cloudflare R2         │
│                              │ │                              │
│ - users                      │ │ - Private image storage      │
│ - trips (user_id FK)         │ │ - Presigned PUT / GET URLs   │
│ - trip_members (permissions) │ │ - Direct streaming fallback  │
│ - trip_invitations (tokens)  │ └──────────────────────────────┘
│ - moments (trip_id FK)       │
└──────────────────────────────┘
```

---

## 📁 Repository Structure

```text
.
├── .agents/
│   ├── PROJECT_INSTRUCTIONS.md   # Project rules and development principles
│   ├── architecture.md           # System architecture, schemas, and API design
│   └── design.md                 # Product vision, emotional goals, and UX specification
├── backend/
│   ├── app.py                    # Flask application factory & static SPA server
│   ├── config.py                 # Configuration loader from .env
│   ├── db.py                     # TiDB connection manager & query helpers
│   ├── init_tidb.py              # TiDB database and tables initialization script
│   ├── requirements.txt          # Python dependencies
│   ├── pyproject.toml            # uv project specification
│   ├── routes/
│   │   ├── auth.py               # Authentication & account management routes
│   │   ├── trips.py              # Trips CRUD & leave routes
│   │   ├── sharing.py            # Members, permissions, invites & user search
│   │   ├── moments.py            # Moments CRUD & granular deletion routes
│   │   └── uploads.py            # Presigned & direct image upload routes
│   ├── services/
│   │   ├── auth_service.py       # Password hashing & signed token sessions
│   │   ├── r2_service.py         # Cloudflare R2 boto3 client & presign generation
│   │   ├── email_service.py      # Zero-dependency background SMTP mailer
│   │   ├── trip_service.py       # Trip domain helpers
│   │   └── moment_service.py     # Moment domain helpers
│   └── tests/                    # Backend automated tests
├── frontend/
│   ├── index.html                # Single Page Application HTML shell
│   ├── manifest.json             # PWA Web App Manifest
│   ├── service-worker.js         # Service Worker for offline shell caching
│   ├── css/
│   │   ├── reset.css             # Modern CSS reset
│   │   └── styles.css            # Editorial stylesheet, desk canvas, modals, shared trips
│   └── js/
│       ├── api.js                # Centralized API client & bearer token auth
│       ├── app.js                # App lifecycle, routing, modals, toasts
│       ├── auth.js               # Sign in, registration, session management
│       ├── trips.js              # Trips collection, Desk Canvas, calendar picker
│       ├── people.js             # Shared trip roster & permissions management
│       ├── invitations.js        # Invitation acceptance & token preview
│       ├── moments.js            # Chronological timeline & quiet author attribution
│       ├── capture.js            # Capture modal, drag & drop, HEIC conversion
│       └── heic2any.min.js       # Client-side HEIC/HEIF WebAssembly converter
└── README.md
```

---

## 🚀 Quickstart

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (recommended) or Python 3.12+
- A [TiDB Cloud](https://tidbcloud.com/) Serverless cluster
- A [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) bucket
- *(Optional)* An SMTP email account (e.g. Gmail App Password) for invitation dispatching

### 1. Clone & Configure Environment
```bash
git clone https://github.com/rajaryn/Postcards-and-Little-footnotes.git
cd Postcards-and-Little-footnotes
```

Create `.env` inside `backend/` (or project root):
```ini
# Flask Config
SECRET_KEY=generate-a-strong-random-secret-key
PORT=5000
DEBUG=True

# TiDB Database
TIDB_HOST=your-cluster-host.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_user.root
TIDB_PASSWORD=your_password
TIDB_DATABASE=trip_moments

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=trip-moments

# SMTP Configuration (Optional for automated trip invitation emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_google_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Postcards & Little Footnotes
SMTP_USE_TLS=True
SMTP_USE_SSL=False
```

### 2. Configure Cloudflare R2 CORS (For Direct Browser Uploads)
Direct presigned browser uploads save server CPU/bandwidth and provide the fastest upload speeds. To allow the browser to PUT objects directly to your bucket:
1. Go to **Cloudflare Dashboard** → **R2 Object Storage** → Select **`trip-moments`** bucket.
2. Go to **Settings** → scroll to **CORS Policy** → click **Add CORS Policy**.
3. Paste the following JSON:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "https://postcards-and-little-footnotes.onrender.com",
      "https://*.pages.dev"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
*(Note: If CORS is not configured, the application automatically uses its built-in streaming proxy fallback to upload via the backend server).*

### 3. Initialize the Database
```bash
cd backend
uv run python init_tidb.py
```

### 4. Start the Application
```bash
uv run python app.py
```
Open your browser at `http://localhost:5000`.

---

## 🧪 Testing

Run backend test suite:
```bash
cd backend
uv run pytest
```

---

## 📜 License

MIT License. Designed with care for curious travelers.
