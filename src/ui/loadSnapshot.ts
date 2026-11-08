import JSZip from 'jszip';
import { parseExportHtml } from '../domain/parseExportHtml';
import type { AccountEntry, FollowSnapshot } from '../domain/types';

/** Hard bounds for archive ingestion (client memory protection). */
export const MAX_ZIP_BYTES = 100 * 1024 * 1024;
export const MAX_TOTAL_DECOMPRESSED_BYTES = 200 * 1024 * 1024;
export const MAX_ENTRY_CHARS = 50 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 20_000;

/** What we could learn about a snapshot's origin, when knowable. */
export interface SnapshotMeta {
  username?: string;
  exportedOn?: string;
}

/** A snapshot plus everything the user must know about how it was read. */
export interface LoadedSnapshot {
  snapshot: FollowSnapshot;
  meta: SnapshotMeta;
  warnings: string[];
}

/** Extract account/date from a Meta export ZIP name, e.g. instagram-user-2026-11-07-xK2ab.zip. */
export function metaFromZipName(name: string): SnapshotMeta {
  const match = name.match(/instagram-([A-Za-z0-9._]+)-(\d{4}-\d{2}-\d{2})-[A-Za-z0-9]+\.zip$/i);
  return match ? { username: match[1], exportedOn: match[2] } : {};
}

/** Read a File object to text. */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Parse one export file, mapping parse failures to a Hebrew user message. */
async function parseFile(file: File, label: string): Promise<AccountEntry[]> {
  try {
    return parseExportHtml(await readAsText(file));
  } catch {
    throw new Error(`הקובץ ${label} לא נראה כמו קובץ ייצוא תקין של אינסטגרם.`);
  }
}

/** Declared uncompressed size of a ZIP entry, when the archive records it. */
function declaredSize(entry: JSZip.JSZipObject): number {
  const data = (entry as unknown as { _data?: { uncompressedSize?: number } })._data;
  return typeof data?.uncompressedSize === 'number' ? data.uncompressedSize : 0;
}

/** Locate the single entry for an export file name; ambiguous copies reject. */
function findEntry(zip: JSZip, fileName: string): JSZip.JSZipObject | null {
  const matches = zip.file(new RegExp(`(^|/)${fileName}$`));
  if (matches.length > 1) {
    throw new Error(`נמצאו כמה עותקים של ${fileName} בארכיון; לא ניתן לדעת איזה מהם נכון.`);
  }
  return matches[0] ?? null;
}

/** Extract one entry within the cumulative decompressed budget. */
async function extractBounded(entry: JSZip.JSZipObject, fileName: string, spent: { bytes: number }): Promise<string> {
  spent.bytes += declaredSize(entry);
  if (spent.bytes > MAX_TOTAL_DECOMPRESSED_BYTES) {
    throw new Error('הארכיון גדול מדי לאחר חילוץ; העיבוד נעצר.');
  }
  const text = await entry.async('string');
  spent.bytes += text.length - declaredSize(entry);
  if (text.length > MAX_ENTRY_CHARS || spent.bytes > MAX_TOTAL_DECOMPRESSED_BYTES) {
    throw new Error(`הקובץ ${fileName} גדול מדי לעיבוד בדפדפן.`);
  }
  return text;
}

/** Validate the uploaded archive before decompression. */
function validateArchive(file: File, zip: JSZip): void {
  if (file.size > MAX_ZIP_BYTES) throw new Error('קובץ ה-ZIP גדול מדי (מעל 100MB).');
  if (Object.keys(zip.files).length > MAX_ZIP_ENTRIES) throw new Error('הארכיון מכיל יותר מדי קבצים.');
}

/** Build a snapshot from the export ZIP. Missing followers list stays unknown. */
export async function loadSnapshotFromZip(zipFile: File): Promise<LoadedSnapshot> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch {
    throw new Error('הקובץ לא נראה כמו קובץ ZIP תקין.');
  }
  validateArchive(zipFile, zip);
  const spent = { bytes: 0 };
  const followingEntry = findEntry(zip, 'following.html');
  if (!followingEntry) throw new Error('לא נמצא הקובץ following.html בתוך ה-ZIP.');
  const following = parseExportHtml(await extractBounded(followingEntry, 'following.html', spent));
  const followersEntry = findEntry(zip, 'followers.html');
  const followers = followersEntry
    ? parseExportHtml(await extractBounded(followersEntry, 'followers.html', spent))
    : null;
  return { snapshot: { following, followers }, meta: metaFromZipName(zipFile.name), warnings: [] };
}

/** Build a snapshot from the two export files the user picked. */
export async function loadSnapshot(followingFile: File, followersFile: File): Promise<LoadedSnapshot> {
  const following = await parseFile(followingFile, 'following.html');
  const followers = await parseFile(followersFile, 'followers.html');
  return { snapshot: { following, followers }, meta: {}, warnings: [] };
}

/** Blocking reasons two snapshots must not be compared. */
export function compareBlockers(current: SnapshotMeta, previous: SnapshotMeta): string[] {
  const blockers: string[] = [];
  if (current.username && previous.username && current.username !== previous.username) {
    blockers.push(
      `שם החשבון שונה בין הקבצים (${previous.username} מול ${current.username}); ההשוואה נחסמה כי אין לערבב חשבונות.`,
    );
  }
  if (current.exportedOn && previous.exportedOn && previous.exportedOn > current.exportedOn) {
    blockers.push('תאריך הייצוא "הקודם" מאוחר מהנוכחי; ההשוואה נחסמה עד שתטענו את הקבצים בסדר הנכון.');
  }
  return blockers;
}

/** Non-blocking caveats about a comparison. */
export function compareWarnings(current: SnapshotMeta, previous: SnapshotMeta): string[] {
  if (!current.username || !previous.username) {
    return ['לא ניתן לוודא משמות הקבצים ששני הייצואים שייכים לאותו חשבון; ההשוואה מניחה שכן.'];
  }
  return [];
}
