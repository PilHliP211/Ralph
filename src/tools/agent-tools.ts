import { mkdir as mkdirFs, readFile, readdir, writeFile as writeFileFs } from "node:fs/promises";
import path from "node:path";

import { tool } from "@openai/agents";
import { z } from "zod";

export type AcceptanceStepGuard = (acceptanceStep: string) => void;

export interface AcceptanceToolConfig {
  requireAcceptanceStep?: boolean;
  assertAcceptanceStep?: AcceptanceStepGuard;
}

export interface ToolContextOptions extends AcceptanceToolConfig {
  projectDir: string;
  resolvePath?: (targetPath: string) => string;
}

export interface FileToolOptions extends ToolContextOptions {
  onWriteFile?: (targetPath: string, contents: string) => void | Promise<void>;
}

export interface CommandToolOptions extends ToolContextOptions {
  commandPrefix?: string;
}

export function resolveProjectPath(projectDir: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.join(projectDir, targetPath);
}

export async function runCommand(command: string, cwd?: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-lc", command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe"
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${command}\n${stderr}`);
  }

  return stdout.trim();
}

function maybeAssertAcceptanceStep(
  acceptanceStep: string | undefined,
  config: AcceptanceToolConfig
): void {
  if (!config.requireAcceptanceStep) {
    return;
  }
  if (!acceptanceStep) {
    throw new Error("Tool call rejected: acceptanceStep is required.");
  }
  config.assertAcceptanceStep?.(acceptanceStep);
}

function withAcceptance<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  config: AcceptanceToolConfig
): z.ZodObject<T & { acceptanceStep?: string }> {
  if (config.requireAcceptanceStep) {
    return schema.extend({ acceptanceStep: z.string() });
  }
  return schema;
}

export function createFileTools(options: FileToolOptions) {
  const resolvePath = options.resolvePath ?? ((targetPath: string) =>
    resolveProjectPath(options.projectDir, targetPath));

  const readFileTool = tool({
    name: "readFile",
    description: "Read a UTF-8 file from disk.",
    parameters: withAcceptance(
      z.object({
        path: z.string()
      }),
      options
    ),
    execute: async ({ path: targetPath, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      return readFile(resolvePath(targetPath), "utf8");
    }
  });

  const writeFileTool = tool({
    name: "writeFile",
    description: "Write UTF-8 content to a file, creating parent directories when needed.",
    parameters: withAcceptance(
      z.object({
        path: z.string(),
        contents: z.string()
      }),
      options
    ),
    execute: async ({ path: targetPath, contents, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const resolvedPath = resolvePath(targetPath);
      if (options.onWriteFile) {
        await options.onWriteFile(resolvedPath, contents);
      }
      await mkdirFs(path.dirname(resolvedPath), { recursive: true });
      await writeFileFs(resolvedPath, contents, "utf8");
      return `Wrote ${resolvedPath}`;
    }
  });

  const mkdirTool = tool({
    name: "mkdir",
    description: "Create a directory (recursively).",
    parameters: withAcceptance(
      z.object({
        path: z.string()
      }),
      options
    ),
    execute: async ({ path: targetPath, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const resolvedPath = resolvePath(targetPath);
      await mkdirFs(resolvedPath, { recursive: true });
      return `Created ${resolvedPath}`;
    }
  });

  const listDirTool = tool({
    name: "listDir",
    description: "List directory entries.",
    parameters: withAcceptance(
      z.object({
        path: z.string()
      }),
      options
    ),
    execute: async ({ path: targetPath, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const entries = await readdir(resolvePath(targetPath), { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "dir" : "file"
      }));
    }
  });

  return {
    readFileTool,
    writeFileTool,
    mkdirTool,
    listDirTool
  };
}

export function createGitTools(options: ToolContextOptions) {
  const gitInitTool = tool({
    name: "gitInit",
    description: "Initialize a git repository.",
    parameters: withAcceptance(
      z.object({
        path: z.string().optional()
      }),
      options
    ),
    execute: async ({ path: repoPath, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const command = repoPath ? `cd ${repoPath} && git init` : "git init";
      return runCommand(command);
    }
  });

  const gitAddTool = tool({
    name: "gitAdd",
    description: "Stage all files for commit.",
    parameters: withAcceptance(z.object({}), options),
    execute: async ({ acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      return runCommand("git add -A", options.projectDir);
    }
  });

  const gitCommitTool = tool({
    name: "gitCommit",
    description: "Commit staged files with a message.",
    parameters: withAcceptance(
      z.object({
        message: z.string()
      }),
      options
    ),
    execute: async ({ message, acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      return runCommand(`git commit -m ${JSON.stringify(message)}`, options.projectDir);
    }
  });

  const gitStatusTool = tool({
    name: "gitStatus",
    description: "Get git status summary.",
    parameters: withAcceptance(z.object({}), options),
    execute: async ({ acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      return runCommand("git status --short", options.projectDir);
    }
  });

  const gitLogTool = tool({
    name: "gitLog",
    description: "Get recent git log entries.",
    parameters: withAcceptance(
      z.object({
        limit: z.number().int().min(1).max(20).optional()
      }),
      options
    ),
    execute: async ({ acceptanceStep, limit }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const count = limit ?? 5;
      return runCommand(`git log -${count} --oneline`, options.projectDir);
    }
  });

  return {
    gitInitTool,
    gitAddTool,
    gitCommitTool,
    gitStatusTool,
    gitLogTool
  };
}

export function createCommandTools(options: CommandToolOptions) {
  const runCommandTool = tool({
    name: "runCommand",
    description: "Run a shell command.",
    parameters: withAcceptance(
      z.object({
        command: z.string(),
        cwd: z.string().optional()
      }),
      options
    ),
    execute: async ({ command, acceptanceStep, cwd }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const workingDir = cwd ? resolveProjectPath(options.projectDir, cwd) : options.projectDir;
      return runCommand(command, workingDir);
    }
  });

  const runLintTool = tool({
    name: "runLint",
    description: "Run ESLint.",
    parameters: withAcceptance(z.object({}), options),
    execute: async ({ acceptanceStep }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      return runCommand("bun run lint", options.projectDir);
    }
  });

  const runPlaywrightTool = tool({
    name: "runPlaywright",
    description: "Run Playwright tests.",
    parameters: withAcceptance(
      z.object({
        args: z.string().optional()
      }),
      options
    ),
    execute: async ({ acceptanceStep, args }) => {
      maybeAssertAcceptanceStep(acceptanceStep, options);
      const command = args ? `bunx playwright test ${args}` : "bunx playwright test";
      return runCommand(command, options.projectDir);
    }
  });

  return {
    runCommandTool,
    runLintTool,
    runPlaywrightTool
  };
}
