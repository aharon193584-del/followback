// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  compareBlockers,
  compareWarnings,
  loadSnapshotFromZip,
  metaFromZipName,
} from '../loadSnapshot';
import { exportHtml } from '../../domain/__tests__/fixtures';

async function zipFile(files: Record<string, string>, name = 'export.zip'): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/zip' });
}

describe('metaFromZipName', () => {
  it('extracts account and date from a Meta export name', () => {
    expect(metaFromZipName('instagram-someuser26-2026-11-07-gakulQ1J.zip')).toEqual({
      username: 'someuser26',
      exportedOn: '2026-11-07',
    });
  });

  it('returns nothing for other names', () => {
    expect(metaFromZipName('export.zip')).toEqual({});
  });
});

describe('loadSnapshotFromZip completeness', () => {
  it('keeps the followers list unknown when the file is missing', async () => {
    const file = await zipFile({ 'following.html': exportHtml(['natgeo']) });
    const loaded = await loadSnapshotFromZip(file);
    expect(loaded.snapshot.followers).toBeNull();
    expect(loaded.snapshot.following).toHaveLength(1);
  });

  it('rejects duplicate target paths instead of picking one', async () => {
    const file = await zipFile({
      'a/following.html': exportHtml(['natgeo']),
      'b/following.html': exportHtml(['other']),
      'followers.html': exportHtml(['natgeo']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('עותקים');
  });

  it('rejects duplicate followers paths too', async () => {
    const file = await zipFile({
      'following.html': exportHtml(['natgeo']),
      'a/followers.html': exportHtml(['natgeo']),
      'b/followers.html': exportHtml(['other']),
    });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('עותקים');
  });

  it('rejects a non-ZIP file', async () => {
    const file = new File(['not a zip'], 'export.zip', { type: 'application/zip' });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('ZIP');
  });
});

describe('compareWarnings', () => {
  it('notes when account cannot be verified', () => {
    expect(compareWarnings({}, {}).some((w) => w.includes('לא ניתן לוודא'))).toBe(true);
  });

  it('stays quiet for matching accounts', () => {
    expect(
      compareWarnings({ username: 'a', exportedOn: '2026-11-08' }, { username: 'a', exportedOn: '2026-11-01' }),
    ).toEqual([]);
  });
});

describe('compareBlockers', () => {
  it('blocks different accounts', () => {
    const blockers = compareBlockers(
      { username: 'alice', exportedOn: '2026-11-08' },
      { username: 'bob', exportedOn: '2026-11-01' },
    );
    expect(blockers.some((b) => b.includes('alice'))).toBe(true);
  });

  it('blocks reversed dates', () => {
    const blockers = compareBlockers(
      { username: 'a', exportedOn: '2026-11-01' },
      { username: 'a', exportedOn: '2026-11-08' },
    );
    expect(blockers.some((b) => b.includes('נחסמה'))).toBe(true);
  });

  it('allows a valid pair', () => {
    expect(
      compareBlockers({ username: 'a', exportedOn: '2026-11-08' }, { username: 'a', exportedOn: '2026-11-01' }),
    ).toEqual([]);
  });
});
