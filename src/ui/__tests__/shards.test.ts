// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { loadSnapshotFromZip } from '../loadSnapshot';
import { exportHtml } from '../../domain/__tests__/fixtures';

async function zipFile(files: Record<string, string>, name = 'export.zip'): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/zip' });
}

const followersJson = (names: string[]) =>
  JSON.stringify(names.map((n) => ({ title: '', string_list_data: [{ value: n }] })));
const followingJson = (names: string[]) =>
  JSON.stringify({ relationships_following: names.map((n) => ({ title: n, string_list_data: [{ value: n }] })) });

describe('numbered export shards', () => {
  it('merges followers_1.html and followers_2.html into one list', async () => {
    const file = await zipFile({
      'connections/followers_and_following/following.html': exportHtml(['natgeo', 'instagram']),
      'connections/followers_and_following/followers_1.html': exportHtml(['natgeo']),
      'connections/followers_and_following/followers_2.html': exportHtml(['fan']),
    });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.followers?.map((e) => e.username).sort()).toEqual(['fan', 'natgeo']);
  });

  it('rejects a plain file mixed with numbered shards', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['a']),
      'followers.html': exportHtml(['a']),
      'followers_1.html': exportHtml(['b']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('עותקים');
  });

  it('rejects duplicate shard numbers in different folders', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['a']),
      'x/followers_1.html': exportHtml(['a']),
      'y/followers_1.html': exportHtml(['b']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('עותקים');
  });
});

describe('JSON export flavor', () => {
  it('loads following.json and numbered followers shards', async () => {
    const file = await zipFile({
      'connections/followers_and_following/following.json': followingJson(['natgeo', 'instagram']),
      'connections/followers_and_following/followers_1.json': followersJson(['natgeo']),
      'connections/followers_and_following/followers_2.json': followersJson(['fan']),
    });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.following.map((e) => e.username)).toEqual(['natgeo', 'instagram']);
    expect(loaded.snapshot.followers?.map((e) => e.username)).toEqual(['natgeo', 'fan']);
  });

  it('prefers JSON when both flavors exist', async () => {
    const file = await zipFile({
      'following.json': followingJson(['jsonVersion']),
      'following.html': exportHtml(['htmlVersion']),
      'followers_1.json': followersJson(['jsonVersion']),
    });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.following.map((e) => e.username)).toEqual(['jsonVersion']);
  });

  it('keeps followers unknown when no followers shards exist', async () => {
    const file = await zipFile({ 'following.json': followingJson(['natgeo']) });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.followers).toBeNull();
  });
});

describe('shard integrity', () => {
  it('rejects a gap in numbered shards', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['a']),
      'followers_1.html': exportHtml(['a']),
      'followers_3.html': exportHtml(['b']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('חסר חלק');
  });

  it('rejects a series that does not start at 1', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['a']),
      'followers_2.html': exportHtml(['a']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('חסר חלק');
  });

  it('rejects conflicting HTML and JSON shard sets', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['a']),
      'followers_1.json': followersJson(['a']),
      'followers_1.html': exportHtml(['a']),
      'followers_2.html': exportHtml(['b']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('מתנגשים');
  });

  it('accepts twin HTML and JSON encodings of the same shards', async () => {
    const file = await zipFile({
      'following.json': followingJson(['a', 'b']),
      'following.html': exportHtml(['a', 'b']),
      'followers_1.json': followersJson(['a']),
      'followers_1.html': exportHtml(['a']),
    });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.following).toHaveLength(2);
    expect(loaded.snapshot.followers).toHaveLength(1);
  });
});
