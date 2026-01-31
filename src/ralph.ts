import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { setDefaultModelProvider } from "@openai/agents";
import { OpenAIProvider } from "@openai/agents-openai";

import { runCodingLoop } from "./coding-agent";
import { runInitialization } from "./init-agent";

interface RunContext {
  projectDir: string;
  specPath?: string;
  mode: "init" | "continue";
}

const PRD_FILENAME = "prd.json";

function printUsage(): void {
  console.log("\nUsage:");
  console.log("  ralph init <spec_file> [project_dir]");
  console.log("  ralph continue");
  console.log("  ralph\n");
}

function resolveProjectDir(projectDirArg?: string): string {
  if (!projectDirArg) {
    return process.cwd();
  }

  return path.resolve(projectDirArg);
}

function ensureProjectDirExists(projectDir: string): void {
  if (!existsSync(projectDir)) {
    console.error(`[ralph] Project directory does not exist: ${projectDir}`);
    process.exit(1);
  }
}

function resolveSpecPath(specArg: string): string {
  return path.resolve(specArg);
}

function ensureSpecExists(specPath: string): void {
  if (!existsSync(specPath)) {
    console.error(`[ralph] Spec file does not exist: ${specPath}`);
    process.exit(1);
  }
}

function ensureApiKey(mode: RunContext["mode"]): void {
  if (process.env.OPENAI_API_KEY) {
    return;
  }

  if (mode === "continue") {
    console.error("[ralph] Missing OPENAI_API_KEY environment variable.");
    process.exit(1);
  }

  console.warn(
    "[ralph] OPENAI_API_KEY is not set. Initialization will run until the agent attempts API calls."
  );
}

function parseArgs(): RunContext {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "continue") {
    const projectDir = resolveProjectDir();
    return { projectDir, mode: "continue" };
  }

  if (command === "init") {
    const specArg = args[1];
    if (!specArg) {
      console.error("[ralph] Missing spec file path for init.");
      printUsage();
      process.exit(1);
    }

    const projectDirArg = args[2];
    const projectDir = resolveProjectDir(projectDirArg);
    const specPath = resolveSpecPath(specArg);
    return { projectDir, specPath, mode: "init" };
  }

  if (command === "-h" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  console.error(`[ralph] Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

async function runLifecycle(context: RunContext): Promise<void> {
  ensureProjectDirExists(context.projectDir);
  if (context.mode === "init" && context.specPath) {
    ensureSpecExists(context.specPath);
  }

  const projectDir = context.projectDir;
  process.chdir(projectDir);

  const prdPath = path.join(projectDir, PRD_FILENAME);
  const hasPrd = existsSync(prdPath);

  if (context.mode === "continue" && !hasPrd) {
    console.error(`[ralph] Missing ${PRD_FILENAME}. Run 'ralph init' first.`);
    process.exit(1);
  }

  const startupProcess = startIfExists(projectDir, "startup.sh");
  const cleanup = createCleanupHandler(projectDir, startupProcess);
  registerSignalHandlers(cleanup);

  try {
    if (!hasPrd && context.mode === "init") {
      await runInitialization({
        specPath: context.specPath ?? "",
        projectDir
      });
    } else if (hasPrd && context.mode === "init") {
      console.warn(`[ralph] ${PRD_FILENAME} already exists. Skipping init.`);
    }

    await runCodingLoop({ projectDir });
  } finally {
    await cleanup();
  }
}

function startIfExists(projectDir: string, scriptName: string): Bun.Process | null {
  const scriptPath = path.join(projectDir, scriptName);
  if (!existsSync(scriptPath)) {
    return null;
  }

  console.log(`[ralph] Running ${scriptName}...`);
  return Bun.spawn(["bash", scriptPath], {
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit"
  });
}

function createCleanupHandler(projectDir: string, startupProcess: Bun.Process | null) {
  let cleanedUp = false;

  return async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    await runShutdown(projectDir);

    if (startupProcess) {
      startupProcess.kill();
    }
  };
}

async function runShutdown(projectDir: string): Promise<void> {
  const shutdownPath = path.join(projectDir, "shutdown.sh");
  if (!existsSync(shutdownPath)) {
    return;
  }

  console.log("[ralph] Running shutdown.sh...");
  const shutdownProcess = Bun.spawn(["bash", shutdownPath], {
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit"
  });
  await shutdownProcess.exited;
}

function registerSignalHandlers(cleanup: () => Promise<void>): void {
  const handleSignal = (signal: NodeJS.Signals) => {
    console.warn(`[ralph] Received ${signal}, shutting down...`);
    void cleanup().finally(() => process.exit(0));
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
}

const context = parseArgs();
setDefaultModelProvider(
  new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY
  })
);
ensureApiKey(context.mode);
void runLifecycle(context);
