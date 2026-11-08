import type { AccountEntry } from './types';

const PROFILE_LINK = /instagram\.com\/_u\/([A-Za-z0-9._]{1,30})\/?$/;

/** Extract the username from a Meta export profile link, or null if it is not one. */
function usernameFromHref(href: string): string | null {
  const match = href.match(PROFILE_LINK);
  return match ? match[1] : null;
}

/** Build one entry from an anchor element, or null if unusable. */
function entryFromAnchor(anchor: HTMLAnchorElement): AccountEntry | null {
  const username = usernameFromHref(anchor.href);
  if (!username) return null;
  return { username, profileUrl: `https://www.instagram.com/_u/${username}` };
}

/** Keep the first occurrence of each username. */
function dedupeByUsername(entries: AccountEntry[]): AccountEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parse a Meta "followers_and_following" HTML export (following.html or
 * followers.html) into account entries. Reads markup only; never injects it.
 * Throws when no profile links are found, so callers can flag a wrong file.
 */
export function parseExportHtml(html: string): AccountEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  const entries = anchors
    .map((anchor) => entryFromAnchor(anchor as HTMLAnchorElement))
    .filter((entry): entry is AccountEntry => entry !== null);
  const unique = dedupeByUsername(entries);
  if (unique.length === 0) {
    throw new Error('No Instagram profile links found in this file.');
  }
  return unique;
}
