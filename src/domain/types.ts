/** One account entry parsed from a Meta "followers and following" export file. */
export interface AccountEntry {
  username: string;
  profileUrl: string;
}

/** A point-in-time view of one Instagram account's connections.
 * followers is null when the export did not include the followers list and
 * completeness cannot be confirmed - derived lists must then be unavailable. */
export interface FollowSnapshot {
  following: AccountEntry[];
  followers: AccountEntry[] | null;
}

/** Membership changes between two snapshots of the same account. */
export interface SnapshotDiff {
  newFollowing: AccountEntry[];
  unfollowed: AccountEntry[];
  newFollowers: AccountEntry[];
  lostFollowers: AccountEntry[];
}

/** Aggregate numbers derived from one snapshot. */
export interface SnapshotAnalytics {
  followingCount: number;
  followersCount: number;
  notFollowingBackCount: number;
  fansOnlyCount: number;
  mutualsCount: number;
  followBackRatio: number;
}
