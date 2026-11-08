// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseExportHtml } from '../parseExportHtml';
import { exportHtml } from './fixtures';

describe('parseExportHtml', () => {
  it('parses the real observed export format', () => {
    const entries = parseExportHtml(exportHtml(['natgeo', 'instagram']));
    expect(entries).toEqual([
      { username: 'natgeo', profileUrl: 'https://www.instagram.com/_u/natgeo' },
      { username: 'instagram', profileUrl: 'https://www.instagram.com/_u/instagram' },
    ]);
  });

  it('dedupes repeated usernames', () => {
    const entries = parseExportHtml(exportHtml(['natgeo', 'natgeo']));
    expect(entries).toHaveLength(1);
  });

  it('ignores anchors that are not profile links', () => {
    const html = exportHtml(['natgeo']) + '<a href="https://www.instagram.com/">home</a>';
    expect(parseExportHtml(html)).toHaveLength(1);
  });

  it('throws when the file has no profile links', () => {
    expect(() => parseExportHtml('<html><body>nothing</body></html>')).toThrow();
  });

  it('does not execute markup in the file', () => {
    const html = exportHtml(['natgeo']) + '<img src=x onerror="window.__pwned=true">';
    parseExportHtml(html);
    expect((window as unknown as Record<string, unknown>).__pwned).toBeUndefined();
  });
});
