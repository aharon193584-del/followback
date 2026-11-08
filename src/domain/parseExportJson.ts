import type { AccountEntry } from './types';

/**
 * Parser for the JSON flavor of Meta's official "Followers and following"
 * export. Observed shapes (third-party format references, not a Meta contract):
 * - followers_N.json: top-level array of items with string_list_data entries.
 * - following.json: { relationships_following: [...] } wrapper.
 * Username resolution order: string_list_data[0].value, then item title,
 * then the /_u/<name> or /<name> part of href.
 */

interface StringListDatum {
  value?: string;
  href?: string;
}

interface RelationshipItem {
  title?: string;
  string_list_data?: StringListDatum[];
}

function usernameFromHref(href: string): string | null {
  const match = href.match(/instagram\.com\/(?:_u\/)?([A-Za-z0-9._]+)\/?$/);
  return match ? match[1] : null;
}

function toEntry(item: RelationshipItem): AccountEntry | null {
  const datum = item.string_list_data?.[0];
  const username = datum?.value || item.title || (datum?.href ? usernameFromHref(datum.href) : null);
  if (!username) return null;
  return {
    username,
    profileUrl: datum?.href ?? `https://www.instagram.com/_u/${username}`,
  };
}

function toEntries(items: RelationshipItem[]): AccountEntry[] {
  return items.map(toEntry).filter((e): e is AccountEntry => e !== null);
}

/** Parse a followers_N.json shard (top-level array shape). */
export function parseFollowersJson(text: string): AccountEntry[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('followers JSON is not the expected array shape.');
  }
  return toEntries(data as RelationshipItem[]);
}

/** Parse following.json (relationships_following wrapper shape). */
export function parseFollowingJson(text: string): AccountEntry[] {
  const data: unknown = JSON.parse(text);
  const items = (data as { relationships_following?: RelationshipItem[] })?.relationships_following;
  if (!Array.isArray(items)) {
    throw new Error('following JSON is missing relationships_following.');
  }
  return toEntries(items);
}
