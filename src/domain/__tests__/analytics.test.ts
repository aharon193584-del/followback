import { describe, expect, it } from 'vitest';
import { analyze } from '../analytics';
import type { FollowSnapshot } from '../types';

const entry = (username: string) => ({
  username,
  profileUrl: `https://www.instagram.com/_u/${username}`,
});

describe('analyze', () => {
  it('computes counts and the follow-back ratio', () => {
    const snapshot: FollowSnapshot = {
      following: [entry('a'), entry('b')],
      followers: [entry('a'), entry('c')],
    };
    expect(analyze(snapshot)).toEqual({
      followingCount: 2,
      followersCount: 2,
      notFollowingBackCount: 1,
      fansOnlyCount: 1,
      mutualsCount: 1,
      followBackRatio: 0.5,
    });
  });

  it('returns a zero ratio for an empty following list', () => {
    expect(analyze({ following: [], followers: [] }).followBackRatio).toBe(0);
  });
});
