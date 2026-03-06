import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarballPath = process.argv[2];
if (!tarballPath) {
  throw new Error("Usage: node scripts/verify-cli-package.mjs <path-to-cli-tgz>");
}

const absoluteTarballPath = resolve(tarballPath);
const workdir = mkdtempSync(join(tmpdir(), "tanky-cli-verify-"));
const unpackDir = join(workdir, "unpack");
const npmCache = join(workdir, "npm-cache");

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      npm_config_cache: npmCache,
    },
    ...options,
  });

const hasWorkspaceProtocol = (value) => {
  if (typeof value === "string") {
    return value.startsWith("workspace:");
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasWorkspaceProtocol(entry));
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).some((entry) => hasWorkspaceProtocol(entry));
  }

  return false;
};

const assertNoWorkspaceProtocol = (pkg) => {
  if (hasWorkspaceProtocol(pkg.dependencies ?? {})) {
    throw new Error("Published CLI package contains workspace protocol in dependencies");
  }
  if (hasWorkspaceProtocol(pkg.devDependencies ?? {})) {
    throw new Error("Published CLI package contains workspace protocol in devDependencies");
  }
};

const assertNoInternalRuntimeDeps = (pkg) => {
  const deps = pkg.dependencies ?? {};
  for (const depName of Object.keys(deps)) {
    if (depName.startsWith("@tanky/")) {
      throw new Error(
        `Published CLI package still depends on internal package at runtime: ${depName}`,
      );
    }
  }
};

try {
  mkdirSync(unpackDir, { recursive: true });
  mkdirSync(npmCache, { recursive: true });
  run("tar", ["-xzf", absoluteTarballPath, "-C", unpackDir]);

  const packedPackagePath = join(unpackDir, "package", "package.json");
  const packedPackage = JSON.parse(readFileSync(packedPackagePath, "utf8"));
  assertNoWorkspaceProtocol(packedPackage);
  assertNoInternalRuntimeDeps(packedPackage);

  const unpackedPackageDir = join(unpackDir, "package");
  run("npm", ["install", "--omit=dev"], { cwd: unpackedPackageDir });

  const cliEntry = join(unpackDir, "package", "dist", "index.js");
  run("node", [cliEntry, "--help"], { cwd: workdir });
  run("node", [cliEntry, "best", "--help"], { cwd: workdir });
  run("node", [cliEntry, "near", "--help"], { cwd: workdir });

  console.log("CLI package verification passed.");
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
