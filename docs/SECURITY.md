# Security model

## Principles

1. **No credentials.** The app never asks for an Instagram or Google login.
   Data comes from files the user exports and selects.
2. **No data egress.** Parsing and analysis are client-side only. The shipped
   CSP allows `connect-src 'self'` and no third-party endpoints; there are no
   analytics or trackers.
3. **Untrusted input handling.** Export HTML is user-supplied markup. It is
   parsed with DOMParser and only `href`/text is read; the markup is never
   written back into the DOM. A test asserts injected `onerror` handlers do
   not execute. React escapes all rendered usernames by default.
4. **Minimal headers.** `Content-Security-Policy` and `referrer: no-referrer`
   ship in index.html; tighten further (e.g. remove `unsafe-inline` styles)
   before production by moving inline styles to the built CSS asset.
5. **Outbound links** use `rel="noopener noreferrer"` and open instagram.com
   in a new tab; the app performs no account actions itself.

## ZIP ingestion bounds

Archive uploads are capped before and during decompression: 100 MB compressed
input, 20,000 entries, 50 MB per extracted entry, duplicate paths use the
first copy with a warning, and invalid archives are rejected before parsing.
A missing followers.html is surfaced as a visible warning, never silently
treated as an empty list. Client-side-only processing reduces attack surface
(no server to breach, no data to leak in transit) but is NOT a comprehensive
assurance: it does not protect against a compromised device, a malicious file
that exploits a parser bug, or supply-chain compromise of dependencies.

## Future work before any live integration

- If a backend is ever added (scheduled-export automation), it must come with
  its own threat model: OAuth token storage, Drive data handling, retention,
  and deletion on request.
- Any account action (unfollow etc.) requires an explicitly authorized and
  safe mechanism; it must never ride on scraped sessions.
- Dependency pinning and `npm audit` in CI before store submission.
