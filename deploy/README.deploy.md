# OfferDent — Self-Hosting Guide

Everything you need to run this app on your own server with your own database.

Two parts: **the app** (this repo) and **the backend** (Postgres + auth + storage).

---

## 1. Get the code

Project settings → GitHub → Connect, then:

```bash
git clone <your-repo-url> offerdent
cd offerdent
bun install     # or: npm install
```

Stack: TanStack Start (React 19, Vite 7, Tailwind v4). Builds to a Node/Cloudflare/Vercel-compatible server bundle.

---

## 2. Stand up the backend

You need a Postgres with Supabase's `auth` + `storage` layers. Two options:

**A. Supabase Cloud (easiest)** — create a project at supabase.com, then continue below.

**B. Self-hosted Supabase** — `git clone https://github.com/supabase/supabase`, then `cd docker && cp .env.example .env && docker compose up -d`. Set your own JWT secret, DB password, and dashboard credentials in that `.env`.

### 2.1 Apply the schema

`deploy/schema.sql` is every migration concatenated in order — all tables, RLS policies, GRANTs, triggers, and RPCs.

```bash
psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" -f deploy/schema.sql
```

Or, with the Supabase CLI (keeps the migration history intact — preferred):

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push          # applies supabase/migrations/* one by one
```

### 2.2 Create storage buckets

Two **private** buckets are required (the app hands out signed URLs):

| Bucket     | Contents                 |
| ---------- | ------------------------ |
| `products` | Product photos (WebP)    |
| `banners`  | Banner/promo creatives   |

Storage → New bucket → uncheck "Public". The object-level RLS policies come from `schema.sql`, so create the buckets **before** running it (or re-run the storage-policy statements after).

### 2.3 Auth settings

- Email confirmations: **on** (no auto-confirm).
- Anonymous sign-ins: **off**.
- Google provider: enable it and paste your own Google OAuth client ID/secret.
- Site URL + redirect URLs: your production domain.

### 2.4 First admin

Admin is gated on phone `07701727117` by the `public.claim_admin()` function. To use a different number, edit that function:

```sql
CREATE OR REPLACE FUNCTION public.claim_admin() ... -- change the allowed phone
```

Then sign up with that phone and call `select public.claim_admin();` as that user, or insert directly:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<auth-user-uuid>', 'admin');
```

---

## 3. Environment variables

Copy `deploy/.env.example` to `.env` at the repo root and fill it in. Summary:

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | browser | client DB access (RLS applies) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server | SSR + authenticated server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | server, secret | privileged admin operations |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | server | web push |
| `QI_API_HOST`, `QI_TERMINAL_ID`, `QI_USERNAME`, `QI_PASSWORD`, `QI_WEBHOOK_PUBLIC_KEY` | server | QiCard payments |
| `LOVABLE_API_KEY` | server | AI product listing (swap for your own LLM key) |
| `GOOGLE_MAPS_API_KEY` | server | address auto-fill from GPS |

Generate a VAPID pair:

```bash
bunx web-push generate-vapid-keys
```

---

## 4. Build & run

```bash
bun run build
```

Output is in `.output/`. Serve it:

```bash
node .output/server/index.mjs        # default port 3000
```

Behind nginx:

```nginx
server {
  server_name yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Use Certbot for TLS. **HTTPS is mandatory** — web push and geolocation refuse to run on plain HTTP.

Keep it alive with pm2 or a systemd unit:

```ini
[Service]
WorkingDirectory=/srv/offerdent
EnvironmentFile=/srv/offerdent/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
```

Cloudflare Workers / Vercel also work — the build already targets an edge-compatible runtime.

---

## 5. Move your existing data

Schema only lives in `schema.sql`; rows do not. To carry the current data over:

```bash
# from the old database
pg_dump --data-only --schema=public --no-owner "OLD_CONNECTION_STRING" > data.sql
# into the new one
psql "NEW_CONNECTION_STRING" -f data.sql
```

Auth users live in the `auth` schema — export them with `pg_dump --data-only --schema=auth`, or re-invite users if you'd rather start clean. Storage objects need to be copied bucket-to-bucket (Supabase CLI or the S3-compatible endpoint).

Order of operations: `schema.sql` → `auth` data → `public` data → storage files.

---

## 6. Android APK

`capacitor.config.ts` points `server.url` at the hosted site. Change it to your domain, then:

```bash
bunx cap sync android
cd android && ./gradlew assembleRelease
```

Signed release APK lands in `android/app/build/outputs/apk/release/`.

Note: the Capacitor WebView cannot receive web push. For notifications inside the APK, add Firebase Cloud Messaging (`google-services.json`) — push in the browser and installed PWA works as-is.

---

## 7. Post-deploy checklist

- [ ] Sign up a dentist account, place an order end to end
- [ ] Vendor signup wizard → approve in Admin → Vendors
- [ ] Upload a product photo (confirms buckets + policies)
- [ ] Enable notifications, send a test push
- [ ] QiCard sandbox payment, then flip `QI_API_HOST` to production
- [ ] Confirm reward points accrue on a confirmed order
- [ ] Admin → Theme editor saves and applies

---

## What is portable and what is not

**Portable:** all app source, the full SQL schema (tables, RLS, GRANTs, triggers, RPCs), your data via `pg_dump`, the Android project.

**Not portable:** the managed hosting layer itself — build pipeline, secret storage, and preview environment. You replace those with your own server, `.env` file, and CI.
