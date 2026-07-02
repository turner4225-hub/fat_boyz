# Fat Boyz — Push Notifications

Web Push for the Home Screen PWA: weigh-in reminders + custom messages from challenge hosts.

## 1. Run the database migration

In Supabase → **SQL Editor**, run the contents of `supabase/push.sql`.

This adds `push_subscriptions` and notification prefs on `profiles`.

## 2. Generate VAPID keys

In a terminal:

```bash
npx web-push generate-vapid-keys
```

Copy the **Public Key** and **Private Key**.

## 3. Add environment variables

### Local (`.env.local`)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:your@email.com
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Settings → API → service_role>
CRON_SECRET=<any long random string>
```

### Vercel (Project → Settings → Environment Variables)

Add the same variables for **Production** (and Preview if you want).

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public — safe in browser |
| `VAPID_PRIVATE_KEY` | Secret — server only |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret — needed to send push to other users |
| `CRON_SECRET` | Vercel cron auth; use a random string |

Redeploy after adding env vars.

## 4. How it works

### For your friends (members)

1. Open https://fat-boyz-one.vercel.app in **Safari** (iPhone)
2. **Add to Home Screen**
3. Open the app from the home screen icon
4. Go to **You** → **Enable notifications**
5. Optionally toggle **Weigh-in day reminders**

### For challenge hosts (admins)

On any challenge you created, scroll to **Send a push notification**. Enter a title and message — everyone in the challenge with notifications on gets it.

### Automatic weigh-in reminders

A Vercel cron job runs daily at **16:00 UTC** (~11am ET). On each challenge's `weigh_in_day`, members who haven't logged a weigh-in that day get a reminder.

## 5. Troubleshooting

| Problem | Fix |
|---------|-----|
| "Push is not configured" | Add VAPID keys to Vercel and redeploy |
| Enable button does nothing on iPhone | Must use Home Screen app, not Safari tab |
| Host send says nobody has notifications | Friends need to enable in **You** tab |
| Cron not firing | Vercel Hobby plan includes cron; check **CRON_SECRET** is set |

## Security notes

- Never commit `VAPID_PRIVATE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- Only challenge **hosts** (creators) can send custom broadcasts
- Service role is only used server-side for sending push
