# Instagram export formats (observed reference)

What the loader accepts and why. Meta publishes no stable schema for these
files; this document records what the code handles today.

## Flavors

- **HTML** (default export choice): `following.html`, followers as
  `followers.html` or numbered shards `followers_1.html`, `followers_2.html`...
- **JSON**: `following.json` (wrapped in `relationships_following`),
  followers as numbered shards `followers_1.json`, `followers_2.json`...
  (numbered from 1 even when there is a single shard).
- When a ZIP contains both flavors, JSON is preferred (explicit structure).

## Shard rules

- Numbered shards must be contiguous from 1; a detectable gap rejects the
  import as partial. Filenames alone cannot PROVE completeness (Meta could
  omit a shard without leaving a trace) - the check only catches gaps that
  are visible in the archive.


- All shards of one document must live in the same folder with distinct
  numbers; conflicting copies (plain file mixed with shards, duplicate
  numbers, or HTML and JSON shard sets that do not mirror each other) reject
  the import rather than guessing.
- A document with no shards at all is treated as UNKNOWN (lists unavailable),
  never as an empty list: an absent followers file cannot be distinguished
  from a partial export.

## Sources (third-party observations, not a Meta contract)

- Unfollio export format reference:
  https://unfollio.com/resources/instagram-export-file-format
- LMKFR export research:
  https://lmkfr.com/research
- Our own observed scheduled-transfer export (small account, HTML flavor):
  `following.html` present, no followers file for a zero-follower account.

Formats can change; parse failures must surface as clear errors, never as
partial results.
