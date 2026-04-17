import { Router } from "express";
import { execSync } from "child_process";

const router = Router();
const IS_WINDOWS = process.platform === "win32";

interface ToolResult {
  available: boolean;
  version: string | null;
}

function tryCommand(cmd: string): ToolResult {
  try {
    const out = execSync(cmd, {
      timeout: 6000,
      encoding: "utf-8",
      shell: IS_WINDOWS ? "cmd.exe" : "/bin/sh",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const match = (out || "").match(/(\d+[\d.]*)/);
    return { available: true, version: match ? match[1] : out.trim().slice(0, 30) };
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string };
    const combined = [err.stderr ?? "", err.stdout ?? ""].join(" ");
    const match = combined.match(/(\d+[\d.]*)/);
    if (match) return { available: true, version: match[1] };
    return { available: false, version: null };
  }
}

function checkTool(commands: string[]): ToolResult {
  for (const cmd of commands) {
    const result = tryCommand(cmd);
    if (result.available) return result;
  }
  return { available: false, version: null };
}

router.get("/", (_req, res) => {
  const java = checkTool(["java -version 2>&1", "java --version 2>&1"]);
  const node = checkTool(["node --version 2>&1"]);
  const npm = checkTool(["npm --version 2>&1"]);
  const git = checkTool(["git --version 2>&1"]);
  const gradle = checkTool([
    IS_WINDOWS ? "gradle.bat --version 2>&1" : "gradle --version 2>&1",
    "./gradlew --version 2>&1",
  ]);
  const android = checkTool([
    IS_WINDOWS ? "%ANDROID_HOME%\\platform-tools\\adb version 2>&1" : "$ANDROID_HOME/platform-tools/adb version 2>&1",
    "adb version 2>&1",
  ]);

  res.json({ java, node, npm, git, gradle, android });
});

export default router;
