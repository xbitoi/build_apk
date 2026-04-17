import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join, resolve, dirname } from "path";

const MAX_FILE_SIZE = 150 * 1024;
export const MAX_STEPS = 12;
const COMMAND_TIMEOUT = 60_000;
const IS_WINDOWS = process.platform === "win32";

export type ToolName = "read_file" | "write_file" | "run_command" | "list_directory" | "search_files";

export interface ToolCall {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
}

function normalizePath(p: string): string {
  return String(p).replace(/\\/g, "/").replace(/^[/\\]/, "");
}

function sanitizePath(userPath: string, projectRoot: string): string {
  const abs = resolve(projectRoot, normalizePath(userPath));
  const root = resolve(projectRoot);
  if (!abs.startsWith(root)) {
    throw new Error(`Access denied: path is outside project root.\nRoot: ${root}\nRequested: ${abs}`);
  }
  return abs;
}

function toolReadFile(path: string, projectRoot: string): string {
  const abs = sanitizePath(path, projectRoot);
  if (!existsSync(abs)) return `Error: File not found: ${path}`;
  const stat = statSync(abs);
  if (stat.isDirectory()) return `Error: ${path} is a directory — use list_directory instead`;
  const content = readFileSync(abs, "utf-8");
  if (content.length > MAX_FILE_SIZE)
    return content.slice(0, MAX_FILE_SIZE) + `\n\n[...truncated — file is ${Math.round(stat.size / 1024)} KB]`;
  return content;
}

function toolWriteFile(path: string, content: string, projectRoot: string): string {
  const abs = sanitizePath(path, projectRoot);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  return `Written: ${path} (${content.length} chars)`;
}

function toolRunCommand(command: string, cwd: string | undefined, projectRoot: string): string {
  const workDir = cwd ? sanitizePath(cwd, projectRoot) : projectRoot;
  if (!existsSync(workDir)) return `Error: Directory not found: ${cwd}`;
  try {
    const output = execSync(command, {
      cwd: workDir,
      timeout: COMMAND_TIMEOUT,
      encoding: "utf-8",
      shell: IS_WINDOWS ? "cmd.exe" : "/bin/sh",
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development" },
    });
    return output || "(no output)";
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const out = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    return `Error: ${out || "Command failed"}`;
  }
}

function toolListDirectory(path: string, projectRoot: string): string {
  const abs = sanitizePath(path || ".", projectRoot);
  if (!existsSync(abs)) return `Error: Directory not found: ${path}`;
  try {
    const entries = readdirSync(abs).map((name) => {
      const fullPath = join(abs, name);
      const stat = statSync(fullPath);
      return `${stat.isDirectory() ? "D" : "F"} ${name}`;
    });
    return entries.join("\n") || "(empty directory)";
  } catch (e: unknown) {
    return `Error: ${(e as Error).message}`;
  }
}

function toolSearchFiles(pattern: string, directory: string, projectRoot: string): string {
  const dir = directory ? sanitizePath(directory, projectRoot) : projectRoot;
  if (!existsSync(dir)) return `Error: Directory not found: ${directory}`;
  const results: string[] = [];
  const regex = new RegExp(pattern, "i");

  function walk(current: string, depth: number) {
    if (depth > 8) return;
    if (results.length > 50) return;
    try {
      const entries = readdirSync(current);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;
        const fullPath = join(current, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (regex.test(entry)) {
          results.push(fullPath.replace(projectRoot + "/", ""));
        }
      }
    } catch { }
  }

  walk(dir, 0);
  return results.length > 0 ? results.join("\n") : "No files found matching: " + pattern;
}

export const TOOL_DECLARATIONS = [
  {
    name: "read_file",
    description: "Read the contents of a file in the project",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file from project root" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write complete content to a file (creates parent dirs if needed). Always write the COMPLETE file.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file from project root" },
        content: { type: "string", description: "Complete file content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_command",
    description: `Run a shell command in the project. On Windows use cmd.exe syntax (no && chaining, use gradlew.bat).`,
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run" },
        cwd: { type: "string", description: "Working directory (relative to project root)" },
      },
      required: ["command"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories at a path",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path relative to project root" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for files by name pattern",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex or text pattern to search for in filenames" },
        directory: { type: "string", description: "Directory to search in (optional)" },
      },
      required: ["pattern"],
    },
  },
];

export function executeTool(toolName: ToolName, args: Record<string, unknown>, projectRoot: string): string {
  switch (toolName) {
    case "read_file":
      return toolReadFile(String(args.path ?? ""), projectRoot);
    case "write_file":
      return toolWriteFile(String(args.path ?? ""), String(args.content ?? ""), projectRoot);
    case "run_command":
      return toolRunCommand(String(args.command ?? ""), args.cwd ? String(args.cwd) : undefined, projectRoot);
    case "list_directory":
      return toolListDirectory(String(args.path ?? "."), projectRoot);
    case "search_files":
      return toolSearchFiles(String(args.pattern ?? ""), String(args.directory ?? ""), projectRoot);
    default:
      return `Error: Unknown tool: ${toolName}`;
  }
}
