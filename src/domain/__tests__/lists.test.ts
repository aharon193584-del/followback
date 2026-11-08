import { describe, expect, it } from 'vitest';
import { fansOnly, followersKnown, mutuals, notFollowingBack } from '../lists';
import type { FollowSnapshot } from '../types';

const entry = (username: string) => ({
  username,
  profileUrl: `https://www.instagram.com/_u/${username}`,
});

const snapshot: FollowSnapshot = {
  following: [entry('natgeo'), entry('instagram'), entry('oneWay')],
  followers: [entry('natgeo'), entry('fan')],
};

describe('list computations', () => {
  it('returns accounts that do not follow back', () => {
    expect(notFollowingBack(snapshot).map((e) => e.username)).toEqual(['instagram', 'oneWay']);
  });

  it('returns followers not followed back', () => {
    expect(fansOnly(snapshot).map((e) => e.username)).toEqual(['fan']);
  });

  it('returns mutuals', () => {
    expect(mutuals(snapshot).map((e) => e.username)).toEqual(['natgeo']);
  });

  it('matches usernames case-insensitively', () => {
    const mixed: FollowSnapshot = { following: [entry('NatGeo')], followers: [entry('natgeo')] };
    expect(notFollowingBack(mixed)).toHaveLength(0);
  });
});

describe('unknown followers list', () => {
  const unknown: FollowSnapshot = { following: [entry('natgeo')], followers: null };

  it('marks completeness as unknown', () => {
    expect(followersKnown(unknown)).toBe(false);
    expect(followersKnown(snapshot)).toBe(true);
  });

  it('returns no definitive lists when followers are unknown', () => {
    expect(notFollowingBack(unknown)).toEqual([]);
    expect(fansOnly(unknown)).toEqual([]);
    expect(mutuals(unknown)).toEqual([]);
  });
});
