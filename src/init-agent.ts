import { readFile, readdir, mkdir as mkdirFs, writeFile as writeFileFs } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Agent, run, tool } from "@openai/agents";
import { z, ZodError } from "zod";

import { prdSchema } from "./schemas/prd";

const PRD_FILENAME = "prd.json";

export interface InitOptions {
  specPath: string;
  projectDir: string;
}

function getPromptPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "..", "prompts", "init-agent.md");
}

async function loadInstructions(): Promise<string> {
  const promptPath = getPromptPath();
  return readFile(promptPath, "utf8");
}

async function runCommand(command: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-lc", command], {
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

function validatePrdIfNeeded(targetPath: string, contents: string): void {
  if (path.basename(targetPath) !== PRD_FILENAME) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `PRD must be valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    prdSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`PRD schema validation failed: ${error.message}`);
    }
    throw error;
  }
}

export async function runInitialization(options: InitOptions): Promise<void> {
  console.log("[ralph] Initialization agent starting...", {
    specPath: options.specPath,
    projectDir: options.projectDir
  });

  const [specContent, instructions] = await Promise.all([
    readFile(options.specPath, "utf8"),
    loadInstructions()
  ]);

  const readFileTool = tool({
    name: "readFile",
    description: "Read a UTF-8 file from disk.",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: targetPath }) => readFile(targetPath, "utf8")
  });

  const writeFileTool = tool({
    name: "writeFile",
    description: "Write UTF-8 content to a file, creating parent directories when needed.",
    parameters: z.object({
      path: z.string(),
      contents: z.string()
    }),
    execute: async ({ path: targetPath, contents }) => {
      validatePrdIfNeeded(targetPath, contents);
      await mkdirFs(path.dirname(targetPath), { recursive: true });
      await writeFileFs(targetPath, contents, "utf8");
      return `Wrote ${targetPath}`;
    }
  });

  const mkdirTool = tool({
    name: "mkdir",
    description: "Create a directory (recursively).",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: targetPath }) => {
      await mkdirFs(targetPath, { recursive: true });
      return `Created ${targetPath}`;
    }
  });

  const listDirTool = tool({
    name: "listDir",
    description: "List directory entries.",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: targetPath }) => {
      const entries = await readdir(targetPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "dir" : "file"
      }));
    }
  });

  const gitInitTool = tool({
    name: "gitInit",
    description: "Initialize a git repository.",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: repoPath }) => {
      return runCommand(`cd ${repoPath} && git init`);
    }
  });

  const gitAddTool = tool({
    name: "gitAdd",
    description: "Stage all files for commit.",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: repoPath }) => {
      return runCommand(`cd ${repoPath} && git add -A`);
    }
  });

  const gitCommitTool = tool({
    name: "gitCommit",
    description: "Commit staged files with a message.",
    parameters: z.object({
      message: z.string(),
      path: z.string()
    }),
    execute: async ({ message, path: repoPath }) => {
      return runCommand(`cd ${repoPath} && git commit -m ${JSON.stringify(message)}`);
    }
  });

  const gitStatusTool = tool({
    name: "gitStatus",
    description: "Get git status summary.",
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path: repoPath }) => {
      return runCommand(`cd ${repoPath} && git status --short`);
    }
  });

  const agent = new Agent({
    name: "initialization-agent",
    instructions,
    model: "gpt-4.1-mini",
    modelSettings: {
      temperature: 0.2
    },
    tools: [
      readFileTool,
      writeFileTool,
      mkdirTool,
      listDirTool,
      gitInitTool,
      gitAddTool,
      gitCommitTool,
      gitStatusTool
    ]
  });

  const input = `Project directory: ${options.projectDir}\n\nProject specification:\n${specContent}`;
  await run(agent, input);

  console.log("[ralph] Initialization agent completed.");
}
