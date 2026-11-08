# מי לא עוקב אחריך (Followback)

Responsive web app (Hebrew, RTL) that analyzes the official Instagram
"Followers and following" data export and shows, by default, the accounts the
user follows that do not follow back, plus the remaining lists and analytics.

**Privacy by design: all parsing and analysis run in the browser. No account
credentials are requested and no data leaves the device.**

## Data source (current, honest)

The app reads the two HTML files Meta produces in its official export
(`following.html`, `followers.html`, found under
`connections/followers_and_following/`). It does NOT connect to Instagram,
and unfollow-style actions are links out to instagram.com, performed by the
user there. Automatic reading of recurring scheduled-export files and any
in-app account action depend on feasibility work that is still open
(see docs/ARCHITECTURE.md - "Open feasibility questions").

## Stack

- Vite + React + TypeScript (web, responsive, mobile-first, RTL)
- Domain logic in `src/domain/` as pure functions with Vitest unit tests
- UI in `src/ui/`, tested with Testing Library
- Capacitor wrapper config for store-ready Android/iOS builds

## Develop

```
npm install
npm run dev        # local dev server
npm run test       # all unit + UI tests
npm run build      # type-check + production build to dist/
```

## Mobile builds (store-ready)

The Capacitor config is in place (`capacitor.config.ts`, webDir `dist`).
Adding the native projects requires the platform toolchains and is done once:

```
npx cap add android   # needs Android Studio / SDK
npx cap add ios       # needs macOS + Xcode
npm run cap:sync      # rebuild web assets and copy into the native projects
```

## Cost constraint (binding)

Free tools and hosting only: no paid services, no trial plans that start
billing, no paid domain. A free hosting subdomain (for example
<name>.github.io via GitHub Pages, or the free tiers of Cloudflare/Netlify)
satisfies the public-URL requirement. Store submission is currently BLOCKED
by this constraint: Apple Developer Program costs $99/year
(https://developer.apple.com/programs/) and a Google Play developer account
costs $25 one-time; new personal Play accounts also face a closed-testing
requirement before production
(https://support.google.com/googleplay/android-developer/answer/14151465).
The Capacitor wrapper keeps the code store-ready for if/when that changes.
