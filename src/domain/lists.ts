import type { AccountEntry, FollowSnapshot } from './types';

/** Lowercased username set for fast membership checks. */
function usernameSet(entries: AccountEntry[]): Set<string> {
  return new Set(entries.map((entry) => entry.username.toLowerCase()));
}

/** Entries from `source` whose username is absent from `other`. */
function difference(source: AccountEntry[], other: AccountEntry[]): AccountEntry[] {
  const otherNames = usernameSet(other);
  return source.filter((entry) => !otherNames.has(entry.username.toLowerCase()));
}

/** Entries from `source` whose username also appears in `other`. */
function intersection(source: AccountEntry[], other: AccountEntry[]): AccountEntry[] {
  const otherNames = usernameSet(other);
  return source.filter((entry) => otherNames.has(entry.username.toLowerCase()));
}

/** True when the followers list was present in the export. */
export function followersKnown(snapshot: FollowSnapshot): boolean {
  return snapshot.followers !== null;
}

/** Accounts the user follows that do not follow back. The default list. */
export function notFollowingBack(snapshot: FollowSnapshot): AccountEntry[] {
  if (snapshot.followers === null) return [];
  return difference(snapshot.following, snapshot.followers);
}

/** Followers the user does not follow back. */
export function fansOnly(snapshot: FollowSnapshot): AccountEntry[] {
  if (snapshot.followers === null) return [];
  return difference(snapshot.followers, snapshot.following);
}

/** Accounts that follow and are followed back. */
export function mutuals(snapshot: FollowSnapshot): AccountEntry[] {
  if (snapshot.followers === null) return [];
  return intersection(snapshot.following, snapshot.followers);
}
