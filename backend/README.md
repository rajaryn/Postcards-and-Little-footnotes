# Postcards & Little Footnotes — Backend API

Backend API service for **Postcards & Little Footnotes** PWA built with Python, Flask, TiDB Cloud (MySQL-compatible relational database), Cloudflare R2 object storage, and background SMTP email notifications.

---

## 🛠 Tech Stack

* **Runtime:** Python 3.12+ (managed with [`uv`](https://docs.astral.sh/uv/))
* **Framework:** Flask 3.0+
* **Database:** TiDB Cloud (MySQL protocol with TLS/SSL encryption via `pymysql`)
* **Storage:** Cloudflare R2 via `boto3` (Presigned PUT/GET URLs & direct backend streaming fallback)
* **Authentication:** Password hashing via `werkzeug.security` & signed session tokens via `itsdangerous.URLSafeTimedSerializer`
* **Email Notifications:** Asynchronous background SMTP mailer (`smtplib` + `email.mime`) with anti-spam compliance headers (`Message-ID`, `Date`, `Auto-Submitted`, `X-Mailer`, `Reply-To`)

---

## 🚀 Setup & Running with `uv`

### 1. Install dependencies
```bash
uv sync
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory (or root):
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```ini
# Flask Configuration
SECRET_KEY=your-secure-random-secret-key
PORT=5000
DEBUG=True

# TiDB Database Configuration
TIDB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_user.root
TIDB_PASSWORD=your_tidb_password
TIDB_DATABASE=trip_moments
TIDB_SSL_CA=/path/to/tidb-ca.pem # optional if using system certs

# Cloudflare R2 Object Storage Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=trip-moments

# SMTP Email Configuration (Optional for trip invitation emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_google_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Postcards & Little Footnotes
SMTP_USE_TLS=True
SMTP_USE_SSL=False
```

### 3. Cloudflare R2 CORS Configuration
To enable high-performance direct browser uploads:
1. In Cloudflare Dashboard → R2 → Bucket `trip-moments` → **Settings** → **CORS Policy**.
2. Add the following policy:
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

### 4. Initialize Database Schema
Run the initialization script to create the `users`, `trips`, `trip_members`, `trip_invitations`, and `moments` tables in your TiDB cluster:
```bash
uv run python init_tidb.py
```

### 5. Run Development Server
```bash
uv run python app.py
```
The server will start at `http://localhost:5000` (serving both API endpoints and the frontend Single Page Application).

### 6. Run Automated Tests
```bash
uv run pytest
```

---

## 📡 API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new account (`email`, `password`, `username`) | No |
| `POST` | `/api/auth/login` | Log in and receive bearer token | No |
| `GET` | `/api/auth/me` | Fetch profile of authenticated user | Yes |
| `POST` | `/api/auth/logout` | Client logout | No |
| `DELETE` | `/api/auth/account` | Permanently delete account, trips, moments, and R2 images | Yes |

### 🗺 Trips & Shared Journeys (`/api/trips`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/trips` | List all trips for current user (owned or shared membership) | Optional |
| `POST` | `/api/trips` | Create a new trip (`name`, `start_date`, `end_date`) | Optional |
| `GET` | `/api/trips/<trip_id>` | Get details, user role, and permissions for a single trip | Optional |
| `DELETE` | `/api/trips/<trip_id>` | Delete a trip and its moments (creator only) | Yes |
| `POST` | `/api/trips/<trip_id>/leave` | Leave a shared trip (retains author attributions) | Yes |

### 👥 Shared Trips & Invitations (`/api/trips/<id>/members`, `/api/invitations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/trips/<trip_id>/members` | List travelers on trip with roles and permissions | Yes |
| `PATCH` | `/api/trips/<trip_id>/members/<user_id>` | Update member permissions (`can_add_moments`, `can_edit_moments`, `can_delete_moments`) | Yes |
| `DELETE` | `/api/trips/<trip_id>/members/<user_id>` | Remove a traveler from trip (creator only) | Yes |
| `GET` | `/api/users/search?q=<query>&trip_id=<id>` | Search travelers by email or name to invite | Yes |
| `GET` | `/api/trips/<trip_id>/invitations` | List pending invitations & active share links | Yes |
| `POST` | `/api/trips/<trip_id>/invitations` | Create direct invite or shareable link (dispatches background SMTP email) | Yes |
| `DELETE` | `/api/trips/<trip_id>/invitations/<id>` | Revoke pending invitation or link | Yes |
| `GET` | `/api/invitations/pending` | List authenticated user's pending incoming invitations | Yes |
| `GET` | `/api/invitations/<token>` | Privacy-first preview of an invitation | No |
| `POST` | `/api/invitations/<token>/accept` | Join shared trip via invite token | Yes |
| `POST` | `/api/invitations/<token>/decline` | Decline invitation | Yes |

### 📸 Moments (`/api/moments` & `/api/trips/<id>/moments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/trips/<trip_id>/moments` | List chronological moments for a trip with presigned photo URLs & author snapshots | Optional |
| `POST` | `/api/trips/<trip_id>/moments` | Add moment (`photo_key`, `caption`, `created_at`, coordinates) | Optional |
| `DELETE` | `/api/moments/<moment_id>` | Delete entire moment and its R2 image (creator or author) | Yes |
| `DELETE` | `/api/moments/<moment_id>/photo` | Delete only the photo from a moment (retaining footnote) | Yes |
| `DELETE` | `/api/moments/<moment_id>/footnote` | Delete only the footnote from a moment (retaining photo) | Yes |

### 📤 Image Uploads (`/api/uploads`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/uploads/presign` | Generate short-lived presigned PUT URL for direct browser upload to R2 | No |
| `POST` | `/api/uploads/direct` | Multipart streaming upload directly through backend to R2 | No |
| `PUT` | `/api/uploads/local-put` | Mock upload endpoint for local development without R2 | No |

### 🩺 Health & Keep-Alive (`/api/health`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint for uptime monitoring and keep-alive pings | No |
| `GET` | `/api/ping` | Alias ping endpoint | No |
