const fs = require("node:fs/promises");
const path = require("node:path");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

exports.default = async function afterPackLinuxNoSandbox(context) {
  if (context.electronPlatformName !== "linux") {
    return;
  }

  const executableName = context.packager.executableName;
  const appOutDir = context.appOutDir;
  const executablePath = path.join(appOutDir, executableName);
  const realBinaryPath = path.join(appOutDir, `${executableName}.bin`);

  if (!(await fileExists(executablePath))) {
    throw new Error(`Linux executable not found: ${executablePath}`);
  }

  if (!(await fileExists(realBinaryPath))) {
    await fs.rename(executablePath, realBinaryPath);
  } else {
    await fs.unlink(executablePath);
  }

  const wrapper = `#!/bin/sh
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export ELECTRON_DISABLE_SANDBOX=1
exec "$HERE/${executableName}.bin" --no-sandbox --disable-gpu-sandbox "$@"
`;

  await fs.writeFile(executablePath, wrapper, "utf8");
  await fs.chmod(executablePath, 0o755);
  await fs.chmod(realBinaryPath, 0o755);
};