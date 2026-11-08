import { describe, expect, it } from 'vitest';
import { diffSnapshots } from '../diff';
import type { FollowSnapshot } from '../types';

const entry = (username: string) => ({
  username,
  profileUrl: `https://www.instagram.com/_u/${username}`,
});

const before: FollowSnapshot = {
  following: [entry('natgeo'), entry('instagram')],
  followers: [entry('natgeo')],
};

const after: FollowSnapshot = {
  following: [entry('instagram'), entry('newacc')],
  followers: [],
};

describe('diffSnapshots', () => {
  it('reports each membership change', () => {
    const diff = diffSnapshots(before, after);
    expect(diff.unfollowed.map((e) => e.username)).toEqual(['natgeo']);
    expect(diff.newFollowing.map((e) => e.username)).toEqual(['newacc']);
    expect(diff.lostFollowers.map((e) => e.username)).toEqual(['natgeo']);
    expect(diff.newFollowers).toEqual([]);
  });

  it('reports no changes for identical snapshots', () => {
    const diff = diffSnapshots(before, before);
    expect(Object.values(diff).every((list) => list.length === 0)).toBe(true);
  });

  it('refuses to compare when either followers list is unknown', () => {
    const unknown: FollowSnapshot = { following: [entry('natgeo')], followers: null };
    expect(() => diffSnapshots(unknown, after)).toThrow('followers');
    expect(() => diffSnapshots(before, unknown)).toThrow('followers');
  });
});
