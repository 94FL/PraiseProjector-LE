#!/usr/bin/env node

import { execSync, execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json to get output directory
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Get base output directory from config and append /linux for Linux builds
const baseOutputDir = packageJson.build?.directories?.output || "release";
const linuxOutputDir = `${baseOutputDir}/linux`;

console.log(`Using output directory: ${linuxOutputDir}`);

// Detect container runtime (podman or docker)
function detectContainerRuntime() {
  const runtimes = ["podman", "docker"];

  for (const runtime of runtimes) {
    try {
      execSync(`${runtime} --version`, { stdio: "pipe" });
      console.log(`Found container runtime: ${runtime}`);
      return runtime;
    } catch (error) {
      // Runtime not found, try next
    }
  }

  throw new Error("Neither podman nor docker found. Please install one of them.");
}

// Get absolute project path
const projectPath = path.resolve(__dirname, "..");

// Detect runtime
const containerRuntime = detectContainerRuntime();


// Custom image name
const customImage = "praiseprojector-electron-builder:latest";
const dockerfilePath = path.join(__dirname, "..", "docker", "Dockerfile.electron-builder");

function imageExists(runtime, imageName) {
  try {
    execSync(`${runtime} image inspect ${imageName}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Build image if not exists
if (!imageExists(containerRuntime, customImage)) {
  console.log(`Custom image '${customImage}' not found. Building...`);
  execSync(`${containerRuntime} build -t ${customImage} -f "${dockerfilePath}" "${path.dirname(dockerfilePath)}"`, { stdio: "inherit" });
  console.log(`Custom image '${customImage}' built.`);
} else {
  console.log(`Using existing image: ${customImage}`);
}

// Build the container command using the custom image
const containerCmd = [
  containerRuntime,
  "run",
  "--rm",
  "-it",
  "-e ELECTRON_CACHE=/root/.cache/electron",
  "-e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder",
  `-v "${projectPath}:/project"`,
  "-w /project",
  customImage,
  "/bin/bash -lc",
  `"mkdir -p /tmp/project && cd /project && tar --exclude=www --exclude=node_modules --exclude=package-lock.json --exclude=dist -cf - . | tar -xf - -C /tmp/project && cd /tmp/project && npm install && npm run build && npx electron-builder --linux AppImage && mkdir -p /project/${linuxOutputDir} && cp -r ${baseOutputDir}/* /project/${linuxOutputDir}/"`,
].join(" ");

console.log("Building Linux AppImage using container...");
console.log(`Command: ${containerCmd}\n`);

try {
  execSync(containerCmd, { stdio: "inherit", shell: true });
  console.log(`\nBuild complete! Output in: ${linuxOutputDir}`);
} catch (error) {
  console.error("Build failed!");
  process.exit(1);
}
