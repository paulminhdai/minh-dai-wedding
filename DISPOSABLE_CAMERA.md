# 🎞 Disposable Camera Feature

A "Once"-style guest photo experience: every guest snaps photos through their
phone, gets a 24-shot "roll", and the full gallery is revealed after the
wedding when the film "develops".

## Table of contents

- [What guests see](#what-guests-see)
- [Pages and routes](#pages-and-routes)
- [Quick start](#quick-start)
- [1 · Run the database migrations](#1--run-the-database-migrations)
- [2 · Configure Google Drive storage](#2--configure-google-drive-storage)
- [3 · Tune the bootstrap defaults via `.env`](#3--tune-the-bootstrap-defaults-via-env)
- [4 · Tune at runtime via `/admin`](#4--tune-at-runtime-via-admin)
- [5 · Print a QR code for the reception](#5--print-a-qr-code-for-the-reception)
- [How it works](#how-it-works)
- [Moderation](#moderation)
- [API surface](#api-surface)
- [Troubleshooting](#troubleshooting)
- [Files added](#files-added)

---

## What guests see

```
First visit to wedding site         Click "Pick up your camera"
─────────────────────────           ───────────────────────────
┌──────────────────────┐            ┌──────────────────────┐
│  📷 New for our day  │            │  Đ & M · 2026        │
│  Be our photographer │            │   ┌───────────────┐  │
│                      │     ──►    │   │  [viewfinder] │  │
│  Help us capture     │            │   └───────────────┘  │
│  every angle...      │            │   Roll: 24 of 24     │
│                      │            │   ●○○○○○○○○○○○○○○○○ │
│  [ Pick up your... ] │            │     [SHUTTER]        │
└──────────────────────┘            └──────────────────────┘

After the wedding (June 27)         Click any polaroid
─────────────────────────           ─────────────────
┌──────────────────────┐            ┌──────────────────────┐
│  THE ROLL            │            │  [full-size lightbox]│
│  ┌────┐ ┌────┐ ┌────┐│            │                      │
│  │poly││poly││poly││            │   "First dance!"      │
│  └────┘ └────┘ └────┘│            │   — Linda            │
│  ┌────┐ ┌────┐ ┌────┐│            │                      │
│  │poly││poly││poly││            │   ‹  ›  ×             │
└──────────────────────┘            └──────────────────────┘
```

## Pages and routes

| Path | Purpose |
|---|---|
| `/` | Home page. First-time visitors see a popup advertising the camera (admin-controlled). |
| `/camera` | Disposable camera UI. Guests open via QR code, snap up to 24 photos. |
| `/gallery` | The shared roll. Locked countdown until reveal time, then a polaroid masonry grid with lightbox. |
| `/admin` | Couple-only dashboard. Toggle popup, set reveal date, moderate photos. |

---

## Quick start

If you've already cloned the repo and deployed the rest of the wedding site,
adding the disposable camera takes about **15 minutes**:

```bash
# 1. (If not already done) install dependencies
npm install

# 2. Open Supabase SQL editor and run BOTH migrations in order:
#    database/migrations/005-disposable-camera.sql
#    database/migrations/006-wedding-settings.sql

# 3. Drop your service account JSON key into .env (base64-encoded)
echo "GOOGLE_SERVICE_ACCOUNT_KEY=$(base64 -i ~/Downloads/key.json | tr -d '\n')" >> .env

# 4. Have the service account create the Drive folder it owns
npm run setup-drive
# Paste the printed GOOGLE_DRIVE_FOLDER_ID into your .env

# 5. Restart the server
npm start
```

Visit `http://localhost:3000/admin` → the **📷 Camera Settings** panel —
that's where you tune everything from here on out.

---

## 1 · Run the database migrations

Open the [Supabase SQL editor](https://app.supabase.com/) and paste **both**
of these (in order):

| Migration | Creates |
|---|---|
| `database/migrations/005-disposable-camera.sql` | `photos` and `photographers` tables, photo-count trigger, `public_photos` view, photo-related `admin_action` enum values |
| `database/migrations/006-wedding-settings.sql`  | `wedding_settings` singleton table that drives the home-page popup toggle and gallery reveal date |

Both migrations are idempotent — safe to re-run.

---

## 2 · Configure Google Drive storage

The feature falls back to local disk (`data/uploads/`) when Drive isn't
configured — fine for development but **not** for production. For the real
wedding, use Google Drive (15 GB free is plenty for ~3,600 photos).

### 2a · Create the service account

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a
   project (or pick an existing one), and enable the **Drive API**.
2. **APIs & Services → Credentials → Create credentials → Service account.**
   Give it a name (e.g. `wedding-camera`). No roles needed.
3. Open the service account → **Keys → Add Key → JSON**. Save the file.

### 2b · Encode the key into your `.env`

Encode the JSON key on a single line so it survives env files:

```bash
base64 -i path/to/key.json | tr -d '\n'
```

Paste the output into `.env` as:

```bash
GOOGLE_SERVICE_ACCOUNT_KEY=<the base64 string>
```

> Raw JSON also works, but most platforms strip newlines from multi-line env
> values which corrupts the embedded `private_key`. Base64 is safer.

### 2c · Create the Drive folder

> **Why not just share an existing folder with the service account?**
> Google enforces a per-day sharing quota on consumer Gmail accounts, and
> brand-new service accounts often trip a spam-filter heuristic. You'll see
> *"Sorry, you have exceeded your sharing quota"*. To avoid that entirely,
> we let the service account create + own the folder itself.

Run:

```bash
npm run setup-drive
```

This authenticates as your service account, creates a folder called
`Wedding Disposable Camera`, and prints its ID. Paste that ID into `.env`:

```bash
GOOGLE_DRIVE_FOLDER_ID=<id printed by the setup-drive script>
```

To also have the folder show up in your personal **My Drive** (so you can
browse photos as they come in during the reception), pass your email:

```bash
npm run setup-drive -- you@gmail.com
```

The service-account-to-personal-email share direction has different quota
rules and usually works fine, even when the reverse direction was blocked.
You'll get a Gmail invite — accept it and the folder appears in your sidebar.

You can always browse the folder directly via the URL the script prints,
even without sharing it back to your personal account.

---

## 3 · Tune the bootstrap defaults via `.env`

```bash
# How many shots per device (24 = like a real disposable camera)
PHOTOS_PER_ROLL=24

# When to reveal the gallery. ISO 8601 with timezone.
# Default: midnight after the wedding, Pacific time.
# NOTE: this is just the bootstrap default — once the wedding_settings
# table has a row, the admin panel takes precedence at runtime.
GALLERY_REVEAL_AT=2026-06-27T00:00:00-07:00
```

These are read once at server boot. For day-to-day adjustments, use
`/admin` instead.

---

## 4 · Tune at runtime via `/admin`

Log into the admin dashboard. The **📷 Camera Settings** panel sits just
above the photo moderation section.

### Popup controls

| Control | What it does |
|---|---|
| **Enable popup toggle** | Turns the home-page "new feature" popup on or off site-wide |
| **Title / Message / Button label** | Customize all three. Supports Vietnamese diacritics, emoji, anything. Changing the text re-shows the popup to returning visitors (content-hash-keyed dismissal) |

### Gallery reveal

| Control | What it does |
|---|---|
| **Reveal date/time picker** | Pick exactly when photos unlock for everyone. Times are in your local timezone. |
| **"Reveal now" preset** | Instantly unlocks the gallery (great the morning after the wedding) |
| **"Reset to default" preset** | Back to "midnight after the wedding, Pacific" |
| **Live status badge** | Shows e.g. "🔒 Hidden — reveals in 5d 17h" or "🟢 Revealed since Jun 27" |

Changes propagate within ~30 seconds (server-side cache TTL). All saves are
logged in the **Admin Activity Log** with the `settings_updated` action.

---

## 5 · Print a QR code for the reception

Print a small sign for table cards / signage that points to:

```
https://your-wedding-site.com/camera
```

Any free QR-code generator works (e.g. [qr-code-generator.com](https://www.qr-code-generator.com/)).

Suggested wording for the sign:

> 📷 **Be our photographer!**
> Scan to grab a 24-shot disposable camera roll.
> Snap candid moments — they'll all appear in the shared gallery the day after.

---

## How it works

### Storage math

- Each photo is auto-compressed (max 1600px edge, JPEG quality 80) to
  ~600 KB by `sharp`
- 150 guests × 24 photos × 600 KB ≈ **2.1 GB total** — comfortably inside
  Google Drive's 15 GB free tier
- All EXIF metadata is stripped on upload (privacy: removes GPS / device
  info from guests' phones)

### Roll-limit enforcement

A 1-year `wedding_device_id` cookie + matching `localStorage` UUID ties a
device to its photographer record. Server-side, every upload checks
`photographers.photo_count < PHOTOS_PER_ROLL` before accepting. Plus an
IP-based rate limiter (12 uploads/minute) as belt-and-suspenders.

A determined teenager could bypass by clearing cookies + localStorage, but
for a wedding crowd this is plenty. If you want it bulletproof, RSVP-gate
each upload (give every invite a unique token).

### Reveal gating

The `/api/photos` endpoint returns `{ revealed: false, photos: [] }` until
the configured reveal time has passed. The `/gallery` page reads that flag
and renders either the countdown card or the masonry grid. Admins always
see all photos via `/api/admin/photos` regardless of reveal status.

### Settings caching

Settings are read from `wedding_settings` and cached in-process for 30 s.
Admin updates invalidate the cache immediately, so saves feel instant in
the dashboard. If Supabase is unreachable, the service falls back to
hard-coded defaults so the site never goes down because of settings issues.

---

## Moderation

In `/admin`, the **📷 Disposable Camera** section shows every photo with:

- **Hide / Unhide** — toggles `is_hidden`. Hidden photos disappear from
  the public gallery but stay in Drive.
- **Delete (🗑)** — soft-deletes the DB row AND removes the file from Drive.
- **Block uploader** — flips `photographers.is_blocked = true`. Their
  existing photos remain (you can hide them separately); they cannot
  upload any new ones.

All moderation actions are logged in the `admin_logs` table and surfaced
in the **Admin Activity Log** panel.

---

## API surface

### Public

```
POST   /api/photos                  multipart, field "photo" + display_name + caption?
GET    /api/photos                  list (gated until reveal time)
GET    /api/photos/roll-status      remaining shots for the current device
GET    /api/settings                popup + reveal config (cached 30s)
```

### Admin (JWT-protected)

```
GET    /api/admin/photos                          list all (incl. hidden)
GET    /api/admin/photographers                   list with per-person counts
PATCH  /api/admin/photos/:id                      body: { hidden, reason? }
DELETE /api/admin/photos/:id                      soft-delete + Drive cleanup
POST   /api/admin/photographers/:id/block         body: { reason? }
GET    /api/admin/settings                        full settings incl. updated_at
PATCH  /api/admin/settings                        body: {
                                                    camera_popup_enabled?,
                                                    camera_popup_title?,
                                                    camera_popup_body?,
                                                    camera_popup_cta?,
                                                    gallery_reveal_at?
                                                  }
```

---

## Troubleshooting

### `Sorry, you have exceeded your sharing quota` when sharing a folder to the service account

Don't share. Run `npm run setup-drive` instead — the service account
creates and owns the folder itself, sidestepping Google's per-day sharing
quota. See [§ 2c](#2c--create-the-drive-folder).

### Photos upload but never appear in the gallery

Check the reveal date in **/admin → Camera Settings**. If it's still in the
future, the public gallery shows the countdown only. Hit **"Reveal now"**
or set the date to a past time. Admins can also browse all photos via the
moderation panel regardless of reveal status.

### Photos save to `data/uploads/` instead of Drive

Either `GOOGLE_DRIVE_FOLDER_ID` or `GOOGLE_SERVICE_ACCOUNT_KEY` is missing
in `.env`. The storage adapter logs the active provider on boot:

```
📦 Photo storage: Google Drive          ← what you want in production
📦 Photo storage: local filesystem...   ← env vars not set
```

### `<img src>` for Drive photos returns 403 / broken images

Each uploaded file gets a per-file "anyone with the link can view"
permission. If you see broken images:
1. Open the photo's `public_url` directly in a browser. If Google blocks
   it, the permission didn't apply — check that the service account has
   access to the folder it's writing to.
2. Confirm CSP allows `https:` images — already configured in `server.js`.

### `npm run setup-drive` fails with `invalid_grant` or auth errors

The service account JSON key in `GOOGLE_SERVICE_ACCOUNT_KEY` is corrupted
(usually from newlines being stripped). Re-encode with
`base64 -i key.json | tr -d '\n'` and paste the result on a single line.

### Popup keeps showing even after I dismissed it

Dismissal is keyed on a hash of the popup's title + body + CTA. If you
edit any of those in admin, the popup re-shows once for returning
visitors (this is intentional — meaningful updates get re-surfaced). To
re-test from your own browser, clear `localStorage["wedding.cameraPopup.dismissedHash"]`.

### Settings changes don't take effect

The settings cache has a 30-second TTL. After hitting Save, give it half a
minute. If still stuck, check the server logs — if Supabase is
unreachable, the service silently falls back to hard-coded defaults.

---

## Files added

```
database/migrations/005-disposable-camera.sql   photos schema
database/migrations/006-wedding-settings.sql    settings singleton
lib/photoService.js                             upload pipeline + queries
lib/settingsService.js                          settings cache + accessors
lib/storage/index.js                            storage adapter selector
lib/storage/driveStorage.js                     Google Drive adapter
lib/storage/localStorage.js                     local-fs fallback
routes/photos.js                                public + admin photo routes
routes/settings.js                              public + admin settings routes
scripts/init-drive-folder.js                    one-time Drive folder setup
public/camera.html                              guest camera UI
public/gallery.html                             reveal gallery + lightbox
DISPOSABLE_CAMERA.md                            this doc
```

### Files modified

```
server.js                                       wired routes, CSP, /uploads
package.json                                    added setup-drive script + deps
public/index.html                               first-load popup HTML/CSS/JS
public/admin.html                               Camera Settings + moderation panels
env.example                                     new env vars
README.md                                       feature link
```
