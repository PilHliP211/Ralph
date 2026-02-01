import { readFile, writeFile as writeFileFs, mkdir as mkdirFs } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Agent, run, tool } from "@openai/agents";
import { z, ZodError } from "zod";

import { featureListSchema, FeatureList } from "./schemas/feature-list";

const FEATURE_LIST_FILENAME = "feature_list.json";
const PROGRESS_FILENAME = "progress.txt";

export interface CodingOptions {
  projectDir: string;
  model: string;
}

interface IterationResult {
  completed: boolean;
}

async function runCommand(command: string, projectDir: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-lc", command], {
    cwd: projectDir,
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

function validateFeatureListIfNeeded(targetPath: string, contents: string): void {
  if (path.basename(targetPath) !== FEATURE_LIST_FILENAME) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Feature list must be valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    featureListSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Feature list schema validation failed: ${error.message}`);
    }
    throw error;
  }
}

async function loadFeatureList(projectDir: string): Promise<FeatureList> {
  const featurePath = path.join(projectDir, FEATURE_LIST_FILENAME);
  const contents = await readFile(featurePath, "utf8");
  const parsed = JSON.parse(contents) as unknown;
  return featureListSchema.parse(parsed);
}

function findNextFeature(features: FeatureList): { index: number; feature: FeatureList[number] } | null {
  const index = features.findIndex((feature) => feature.passes === false);
  if (index === -1) {
    return null;
  }
  return { index, feature: features[index] };
}

export async function runCodingIteration(options: CodingOptions): Promise<IterationResult> {
  console.log("[ralph] Coding agent iteration starting...", {
    projectDir: options.projectDir
  });

  const featureList = await loadFeatureList(options.projectDir);
  const nextFeature = findNextFeature(featureList);

  if (!nextFeature) {
    console.log("[ralph] All features are marked as passing.");
    return { completed: true };
  }

  const progressPath = path.join(options.projectDir, PROGRESS_FILENAME);
  const progressSummary = await readFile(progressPath, "utf8").catch(() => "No progress notes yet.");
  const gitHistory = await runCommand("git log -5 --oneline", options.projectDir).catch(
    () => "No git history yet."
  );

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
      validateFeatureListIfNeeded(targetPath, contents);
      await mkdirFs(path.dirname(targetPath), { recursive: true });
      await writeFileFs(targetPath, contents, "utf8");
      return `Wrote ${targetPath}`;
    }
  });

  const runCommandTool = tool({
    name: "runCommand",
    description: "Run a shell command from the project directory.",
    parameters: z.object({
      command: z.string()
    }),
    execute: async ({ command }) => runCommand(command, options.projectDir)
  });

  const gitAddTool = tool({
    name: "gitAdd",
    description: "Stage all files for commit.",
    parameters: z.object({}),
    execute: async () => runCommand("git add -A", options.projectDir)
  });

  const gitCommitTool = tool({
    name: "gitCommit",
    description: "Commit staged files with a message.",
    parameters: z.object({
      message: z.string()
    }),
    execute: async ({ message }) => runCommand(`git commit -m ${JSON.stringify(message)}`, options.projectDir)
  });

  const gitStatusTool = tool({
    name: "gitStatus",
    description: "Get git status summary.",
    parameters: z.object({}),
    execute: async () => runCommand("git status --short", options.projectDir)
  });

  const agent = new Agent({
    name: "coding-agent",
    instructions: await loadInstructions(),
    model: options.model,
    modelSettings: {
      temperature: 0.2
    },
    tools: [readFileTool, writeFileTool, runCommandTool, gitAddTool, gitCommitTool, gitStatusTool]
  });

  const input = [
    `Project directory: ${options.projectDir}`,
    `Active feature (index ${nextFeature.index + 1}): ${nextFeature.feature.description}`,
    `Tests/acceptance criteria:\n${nextFeature.feature.tests.map((test) => `- ${test}`).join("\n")}`,
    `Recent progress notes:\n${progressSummary}`,
    `Recent git history:\n${gitHistory}`
  ].join("\n\n");

  await run(agent, input);
  console.log("[ralph] Coding agent iteration completed.");

  return { completed: false };
}

async function loadInstructions(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const promptPath = path.resolve(moduleDir, "..", "prompts", "coding_prompt.md");
  return readFile(promptPath, "utf8");
}
