import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { setDefaultModelProvider } from "@openai/agents";
import { OpenAIProvider } from "@openai/agents-openai";

import { runCodingIteration } from "./coding-agent";
import { runInitialization } from "./init-agent";

interface RunContext {
  projectDir: string;
  maxIterations: number | null;
  model: string;
}

interface IterationResult {
  completed: boolean;
}

const FEATURE_LIST_FILENAME = "feature_list.json";
const DEFAULT_PROJECT_DIR = "./autonomous_demo_project";
const DEFAULT_MODEL = "gpt-4.1";
const SLEEP_MS = 3000;

function printUsage(): void {
  console.log("\nUsage:");
  console.log("  ralph [--project-dir ./my_project] [--max-iterations 3] [--model gpt-4.1]");
  console.log("  ralph --help\n");
}

function resolveProjectDir(projectDirArg?: string): string {
  return path.resolve(projectDirArg ?? DEFAULT_PROJECT_DIR);
}

function ensureProjectDirExists(projectDir: string): void {
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }
}

function ensureApiKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[ralph] Missing OPENAI_API_KEY environment variable.");
    process.exit(1);
  }
}

function parseArgs(): RunContext {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const getArgValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index === -1) {
      return undefined;
    }
    return args[index + 1];
  };

  const projectDir = resolveProjectDir(getArgValue("--project-dir"));
  const maxIterationsRaw = getArgValue("--max-iterations");
  const model = getArgValue("--model") ?? DEFAULT_MODEL;
  const maxIterations = maxIterationsRaw ? Number.parseInt(maxIterationsRaw, 10) : null;

  if (maxIterationsRaw && (Number.isNaN(maxIterations) || maxIterations <= 0)) {
    console.error("[ralph] --max-iterations must be a positive integer.");
    process.exit(1);
  }

  return { projectDir, maxIterations, model };
}

async function runLifecycle(context: RunContext): Promise<void> {
  ensureProjectDirExists(context.projectDir);

  const projectDir = context.projectDir;
  process.chdir(projectDir);

  const featureListPath = path.join(projectDir, FEATURE_LIST_FILENAME);
  const hasFeatureList = existsSync(featureListPath);

  const startupProcess = startIfExists(projectDir, "startup.sh");
  const cleanup = createCleanupHandler(projectDir, startupProcess);
  registerSignalHandlers(cleanup);

  try {
    if (!hasFeatureList) {
      await runInitialization({
        projectDir,
        model: context.model
      });
    }

    let iteration = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      if (context.maxIterations !== null && iteration >= context.maxIterations) {
        console.log("[ralph] Max iterations reached. Exiting.");
        break;
      }

      const result = await runCodingIteration({
        projectDir,
        model: context.model
      });
      iteration += 1;
      shouldContinue = !result.completed;

      if (shouldContinue) {
        await sleep(SLEEP_MS);
      }
    }
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const context = parseArgs();
setDefaultModelProvider(
  new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY
  })
);
ensureApiKey();
void runLifecycle(context);
