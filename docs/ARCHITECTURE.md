# Architecture

## Layers

```
src/domain/            Pure TypeScript, no DOM or React imports
  types.ts             Shared entities (AccountEntry, FollowSnapshot, ...)
  parseExportHtml.ts   Meta export HTML -> AccountEntry[] (markup is read, never injected)
  parseExportJson.ts   Meta export JSON (followers shards / following wrapper) -> AccountEntry[]
  lists.ts             notFollowingBack / fansOnly / mutuals
  diff.ts              Membership changes between two snapshots
  analytics.ts         Aggregate counts and ratios
src/ui/                React components + loadSnapshot (File -> domain)
  App.tsx              Tabs: default "not following back", fans, mutuals, analytics
```

Rules:
- Domain modules stay UI-free and short; each function does one transformation.
- The UI only calls the domain through `loadSnapshot` and the list/analytics
  functions; no parsing logic lives in components.
- Tests sit next to their module in `__tests__/` and use fixtures that match
  the real observed export format (see `domain/__tests__/fixtures.ts`).

## Data flow

User picks the export ZIP or the two export files (HTML or JSON flavor, numbered shards merged) -> bounded streaming extraction -> parse ->
FollowSnapshot -> lists/analytics rendered. No network calls, no storage:
state lives in memory for the session only.

## Snapshot comparability

The export HTML files carry list entries; no account/date metadata has been
verified inside them. Comparability of two snapshots is therefore checked from
the export ZIP filename (instagram-<user>-<date>-<hash>.zip) when available.
A known account mismatch or reversed export dates blocks the comparison
outright; an unverifiable account shows a visible caveat. A missing followers
list makes the snapshot's derived lists unavailable rather than wrong.
Comparisons report list-membership differences only, in neutral wording,
never cause attribution.

## Open feasibility questions (do not code around these silently)

1. Automatic access to recurring scheduled-export files (Meta -> Google Drive,
   daily): drive.file scope is per-file via the Picker; whether folder
   selection covers current/future children is community-reported as NO but
   NOT empirically confirmed by us. Alternatives (restricted scope, backend
   identity + folder share, DTI destination partnership, Dropbox route) are
   untested. Until one is proven, the app must keep the manual-file input as
   the primary path and must not imply a live Instagram connection.
2. Whether a daily transfer reuses the same Drive folder tree or creates a
   new dated one - observable from the running test export; decides whether a
   one-time folder share can cover future files.
3. Whether the export distinguishes "follower removed me" from "follower
   unfollowed": current evidence says exports carry list membership only, so
   the product can report list changes, not removal causes.
