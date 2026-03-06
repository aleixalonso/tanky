import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FileCacheStore } from "./file-cache-store";

describe("FileCacheStore", () => {
  it("stores and retrieves entries by key", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tanky-file-cache-"));
    const store = new FileCacheStore(dir);

    try {
      await store.set("example", { value: { foo: "bar" }, fetchedAtMs: 123 });

      expect(await store.get<{ foo: string }>("example")).toEqual({
        value: { foo: "bar" },
        fetchedAtMs: 123,
      });
      expect(await store.get("missing")).toBeNull();
      expect(await readdir(dir)).toEqual(["cache.json"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reuses persisted entries across instances", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tanky-file-cache-"));

    try {
      const writer = new FileCacheStore(dir);
      await writer.set("shared", { value: "cached", fetchedAtMs: 42 });

      const reader = new FileCacheStore(dir);
      expect(await reader.get<string>("shared")).toEqual({
        value: "cached",
        fetchedAtMs: 42,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
