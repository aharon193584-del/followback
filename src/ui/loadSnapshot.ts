import JSZip from 'jszip';
import { parseExportHtml } from '../domain/parseExportHtml';
import { parseFollowersJson, parseFollowingJson } from '../domain/parseExportJson';
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

/** True when the picked file looks like the JSON export flavor. */
function looksJson(file: File, text: string): boolean {
  if (/\.json$/i.test(file.name)) return true;
  const first = text.trimStart()[0];
  return first === '{' || first === '[';
}

/** Parse one manually picked export file, by its role and flavor. */
async function parseFile(file: File, role: 'following' | 'followers'): Promise<AccountEntry[]> {
  const text = await readAsText(file);
  try {
    if (looksJson(file, text)) {
      return role === 'following' ? parseFollowingJson(text) : parseFollowersJson(text);
    }
    return parseExportHtml(text);
  } catch {
    throw new Error(`הקובץ ${file.name} לא נראה כמו קובץ ייצוא תקין של אינסטגרם (${role}).`);
  }
}

/** Declared uncompressed size of a ZIP entry, when the archive records it. */
function declaredSize(entry: JSZip.JSZipObject): number {
  const data = (entry as unknown as { _data?: { uncompressedSize?: number } })._data;
  return typeof data?.uncompressedSize === 'number' ? data.uncompressedSize : 0;
}

interface Shard {
  entry: JSZip.JSZipObject;
  num: number;
  dir: string;
}

/**
 * All shards of one export document: followers.html, followers_1.html,
 * followers_2.html, ... (same for .json). Meta splits long lists into
 * numbered parts; reading only one shard would silently truncate the list.
 */
function findShards(zip: JSZip, base: 'following' | 'followers', ext: 'html' | 'json'): Shard[] {
  const re = new RegExp(`(^|/)${base}(?:_(\\d+))?\\.${ext}$`);
  const shards: Shard[] = [];
  zip.forEach((path, file) => {
    if (file.dir) return;
    const match = path.match(re);
    if (!match) return;
    const slash = path.lastIndexOf('/');
    shards.push({
      entry: file,
      num: match[2] ? parseInt(match[2], 10) : 0,
      dir: slash === -1 ? '' : path.slice(0, slash),
    });
  });
  const nums = new Set(shards.map((s) => s.num));
  const dirs = new Set(shards.map((s) => s.dir));
  if (nums.size !== shards.length || dirs.size > 1 || (nums.has(0) && shards.length > 1)) {
    throw new Error(`נמצאו עותקים מתנגשים של ${base}.${ext} בארכיון; לא ניתן לדעת אילו נכונים.`);
  }
  if (shards.length > 0 && !nums.has(0)) {
    // Numbered shards must be contiguous 1..N; a gap means a part is missing.
    for (let n = 1; n <= shards.length; n++) {
      if (!nums.has(n)) {
        throw new Error(`חסר חלק מסדרת הקבצים של ${base} (${base}_${n}.${ext}); הייצוא חלקי ולכן נדחה.`);
      }
    }
  }
  return shards.sort((a, b) => a.num - b.num);
}

/**
 * Shard sets of one document in both flavors. Twin encodings of the same
 * shards are normal; different shard structures conflict and must reject.
 */
function resolveFlavor(zip: JSZip, base: 'following' | 'followers'): { flavor: 'html' | 'json'; shards: Shard[] } {
  const html = findShards(zip, base, 'html');
  const json = findShards(zip, base, 'json');
  if (html.length > 0 && json.length > 0) {
    const same = html.length === json.length && html.every((h, i) => h.num === json[i].num);
    if (!same) {
      throw new Error(`קבצי ה-${base} בארכיון מתנגשים בין HTML ל-JSON; לא ניתן לדעת איזו קבוצה מלאה.`);
    }
    return { flavor: 'json', shards: json };
  }
  return json.length > 0 ? { flavor: 'json', shards: json } : { flavor: 'html', shards: html };
}

/** JSZip ships internalStream at runtime but not in its bundled types. */
interface StreamableEntry {
  internalStream(type: 'string'): JSZip.JSZipStreamHelper<string>;
}

/** Extract one entry in chunks, aborting inflation when a bound is crossed. */
async function extractBounded(entry: JSZip.JSZipObject, fileName: string, spent: { bytes: number }): Promise<string> {
  const declared = declaredSize(entry);
  spent.bytes += declared;
  if (declared > MAX_ENTRY_CHARS || spent.bytes > MAX_TOTAL_DECOMPRESSED_BYTES) {
    throw new Error('הארכיון גדול מדי לעיבוד בדפדפן; החילוץ נעצר.');
  }
  const chunks: string[] = [];
  let received = 0;
  await new Promise<void>((resolve, reject) => {
    const stream = (entry as unknown as StreamableEntry).internalStream('string');
    stream.on('data', (chunk: string) => {
      received += chunk.length;
      if (received > MAX_ENTRY_CHARS || spent.bytes - declared + received > MAX_TOTAL_DECOMPRESSED_BYTES) {
        stream.pause();
        reject(new Error(`הקובץ ${fileName} גדול מדי לעיבוד בדפדפן; החילוץ נעצר באמצע.`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', () => reject(new Error(`קריאת ${fileName} מהארכיון נכשלה.`)));
    stream.on('end', () => resolve());
    stream.resume();
  });
  spent.bytes += received - declared;
  return chunks.join('');
}

/** Validate the uploaded archive before decompression. */
function validateArchive(file: File, zip: JSZip): void {
  if (file.size > MAX_ZIP_BYTES) throw new Error('קובץ ה-ZIP גדול מדי (מעל 100MB).');
  if (Object.keys(zip.files).length > MAX_ZIP_ENTRIES) throw new Error('הארכיון מכיל יותר מדי קבצים.');
}

/** Extract and merge every shard of one document. */
async function readShards(shards: Shard[], base: string, spent: { bytes: number }): Promise<string[]> {
  const texts: string[] = [];
  for (const shard of shards) {
    texts.push(await extractBounded(shard.entry, `${base}_${shard.num}`, spent));
  }
  return texts;
}

/** Parse all shards of one document with the right parser for its flavor. */
function parseShards(texts: string[], role: 'following' | 'followers', flavor: 'html' | 'json'): AccountEntry[] {
  const parseOne = (text: string): AccountEntry[] => {
    if (flavor === 'html') return parseExportHtml(text);
    return role === 'following' ? parseFollowingJson(text) : parseFollowersJson(text);
  };
  try {
    return texts.flatMap(parseOne);
  } catch {
    throw new Error(`קבצי ה-${role} בארכיון לא נראים כמו ייצוא אינסטגרם תקין.`);
  }
}

/** Build a snapshot from the export ZIP. A missing followers list stays unknown. */
export async function loadSnapshotFromZip(zipFile: File): Promise<LoadedSnapshot> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch {
    throw new Error('הקובץ לא נראה כמו קובץ ZIP תקין.');
  }
  validateArchive(zipFile, zip);
  const spent = { bytes: 0 };
  const followingSet = resolveFlavor(zip, 'following');
  if (followingSet.shards.length === 0) {
    throw new Error('לא נמצא קובץ following.html או following.json בתוך ה-ZIP.');
  }
  const following = parseShards(
    await readShards(followingSet.shards, 'following', spent),
    'following',
    followingSet.flavor,
  );
  const followersSet = resolveFlavor(zip, 'followers');
  const followers =
    followersSet.shards.length > 0
      ? parseShards(await readShards(followersSet.shards, 'followers', spent), 'followers', followersSet.flavor)
      : null;
  return { snapshot: { following, followers }, meta: metaFromZipName(zipFile.name), warnings: [] };
}

/** Build a snapshot from the two export files the user picked. */
export async function loadSnapshot(followingFile: File, followersFile: File): Promise<LoadedSnapshot> {
  const following = await parseFile(followingFile, 'following');
  const followers = await parseFile(followersFile, 'followers');
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
