import { describe, expect, it } from 'vitest';
import { parseFollowersJson, parseFollowingJson } from '../parseExportJson';

const followersJson = JSON.stringify([
  { title: '', string_list_data: [{ value: 'natgeo', href: 'https://www.instagram.com/_u/natgeo', timestamp: 1767225600 }] },
  { title: '', string_list_data: [{ value: 'fan', href: 'https://www.instagram.com/_u/fan' }] },
]);

const followingJson = JSON.stringify({
  relationships_following: [
    { title: 'natgeo', string_list_data: [{ value: 'natgeo', timestamp: 1767225600 }] },
    { title: 'oneWay', string_list_data: [{ value: 'oneWay' }] },
  ],
});

describe('parseFollowersJson', () => {
  it('reads the top-level array shape', () => {
    expect(parseFollowersJson(followersJson).map((e) => e.username)).toEqual(['natgeo', 'fan']);
  });

  it('rejects the wrapped shape', () => {
    expect(() => parseFollowersJson(followingJson)).toThrow();
  });
});

describe('parseFollowingJson', () => {
  it('reads the relationships_following wrapper', () => {
    expect(parseFollowingJson(followingJson).map((e) => e.username)).toEqual(['natgeo', 'oneWay']);
  });

  it('falls back to title when value is empty', () => {
    const text = JSON.stringify({ relationships_following: [{ title: 'titled', string_list_data: [{ value: '' }] }] });
    expect(parseFollowingJson(text).map((e) => e.username)).toEqual(['titled']);
  });

  it('rejects the array shape', () => {
    expect(() => parseFollowingJson(followersJson)).toThrow();
  });
});
