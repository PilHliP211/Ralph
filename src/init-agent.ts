import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Agent } from "@openai/agents";
import { ZodError } from "zod";

import { prdSchema } from "./schemas/prd";
import { createFileTools, createGitTools } from "./tools/agent-tools";

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

  const fileTools = createFileTools({
    projectDir: options.projectDir,
    onWriteFile: (targetPath, contents) => {
      validatePrdIfNeeded(targetPath, contents);
    }
  });

  const gitTools = createGitTools({
    projectDir: options.projectDir
  });

  const agent = new Agent({
    name: "initialization-agent",
    instructions,
    model: {
      name: "gpt-4.1-mini",
      temperature: 0.2
    },
    tools: [
      fileTools.readFileTool,
      fileTools.writeFileTool,
      fileTools.mkdirTool,
      fileTools.listDirTool,
      gitTools.gitInitTool,
      gitTools.gitAddTool,
      gitTools.gitCommitTool,
      gitTools.gitStatusTool
    ]
  });

  const input = `Project directory: ${options.projectDir}\n\nProject specification:\n${specContent}`;
  await agent.run({ input });

  console.log("[ralph] Initialization agent completed.");
}
