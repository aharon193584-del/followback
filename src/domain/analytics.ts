import type { FollowSnapshot, SnapshotAnalytics } from './types';
import { fansOnly, mutuals, notFollowingBack } from './lists';

/** Round to two decimals without returning -0. */
function ratio(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100) / 100;
}

/** Aggregate counts and ratios; requires a known followers list. */
export function analyze(snapshot: FollowSnapshot): SnapshotAnalytics {
  const followers = snapshot.followers ?? [];
  const mutualCount = mutuals(snapshot).length;
  return {
    followingCount: snapshot.following.length,
    followersCount: followers.length,
    notFollowingBackCount: notFollowingBack(snapshot).length,
    fansOnlyCount: fansOnly(snapshot).length,
    mutualsCount: mutualCount,
    followBackRatio: ratio(mutualCount, snapshot.following.length),
  };
}
