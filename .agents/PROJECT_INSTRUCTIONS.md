
# Postcards & Little Footnotes — Development Instructions

## 1. Purpose

This file contains the development rules for the Postcards & Little Footnotes project.

Before making changes, read:

```text
architecture.md
design.md
PROJECT_INSTRUCTIONS.md
```

These documents are the source of truth for the application's architecture, product behavior, and development conventions.

---

# 2. Core Product Rule

The application exists to make capturing a moment during a trip extremely fast.

The primary interaction is:

```text
Something happens
→ Capture
→ Optional caption
→ Post
→ Continue the trip
```

Do not allow technical implementation or feature additions to turn the application into:

* A photo management system
* A Google Drive clone
* A social network
* A map-first travel application
* A complicated journaling application

When in doubt, prefer the simpler implementation.

---

# 3. Before Making Changes

Before modifying the project:

1. Read `architecture.md`.
2. Read `design.md`.
3. Inspect the relevant existing code.
4. Understand how the requested change fits the current architecture.
5. Avoid changing unrelated code.
6. Do not introduce new dependencies unless they are genuinely necessary.

If an existing implementation conflicts with the documentation, determine whether the documentation or implementation is outdated before proceeding.

---

# 4. Architecture Rules

The current stack is:

```text
Frontend:
HTML
CSS
Vanilla JavaScript

Backend:
Python (managed via uv)
Flask

Database:
TiDB
MySQL-compatible SQL connector

Application type:
PWA
```

Do not introduce React, Vue, Angular, Next.js, or another frontend framework unless explicitly requested.

Do not replace Flask unless explicitly requested.

Do not replace TiDB unless explicitly requested.

---

# 5. Database Rules

The primary entities are:

```text
Trip
Moment
```

Relationship:

```text
Trip 1 ─────── N Moments
```

A moment may contain:

```text
photo
caption
```

Both are optional individually, but a moment must contain at least one.

Do not create separate database tables for days.

Days are derived from moment timestamps.

Do not create unnecessary tables for:

* Albums
* Categories
* Tags
* Locations
* Feeds
* Likes
* Comments

unless a future requirement explicitly introduces them.

---

# 6. API Rules

Keep API endpoints simple and predictable.

Current structure:

```text
GET    /api/trips
POST   /api/trips
GET    /api/trips/<trip_id>
DELETE /api/trips/<trip_id>

GET    /api/trips/<trip_id>/moments
POST   /api/trips/<trip_id>/moments

DELETE /api/moments/<moment_id>

POST   /api/uploads/presign
```

When adding an endpoint:

1. Follow existing naming conventions.
2. Validate input on the server.
3. Return JSON consistently.
4. Use appropriate HTTP status codes.
5. Never expose internal errors or secrets to the client.

---

# 7. Frontend Rules

Use vanilla JavaScript.

Prefer small, understandable modules.

Avoid:

* Global state unless necessary
* Giant JavaScript files
* Inline JavaScript in HTML
* Inline CSS in HTML
* Duplicate API logic
* Hardcoded backend URLs throughout the application

Centralize API communication where practical.

---

# 8. Image Rules

Images are stored outside TiDB in a private Cloudflare R2 bucket named `trip-moments`.

TiDB stores the R2 object key in `photo_key`.

When receiving an image request:

1. Validate the file type and size.
2. Generate the R2 object key server-side.
3. Generate a short-lived presigned PUT URL.
4. Upload the image directly from the browser to R2.
5. Store the R2 object key in TiDB.
6. Return the created moment or the information needed to display it.
7. Use short-lived presigned GET URLs for private image display.

Recommended object key:

```text
trips/<trip_id>/moments/<moment_id>.<extension>
```

Never trust the original filename.

Never expose R2 credentials to the frontend.

Never make the R2 bucket public merely to simplify frontend image loading.

R2 credentials belong in backend environment variables, for example:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Do not commit these values to Git.

---

# 9. PWA Rules

The application should remain installable as a PWA.

Maintain:

```text
manifest.json
service-worker.js
```

When adding new static assets that affect the application shell, update the service worker cache strategy if required.

Do not claim offline support for functionality that has not actually been implemented.

---

# 10. UX Rules

The user should be able to capture:

```text
Photo only
Caption only
Photo + caption
```

Do not make unnecessary fields mandatory.

Do not ask the user to manually enter:

* Time
* Day
* Location
* Moment category

unless a future feature specifically requires it.

---

# 11. Responsive Design Rules

Design mobile-first.

The application should work well on:

```text
Mobile
Tablet
Desktop
```

Do not sacrifice the mobile capture experience to optimize desktop layouts.

---

# 12. Error Handling

Every user-facing operation should have an understandable failure state.

Examples:

```text
Couldn't upload the photo.
Try again.
```

instead of:

```text
500 Internal Server Error
```

Detailed technical errors should remain in server logs/development tooling.

---

# 13. Code Quality

Prefer:

* Clear names
* Small functions
* Simple control flow
* Parameterized SQL
* Reusable utilities
* Explicit error handling

Avoid premature abstraction.

Do not refactor unrelated parts of the project while implementing a small feature.

---

# 14. Documentation Update Rule

## CRITICAL

After **every meaningful project change**, update:

```text
architecture.md
design.md
```

Do not treat these files as one-time documentation.

They are living project specifications.

---

## 15. What Counts as a Meaningful Change?

Update the documentation when a change affects:

### Architecture

Examples:

* New database table
* Database schema change
* New API endpoint
* Removed API endpoint
* New backend service
* New dependency
* New storage mechanism
* Authentication
* Image-processing pipeline
* PWA architecture
* Offline synchronization
* Deployment architecture

Update `architecture.md`.

### Product or UX

Examples:

* New screen
* Removed screen
* New user flow
* Changed navigation
* Changed capture experience
* New interaction
* New UI component with product significance
* Changed information hierarchy
* New feature
* Changed product behavior

Update `design.md`.

### Both

If a change affects both system architecture and user experience, update both files.

---

# 16. Documentation Must Describe Reality

Never update documentation to describe a feature that has not actually been implemented.

Never leave documentation describing an implementation that no longer exists.

The documentation should represent the current state of the project.

---

# 17. Documentation Update Procedure

After implementing a meaningful change:

### Step 1

Review the code changes.

### Step 2

Determine whether the change affects:

```text
architecture.md
design.md
```

### Step 3

Update the relevant document(s).

### Step 4

Check for contradictions between:

```text
architecture.md
design.md
instructions.md
```

### Step 5

Keep the documentation concise.

Do not create documentation noise for trivial changes such as:

* Typo fixes
* Minor CSS adjustments
* Variable renaming
* Formatting changes
* Small bug fixes that do not alter architecture or behavior

---

# 18. Change Log

Maintain a short change log at the bottom of both `architecture.md` and `design.md` when useful.

Format:

```text
## Change Log

### YYYY-MM-DD
- Added moment deletion API.
- Added delete interaction to the timeline.
```

Do not record every tiny code change.

Record meaningful product or architectural changes.

---

# 19. Feature Development Process

For every feature:

```text
Understand requirement
        ↓
Inspect current implementation
        ↓
Check architecture.md
        ↓
Check design.md
        ↓
Implement smallest correct version
        ↓
Test
        ↓
Update documentation
        ↓
Check documentation consistency
```

Do not jump directly into implementation without understanding the existing project structure.

---

# 20. Scope Control

The MVP is intentionally small.

Do not add features simply because they seem technically interesting.

Current MVP:

```text
Create trip
View trips
Open trip
Capture moment
Optional photo
Optional caption
Chronological timeline
Delete moment
PWA installation
Basic asset caching
```

Not MVP:

```text
Authentication
Social network
Likes
Comments
Public profiles
Maps
AI summaries
Automatic videos
Advanced editing
Real-time collaboration
Advanced cloud image processing
```

Future features require explicit product direction.

---

# 21. Decision Principle

When two implementations are possible, prefer the one that:

1. Is simpler.
2. Is easier to understand.
3. Fits the existing architecture.
4. Has fewer dependencies.
5. Preserves the fast capture experience.
6. Is easier to change later.

The goal is not maximum technical sophistication.

The goal is a small, pleasant product that makes capturing trip memories effortless.


### 2026-09-08
- Standardized image storage on private Cloudflare R2.
- Required backend-generated presigned upload/download URLs.
- Required `photo_key` in TiDB instead of filesystem paths or permanent public image URLs.
