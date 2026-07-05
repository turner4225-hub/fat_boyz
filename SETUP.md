# Fat Boyz — Setup

This is the one part only you can do: create a free Supabase project (the
database + login system) and paste two keys into the app. ~5 minutes, no coding.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (free — you can use "Continue with GitHub" or email).
2. Click **New project**.
   - **Name:** `fat-boyz` (anything is fine)
   - **Database Password:** click *Generate* and save it somewhere safe (you won't need it day-to-day). 
   - **Region:** pick the one closest to you.
3. Click **Create new project** and wait ~2 minutes for it to finish setting up.

## 2. Create the database tables

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` in this project, copy everything, and paste it into the editor.
4. Click **Run** (or press Ctrl+Enter). You should see "Success".

That creates all the tables (challenges, members, weigh-ins) and the security rules.

## 3. Get your two keys

1. In the left sidebar, click **Project Settings** (the gear) → **API**.
2. You'll see:
   - **Project URL** — copy it.
   - **Project API keys → `anon` `public`** — copy it.

## 4. Put the keys into the app

1. In this project folder, make a copy of `.env.local.example` and name the copy `.env.local`.
2. Paste your values in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-long-key...
   ```

3. Save the file.

## 5. Run the app

In a terminal in the `fat_boyz` folder:

```
npm run dev
```

Then open http://localhost:3000 in your browser.

## 6. (Optional) Turn on password reset

For the "Forgot password?" link to work, Supabase needs to know it's allowed to
send people back to your app after they click the email link:

1. In the Supabase dashboard, go to **Authentication → URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and add both:
   - `https://fat-boyz-one.vercel.app/reset-password`
   - `http://localhost:3000/reset-password` (for local testing)
3. Save.

That's it — the reset email uses Supabase's built-in mailer. On the free tier
those emails are rate-limited, which is fine for the occasional reset.

---

Tell Claude once this is done ("Supabase is connected") and we'll build the
login screen, then challenges and weigh-ins on top of it.
