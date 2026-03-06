import { describe, expect, it, vi } from "vitest";

import { cachedFetch } from "./cached-fetch";
import type { CacheStore } from "./cache-store";

class MemoryCacheStore implements CacheStore {
  private map = new Map<string, { value: unknown; fetchedAtMs: number }>();

  async get<T>(key: string) {
    return (this.map.get(key) as { value: T; fetchedAtMs: number } | undefined) ?? null;
  }

  async set<T>(key: string, entry: { value: T; fetchedAtMs: number }) {
    this.map.set(key, entry as { value: unknown; fetchedAtMs: number });
  }
}

describe("cachedFetch", () => {
  it("returns cached value when entry is within TTL", async () => {
    const store = new MemoryCacheStore();
    await store.set("k", { value: "cached", fetchedAtMs: 1000 });

    const fetchFresh = vi.fn(async () => "fresh");

    const value = await cachedFetch<string>({
      key: "k",
      ttlMs: 10_000,
      cacheStore: store,
      fetchFresh,
      nowMs: 5000,
    });

    expect(value).toBe("cached");
    expect(fetchFresh).not.toHaveBeenCalled();
  });

  it("fetches and stores fresh value when cache is stale", async () => {
    const store = new MemoryCacheStore();
    await store.set("k", { value: "old", fetchedAtMs: 1000 });

    const value = await cachedFetch<string>({
      key: "k",
      ttlMs: 100,
      cacheStore: store,
      fetchFresh: async () => "fresh",
      nowMs: 2000,
    });

    expect(value).toBe("fresh");
    expect(await store.get<string>("k")).toEqual({
      value: "fresh",
      fetchedAtMs: 2000,
    });
  });

  it("falls back to stale cache when fresh fetch fails", async () => {
    const store = new MemoryCacheStore();
    await store.set("k", { value: "stale", fetchedAtMs: 1000 });

    const value = await cachedFetch<string>({
      key: "k",
      ttlMs: 100,
      cacheStore: store,
      fetchFresh: async () => {
        throw new Error("network");
      },
      nowMs: 5000,
    });

    expect(value).toBe("stale");
  });
});
