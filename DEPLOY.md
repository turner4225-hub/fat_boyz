# Fat Boyz — Deploy to Vercel

Your app is a standard Next.js 16 project. Vercel detects it automatically.
Production build was verified locally with `npm run build`.

## Before you start

- Supabase is set up and `supabase/schema.sql` has been run (see [SETUP.md](./SETUP.md)).
- You have your two keys handy (Supabase → **Project Settings** → **API**):
  - **Project URL** (e.g. `https://xxxx.supabase.co` — no `/rest/v1/` suffix)
  - **anon public** key

## Step 1 — Push the code to GitHub

Git is not initialized yet in this folder. From a terminal in `fat_boyz`:

```powershell
git init
git add .
git commit -m "Initial commit — Fat Boyz weight-loss challenge app"
```

Create a new empty repo on GitHub (https://github.com/new — name it `fat-boyz` or similar, **no** README/license).

Then connect and push (replace `YOUR_USERNAME`):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/fat-boyz.git
git branch -M main
git push -u origin main
```

`.env.local` is git-ignored — your secrets will **not** be pushed.

## Step 2 — Import into Vercel

1. Go to https://vercel.com and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. Import the `fat-boyz` repo you just pushed.
4. Vercel should auto-detect **Next.js**. Leave the defaults:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (or `npm run build`)
   - **Output Directory:** (leave blank — Next.js default)

## Step 3 — Add environment variables

Before clicking **Deploy**, expand **Environment Variables** and add:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |

Apply to **Production**, **Preview**, and **Development**.

## Step 4 — Deploy

Click **Deploy**. First build takes ~1–2 minutes. You’ll get a URL like `https://fat-boyz-xxxx.vercel.app`.

## Step 5 — Tell Supabase about your live URL

Auth cookies need your production domain whitelisted.

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g. `https://fat-boyz-xxxx.vercel.app`).
3. Under **Redirect URLs**, add the same URL plus:
   - `https://fat-boyz-xxxx.vercel.app/**`
   - `http://localhost:3000/**` (keep this for local dev)

Save. Log in on the live site to confirm auth works.

## Optional — custom domain

Vercel project → **Settings** → **Domains** → add your domain. Then update Supabase **Site URL** and **Redirect URLs** to match.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Vercel | Check the build log; run `npm run build` locally to reproduce. |
| Login works locally but not on Vercel | Env vars missing or wrong; confirm both `NEXT_PUBLIC_*` vars in Vercel. |
| “Invalid API key” | URL must be `https://xxx.supabase.co` only — no `/rest/v1/` path. |
| Sign-up says check email forever | Supabase → **Authentication** → **Providers** → Email: turn off “Confirm email” for a friends-only app, or configure SMTP. |

## Redeploying after changes

Push to `main` on GitHub — Vercel redeploys automatically.
