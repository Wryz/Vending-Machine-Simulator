import { Directory, File, Paths } from 'expo-file-system';

/**
 * Local-only persistence (SPEC §7.5): one JSON file per key in the app's
 * document directory, written atomically (temp file + move). No accounts,
 * nothing leaves the device.
 */
const dir = () => {
  const d = new Directory(Paths.document, 'saves');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
};

function parseFile<T>(f: File): T | null {
  try {
    return f.exists ? (JSON.parse(f.textSync()) as T) : null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string): T | null {
  try {
    const d = dir();
    const main = parseFile<T>(new File(d, `${key}.json`));
    if (main !== null) return main;
    // Killed between deleting the old file and moving the new one in: the
    // complete new copy is still in the temp file.
    return parseFile<T>(new File(d, `${key}.json.tmp`));
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  const tmp = new File(dir(), `${key}.json.tmp`);
  const target = new File(dir(), `${key}.json`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.writeSync(JSON.stringify(value));
  if (target.exists) target.delete();
  tmp.moveSync(target);
}

export function removeKey(key: string): void {
  for (const name of [`${key}.json`, `${key}.json.tmp`]) {
    const f = new File(dir(), name);
    if (f.exists) f.delete();
  }
}

/** Write a file to the cache dir for sharing (save export). */
export function writeShareFile(name: string, contents: string): string {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.writeSync(contents);
  return f.uri;
}

export async function readUri(uri: string): Promise<string> {
  return new File(uri).text();
}
