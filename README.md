# CCI Olu-Obasanjo Welcome Assistant (Vercel edition)

A public chat assistant for CCI Olu-Obasanjo that works for **everyone** (no Claude account needed), plus a private staff area.

* **Visitors**: `https://YOUR-PROJECT.vercel.app/`  - chat, directions, MAP / team / group finder, Membership Class encouragement, prayer & follow-up requests.
* **Staff**: `https://YOUR-PROJECT.vercel.app/admin`  - login, live inbox, urgent alerts, knowledge settings, private Worker assistant.
* **Smart answers** use the Anthropic API on the server (retrieve from the knowledge base, generate, then a guard blocks any time, link, handle or phone number that is not in the source text). If the AI is unavailable the bot falls back to its built-in rule-based answers.
* **Every chat is saved** and the follow-up team gets an **email** the moment a visitor asks for the team or has an urgent need.

## 1. Put it on GitHub (private repo!)
`private/worker.json` holds the worker-only knowledge, so keep the repository **private**.

## 2. Import into Vercel
Vercel dashboard -> Add New -> Project -> import the repo. No build settings are needed (static `public/` + `api/` functions).

## 3. Add storage (2 minutes)
Project -> Storage -> Marketplace -> **Upstash Redis** -> connect. This sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for you. (Without it, chats are kept in memory and are lost on every cold start, so do not skip this.)

## 4. Environment variables (Project -> Settings -> Environment Variables)
| Name | What |
|---|---|
| `ANTHROPIC_API_KEY` | from console.anthropic.com (enables smart answers) |
| `ANTHROPIC_MODEL` | optional, default `claude-haiku-5-5` (fast and cheap) |
| `RESEND_API_KEY` | from resend.com (sends the alert emails) |
| `EMAIL_FROM` | e.g. `CCI Olu-Obasanjo <alerts@yourdomain.org>` (use a domain you verified in Resend; `onboarding@resend.dev` only emails your own address while testing) |
| `FOLLOWUP_EMAIL` | the follow-up team inbox(es), comma separated |
| `SESSION_SECRET` | a long random string |
| `ADMIN_USERS` | JSON list of staff logins, see below |
| `PUBLIC_URL` | your site URL (used in the email link) |

### Creating staff logins
```
npm run hash -- "a-strong-password"      # prints scrypt$...$...
```
Put the result in `ADMIN_USERS`:
```
[{"email":"pastor@yourchurch.org","name":"Pastor Ada","hash":"scrypt$...","owner":true},
 {"email":"desk@yourchurch.org","name":"Information Desk","hash":"scrypt$..."}]
```
`owner:true` lets that person remove other admins from the alert list. After adding variables, **Redeploy**.

## 5. First-time checks
1. Open `/` and chat. The footer should say "Smart answers".
2. Say "I need prayer", then give a phone number: the follow-up inbox should receive an email.
3. Open `/admin`, sign in, tap **Alerts & team -> Register me for alerts** so you also get the emails.
4. In **Knowledge**, paste your confirmed service schedule if it changes (the bot gives it first).

## Updating the knowledge
* Day-to-day: `/admin` -> Knowledge (extra church information, service schedule) and Worker knowledge (private).
* Bigger changes (new documents): send them to whoever maintains the bot; `data/knowledge.json` is the public knowledge and `private/worker.json` the private one. The MAP leaders table, team contacts, transport groups and links live in `public/index.html` (search for `const MAPS=`).

## Privacy & safety built in
* Visitors can only read the public settings and write their own chat. Everything else needs an admin login (HttpOnly cookie, 12h, rate-limited).
* Worker knowledge and the Worker assistant are admin-only and never sent to the public page.
* Crisis messages, privacy refusals and consent are rule-based (the AI cannot override them).
* Visitors can delete their chat from the footer link.

## Local preview
```
cp .env.example .env     # fill in what you have
npm run dev              # http://localhost:3000   (admin at /admin)
```

## Limits to know about
* Admin live alerts refresh every few seconds only while the console is open; the **emails** are the real alert.
* Directions open Google Maps / Waze at the venue's exact coordinates (the app uses the person's own location). Other campuses use their address text.
* Third-party facts (other campuses' addresses and times, social handles) come from public CCI pages and can go out of date; the bot says so.
