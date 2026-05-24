const DB_NAME = "onniverso.lobby.screen2.video";
const STORE = "handles";
const STORE_KEY = "videoDir";

export const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)$/i;

export type AndroidVideoItem = { idx: number; name: string; mime: string };

export type LocalVideoItem =
  | { kind: "file"; name: string; handle: FileSystemFileHandle }
  | { kind: "blob"; name: string; file: File }
  | { kind: "url"; id: string; name: string; url: string }
  | { kind: "android"; name: string; idx: number; mime: string };

export const ANDROID_VIDEO_CALLBACK = "__onniversoVideoFolderPicked";

declare global {
  interface Window {
    __onniversoVideoFolderPicked?: (
      items: AndroidVideoItem[] | null,
      error: string | null,
    ) => void;
  }
}

export function isVideoFileName(name: string): boolean {
  return VIDEO_EXT.test(name);
}

export function hasAndroidMusicBridge(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidMusic?.pickMusicFolder === "function";
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime || "video/mp4" });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadStoredVideoDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(STORE_KEY);
      r.onsuccess = () => resolve((r.result as FileSystemDirectoryHandle | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

export async function saveVideoDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, STORE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function verifyDirReadPermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await dir.queryPermission?.(opts)) === "granted") return true;
  if ((await dir.requestPermission?.(opts)) === "granted") return true;
  return false;
}

export async function collectVideoFiles(root: FileSystemDirectoryHandle): Promise<LocalVideoItem[]> {
  const out: LocalVideoItem[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, entry] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "file" && isVideoFileName(name)) {
        out.push({ kind: "file", name: path, handle: entry as FileSystemFileHandle });
      } else if (entry.kind === "directory") {
        await walk(entry as FileSystemDirectoryHandle, path);
      }
    }
  }

  await walk(root, "");
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function buildVideoItemsFromFileList(files: FileList | null): LocalVideoItem[] {
  if (!files?.length) return [];
  const items: LocalVideoItem[] = [];
  for (const f of Array.from(files)) {
    if (!isVideoFileName(f.name)) continue;
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
    items.push({ kind: "blob", name: rel?.trim() || f.name, file: f });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export function buildVideoItemsFromAndroid(items: AndroidVideoItem[]): LocalVideoItem[] {
  return items
    .filter((it) => isVideoFileName(it.name))
    .map<LocalVideoItem>((it) => ({
      kind: "android",
      name: it.name,
      idx: it.idx,
      mime: it.mime,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveLocalVideoUrl(item: LocalVideoItem): Promise<string> {
  if (item.kind === "url") return item.url;
  if (item.kind === "blob") return URL.createObjectURL(item.file);
  if (item.kind === "android") {
    const bridge = window.AndroidMusic;
    if (!bridge) throw new Error("bridge-unavailable");
    const b64 = bridge.readMusicFileBase64(item.idx);
    if (!b64) throw new Error("read-failed");
    const mime = bridge.getMusicMime(item.idx) || item.mime || "video/mp4";
    return URL.createObjectURL(base64ToBlob(b64, mime));
  }
  const file = await item.handle.getFile();
  return URL.createObjectURL(file);
}

export function displayNameFromItem(item: LocalVideoItem): string {
  const raw = item.name;
  const slash = raw.lastIndexOf("/");
  return slash >= 0 ? raw.slice(slash + 1) : raw;
}
