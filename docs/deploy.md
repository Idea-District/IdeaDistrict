# Deploying on free tiers

| Part | Host | Config in repo |
|---|---|---|
| Database (Postgres) | Neon free | — |
| API (FastAPI) | Render free web service | `render.yaml` |
| Web (Next.js) | Netlify free | `apps/web/netlify.toml` |

Order matters: database → API → web → back to the API to allow the web address (CORS).

## 1. Database — Neon
1. Sign up at neon.tech (GitHub login), create a project named `idea-district`, region **Asia Pacific (Singapore)**.
2. Copy the **connection string** (starts with `postgresql://…neon.tech/neondb?sslmode=require`).
   Keep it private; it is a password.

## 2. API — Render
1. Sign up at render.com (GitHub login), allow access to `Idea-District/IdeaDistrict`.
2. **New → Blueprint**, pick the repo and the branch to deploy. Render reads `render.yaml`.
3. When asked for the secret values:
   - `DATABASE_URL` = the Neon connection string
   - `AI_API_KEY` = the Mila key
   - `CORS_ORIGINS` = `http://localhost:3100` for now (replaced in step 4)
4. Deploy. The start command migrates the database and seeds the six demo founders.
5. Open `https://<service>.onrender.com/v1/health` — expect `"status":"ok"` and `"database":"postgresql+psycopg"`.

## 3. Web — Netlify
1. Sign up at netlify.com (GitHub login). **Add new site → Import an existing project → GitHub** → the repo.
2. Branch: the same one as Render. **Base directory: `apps/web`** (build command and publish dir come from `netlify.toml`).
3. **Environment variables → Add**: `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
4. Deploy. Optionally rename the site (Site configuration → Change site name).

## 4. Allow the web app to call the API
In Render → the service → Environment, set `CORS_ORIGINS` to the Netlify URL
(e.g. `https://idea-district.netlify.app`) and save; Render redeploys.

## Before showing a client
- Open the site a minute early: the free API sleeps after ~15 min idle and takes ~50 s to wake.
- If Mila misbehaves: Render → Environment → `AI_PROVIDER=mock` → save (offline scripted demo).
- Fresh demo data: Neon → SQL editor → drop and recreate the `public` schema, then redeploy the API
  (it re-migrates and re-seeds).
- Anyone with the link can run discovery and spend Mila credits. Share the link only with the client.
