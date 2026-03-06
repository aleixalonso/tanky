import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CacheEntry, CacheStore } from "./cache-store";

type CacheEntryPayload = {
  fetchedAtMs: number;
  value: unknown;
};

type CacheDocument = Record<string, CacheEntryPayload>;

const CACHE_FILE_NAME = "cache.json";

const parseCacheEntryPayload = (value: unknown): CacheEntryPayload | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as { fetchedAtMs?: unknown; value?: unknown };
  if (
    typeof payload.fetchedAtMs !== "number" ||
    !Number.isFinite(payload.fetchedAtMs)
  ) {
    return null;
  }

  return {
    fetchedAtMs: payload.fetchedAtMs,
    value: payload.value,
  };
};

export class FileCacheStore implements CacheStore {
  private document: CacheDocument | null = null;

  constructor(
    private readonly directoryPath: string,
    private readonly fileName: string = CACHE_FILE_NAME,
  ) {}

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const document = await this.loadDocument();
    const payload = parseCacheEntryPayload(document[key]);
    if (payload === null) {
      return null;
    }

    return {
      fetchedAtMs: payload.fetchedAtMs,
      value: payload.value as T,
    };
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const document = await this.loadDocument();
    document[key] = {
      fetchedAtMs: entry.fetchedAtMs,
      value: entry.value,
    };

    await this.writeDocument(document);
  }

  private async loadDocument(): Promise<CacheDocument> {
    if (this.document !== null) {
      return this.document;
    }

    try {
      const raw = await readFile(this.cacheFilePath(), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        this.document = {};
        return this.document;
      }

      this.document = parsed as CacheDocument;
      return this.document;
    } catch {
      this.document = {};
      return this.document;
    }
  }

  private async writeDocument(document: CacheDocument): Promise<void> {
    await mkdir(this.directoryPath, { recursive: true });
    const path = this.cacheFilePath();
    const tempPath = `${path}.tmp`;
    await writeFile(tempPath, JSON.stringify(document), "utf8");
    await rename(tempPath, path);
  }

  private cacheFilePath(): string {
    return join(this.directoryPath, this.fileName);
  }
}
