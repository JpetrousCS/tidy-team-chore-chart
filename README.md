# Tidy Team

A responsive interactive chore chart built with Next.js for GitHub, Vercel, and HubSpot iframe embeds.

## MVP features

- Household members and color-coded assignments
- Editable starter team: Charli, Andy, and Henry
- Daily and weekly chores
- One-tap completion toggles
- Point totals and weekly progress
- Daily cards and a full weekly matrix
- Add-chore modal with assignee, cadence, icon, and points
- Edit or delete chores and rename household members
- Personalized unicorn, race-car, and rocket completion celebrations
- Large touch targets for phones, tablets, touch displays, and kiosks
- Shared Postgres persistence in production
- Automatic browser-storage fallback when no database is configured
- Responsive layout and iframe-safe response headers

## Run locally

Use Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without a database, changes are saved in the current browser automatically.

## Shared persistence

Create a Postgres database (Vercel Marketplace → Neon is a convenient option). Copy `.env.example` to `.env.local`, then set `DATABASE_URL` to its connection string. The app creates its small `household_state` table on first use.

The MVP uses one shared household record. Before sharing publicly, add authentication and generate a household ID per signed-in household.

## Google, Apple/iCloud, and Outlook calendars

The family schedule combines standard private ICS feeds on the server. Calendar URLs are never bundled into browser code, but the event titles, times, and locations returned by the app are intentionally visible to anyone who can view the chore chart.

1. Copy the private ICS address from each calendar you want to show. Google Calendar calls this the **Secret address in iCal format**. Apple Calendar provides a `webcal://` link when a calendar is shared; change `webcal://` to `https://`. Outlook provides an ICS link when a calendar is published.
2. In Vercel, add a sensitive environment variable named `CALENDAR_FEEDS_JSON`.
3. Use one entry per calendar. Available types are `kids`, `work`, and `family`:

```json
[
  {"name":"Kid visits","url":"https://calendar.google.com/calendar/ical/PRIVATE/basic.ics","type":"kids"},
  {"name":"Family","url":"https://pXX-caldav.icloud.com/published/PRIVATE","type":"family"},
  {"name":"Work","url":"https://outlook.office365.com/owa/calendar/PRIVATE/calendar.ics","type":"work"}
]
```

Treat these feed URLs like passwords. Do not paste real URLs into source files or commit them to GitHub. Redeploy after adding or changing the variable. The schedule refreshes from its sources about every five minutes.

Because full details were intentionally enabled, use a private HubSpot page or add authentication before putting the chart on a public page if the calendars contain sensitive information.

## GitHub and Vercel

1. Create an empty GitHub repository.
2. Initialize Git in this project folder, commit the files, and push to the repository.
3. In Vercel, choose **Add New → Project**, import the GitHub repository, and keep the detected Next.js settings.
4. Add `DATABASE_URL` under **Project Settings → Environment Variables** for Production, Preview, and Development.
5. Deploy. Future pushes to the main branch deploy automatically.

No custom build command is needed; Vercel uses `npm run build`.

## HubSpot embed

Add a custom HTML module to a HubSpot page and replace the URL below with the Vercel production URL:

```html
<div style="width:100%;max-width:1200px;margin:0 auto;">
  <iframe
    src="https://YOUR-PROJECT.vercel.app"
    title="Interactive household chore chart"
    loading="lazy"
    style="display:block;width:100%;height:980px;border:0;border-radius:18px;overflow:hidden;"
    allow="clipboard-write"
  ></iframe>
</div>
```

For a tighter mobile embed, place this alongside the module:

```html
<style>
  @media (max-width: 600px) {
    iframe[title="Interactive household chore chart"] { height: 1250px !important; }
  }
</style>
```

`next.config.ts` deliberately omits `X-Frame-Options` and permits HTTPS parents through Content Security Policy. For a private production app, narrow `frame-ancestors` to your exact HubSpot domain.

## Main files

- `app/chore-chart.tsx` — UI, interactions, starter data, and client sync
- `app/api/state/route.ts` — persisted state API
- `lib/db.ts` — Postgres connection and table initialization
- `app/globals.css` — responsive visual system
- `next.config.ts` — iframe and security headers
