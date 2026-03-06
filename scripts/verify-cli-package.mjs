import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarballPath = process.argv[2];
if (tarballPath === undefined || tarballPath.length === 0) {
  throw new Error("Usage: node scripts/verify-cli-package.mjs <path-to-cli-tgz>");
}

const absoluteTarballPath = resolve(tarballPath);
const workdir = mkdtempSync(join(tmpdir(), "tanky-package-verify-"));
const unpackDir = join(workdir, "unpack");

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
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
    throw new Error("Published CLI package still contains workspace protocol in dependencies");
  }

  if (hasWorkspaceProtocol(pkg.devDependencies ?? {})) {
    throw new Error("Published CLI package still contains workspace protocol in devDependencies");
  }
};

try {
  mkdirSync(unpackDir, { recursive: true });
  run("tar", ["-xzf", absoluteTarballPath, "-C", unpackDir]);

  const packedPackagePath = join(unpackDir, "package", "package.json");
  const packedPackage = JSON.parse(readFileSync(packedPackagePath, "utf8"));
  assertNoWorkspaceProtocol(packedPackage);

  run("npm", ["install", "-g", absoluteTarballPath], { cwd: workdir });

  const npmGlobalPrefix = run("npm", ["prefix", "-g"]).trim();
  const tankyBinary = join(npmGlobalPrefix, "bin", "tanky");

  run(tankyBinary, ["--help"], { cwd: workdir });
  run(tankyBinary, ["best", "--help"], { cwd: workdir });
  run(tankyBinary, ["near", "--help"], { cwd: workdir });

  console.log("CLI package verification passed.");
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
