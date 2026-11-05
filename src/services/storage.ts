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

export function readJson<T>(key: string): T | null {
  try {
    const f = new File(dir(), `${key}.json`);
    if (!f.exists) return null;
    return JSON.parse(f.textSync()) as T;
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
  const f = new File(dir(), `${key}.json`);
  if (f.exists) f.delete();
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
