import type { AccountEntry, FollowSnapshot, SnapshotDiff } from './types';

function usernameSet(entries: AccountEntry[]): Set<string> {
  return new Set(entries.map((entry) => entry.username.toLowerCase()));
}

/** Entries present in `after` but absent from `before`. */
function added(before: AccountEntry[], after: AccountEntry[]): AccountEntry[] {
  const beforeNames = usernameSet(before);
  return after.filter((entry) => !beforeNames.has(entry.username.toLowerCase()));
}

/** Entries present in `before` but absent from `after`. */
function removed(before: AccountEntry[], after: AccountEntry[]): AccountEntry[] {
  return added(after, before);
}

/**
 * Compare two snapshots of the same account. A lost follower cannot be
 * attributed to an unfollow or a removal from export data; report membership
 * changes only.
 */
export function diffSnapshots(before: FollowSnapshot, after: FollowSnapshot): SnapshotDiff {
  if (before.followers === null || after.followers === null) {
    throw new Error('Cannot compare snapshots with an unknown followers list.');
  }
  return {
    newFollowing: added(before.following, after.following),
    unfollowed: removed(before.following, after.following),
    newFollowers: added(before.followers, after.followers),
    lostFollowers: removed(before.followers, after.followers),
  };
}
