// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { loadSnapshotFromZip, MAX_ENTRY_CHARS } from '../loadSnapshot';

/**
 * Build a real ZIP with JSZip, then patch the recorded uncompressed size in
 * the local and central headers to understate it - an archive whose metadata
 * lies about how much memory inflation will take.
 */
async function lyingZip(name: string, content: string, declaredUncompressed: number): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(name, content, { compression: 'DEFLATE' });
  const bytes = Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
  // The real central directory record is the LAST central-header signature;
  // earlier matches can be false positives inside compressed data.
  let centralAt = -1;
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes.readUInt32LE(i) === 0x02014b50) centralAt = i;
  }
  if (centralAt === -1) throw new Error('central directory not found');
  bytes.writeUInt32LE(declaredUncompressed, 22); // local header uncompressed size
  bytes.writeUInt32LE(declaredUncompressed, centralAt + 24); // central directory
  return bytes;
}

describe('decompression budget under lying metadata', () => {
  it('aborts inflation mid-stream when real size crosses the entry cap', async () => {
    const big = 'a'.repeat(MAX_ENTRY_CHARS + 1024 * 1024);
    const zipBytes = await lyingZip('connections/followers_and_following/following.html', big, 1000);
    const file = new File([new Uint8Array(zipBytes).buffer as ArrayBuffer], 'export.zip', { type: 'application/zip' });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('החילוץ נעצר באמצע');
  }, 30000);

  it('rejects via declared size before inflating when headers are honest', async () => {
    const big = 'a'.repeat(MAX_ENTRY_CHARS + 1024);
    const zipBytes = await lyingZip('following.html', big, big.length);
    const file = new File([new Uint8Array(zipBytes).buffer as ArrayBuffer], 'export.zip', { type: 'application/zip' });
    await expect(loadSnapshotFromZip(file)).rejects.toThrow('גדול מדי');
  }, 30000);
});
