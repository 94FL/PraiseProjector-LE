#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function normalizeVersion(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/^[~^]/, "");
}

function getElectronVersion() {
  try {
    // Prefer installed package version when available.
    return normalizeVersion(require("electron/package.json").version);
  } catch {
    try {
      const pkg = require(path.join(projectRoot, "package.json"));
      return normalizeVersion(pkg?.devDependencies?.electron);
    } catch {
      return "";
    }
  }
}

function runRebuild(version) {
  execSync(`electron-rebuild --version ${version}`, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
}

function main() {
  const electronVersion = getElectronVersion();

  if (!electronVersion) {
    console.warn("[electron-rebuild] Electron version not found. Skipping rebuild.");
    return;
  }

  console.log(`[electron-rebuild] Rebuilding native modules for Electron ${electronVersion}`);
  runRebuild(electronVersion);
}

main();
