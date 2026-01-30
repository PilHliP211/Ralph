import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Agent, Runner, user } from "@openai/agents";
import { z, ZodError } from "zod";

import { prdSchema, type Prd, type PrdFeature } from "./schemas/prd";
import {
  createCommandTools,
  createFileTools,
  createGitTools,
  resolveProjectPath,
  runCommand
} from "./tools/agent-tools";

const PRD_FILENAME = "prd.json";
const PROGRESS_FILENAME = "progress.md";
const NEXT_DOCS_PATH = path.join("temp-docs", "next.md");
const TIME_BUDGET_MS = 4.5 * 60 * 60 * 1000;
const MAX_TURNS = 40;

const codingOutputSchema = z.object({
  completed: z.boolean(),
  summary: z.string().min(1),
  tempDocs: z.array(z.string().min(1)).default([]),
  progressUpdate: z.string().optional()
});

type CodingOutput = z.infer<typeof codingOutputSchema>;

export interface CodingOptions {
  projectDir: string;
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function loadCodingAgentDoc(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const docPath = path.resolve(moduleDir, "..", "docs", "coding-agent.md");
  const content = await readOptionalFile(docPath);
  if (!content) {
    throw new Error(`[ralph] Missing coding agent documentation at ${docPath}`);
  }
  return content;
}

function parsePrd(contents: string): Prd {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`PRD must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return prdSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`PRD schema validation failed: ${error.message}`);
    }
    throw error;
  }
}

function validatePrdMutation(original: Prd, updated: Prd, activeIndex: number): void {
  if (original.length !== updated.length) {
    throw new Error("PRD mutation rejected: feature list length changed.");
  }

  original.forEach((feature, index) => {
    const updatedFeature = updated[index];
    const { passes: originalPasses, ...originalRest } = feature;
    const { passes: updatedPasses, ...updatedRest } = updatedFeature;

    if (JSON.stringify(originalRest) !== JSON.stringify(updatedRest)) {
      throw new Error(
        `PRD mutation rejected: non-passes fields changed for feature index ${index}.`
      );
    }

    if (index === activeIndex) {
      if (updatedPasses !== originalPasses && !(originalPasses === false && updatedPasses === true)) {
        throw new Error(
          "PRD mutation rejected: active feature passes can only flip from false to true."
        );
      }
    } else if (updatedPasses !== originalPasses) {
      throw new Error("PRD mutation rejected: passes changed for a non-active feature.");
    }
  });
}

function findNextFeature(prd: Prd): { feature: PrdFeature; index: number } | null {
  const index = prd.findIndex((feature) => !feature.passes);
  if (index === -1) {
    return null;
  }
  return { feature: prd[index], index };
}

async function buildInstructions(feature: PrdFeature, doc: string): Promise<string> {
  return `${doc}

Selected feature:
Description: ${feature.description}
Acceptance steps:
${feature.steps.map((step, index) => `  ${index + 1}. ${step}`).join("\n")}

Final response format: JSON matching this schema:
{
  "completed": boolean,
  "summary": string,
  "tempDocs": string[],
  "progressUpdate"?: string
}
`;
}

function renderTempDocsIndex(tempDocs: string[]): string {
  const lines = ["# Temp docs from last session", ""];
  if (tempDocs.length === 0) {
    lines.push("- (none)");
  } else {
    tempDocs.forEach((doc) => lines.push(`- ${doc}`));
  }
  lines.push("");
  return lines.join("\n");
}

export async function runCodingLoop(options: CodingOptions): Promise<void> {
  console.log("[ralph] Coding agent loop starting...", {
    projectDir: options.projectDir
  });

  const prdPath = path.join(options.projectDir, PRD_FILENAME);
  const progressPath = path.join(options.projectDir, PROGRESS_FILENAME);
  const nextDocsPath = path.join(options.projectDir, NEXT_DOCS_PATH);

  const runner = new Runner({
    workflowName: "ralph-coding-loop"
  });

  const codingAgentDoc = await loadCodingAgentDoc();

  let activeFeature: PrdFeature | null = null;
  let activeFeatureIndex = -1;
  let prdSnapshot: Prd | null = null;

  const requireActiveFeature = (): { feature: PrdFeature; index: number } => {
    if (!activeFeature || activeFeatureIndex < 0) {
      throw new Error("Tool call rejected: no active feature selected.");
    }
    return { feature: activeFeature, index: activeFeatureIndex };
  };

  const assertAcceptanceStep = (acceptanceStep: string): void => {
    const { feature } = requireActiveFeature();
    if (!feature.steps.includes(acceptanceStep)) {
      throw new Error(
        `Tool call rejected: acceptanceStep must match a selected feature step. Got "${acceptanceStep}".`
      );
    }
  };

  const fileTools = createFileTools({
    projectDir: options.projectDir,
    requireAcceptanceStep: true,
    assertAcceptanceStep,
    resolvePath: (targetPath) => resolveProjectPath(options.projectDir, targetPath),
    onWriteFile: async (targetPath, contents) => {
      if (path.basename(targetPath) !== PRD_FILENAME) {
        return;
      }
      const { index } = requireActiveFeature();
      if (!prdSnapshot) {
        throw new Error("PRD mutation rejected: missing baseline PRD snapshot.");
      }
      const updated = parsePrd(contents);
      validatePrdMutation(prdSnapshot, updated, index);
      prdSnapshot = updated;
    }
  });

  const commandTools = createCommandTools({
    projectDir: options.projectDir,
    requireAcceptanceStep: true,
    assertAcceptanceStep
  });

  const gitTools = createGitTools({
    projectDir: options.projectDir,
    requireAcceptanceStep: true,
    assertAcceptanceStep
  });

  const tools = [
    fileTools.readFileTool,
    fileTools.writeFileTool,
    fileTools.mkdirTool,
    fileTools.listDirTool,
    commandTools.runCommandTool,
    commandTools.runLintTool,
    commandTools.runPlaywrightTool,
    gitTools.gitAddTool,
    gitTools.gitCommitTool,
    gitTools.gitStatusTool,
    gitTools.gitLogTool
  ];

  const startTime = Date.now();
  while (Date.now() - startTime < TIME_BUDGET_MS) {
    const prdContents = await readFile(prdPath, "utf8");
    const prd = parsePrd(prdContents);
    prdSnapshot = prd;

    const nextFeature = findNextFeature(prd);
    if (!nextFeature) {
      console.log("[ralph] No remaining PRD features with passes=false.");
      break;
    }

    activeFeature = nextFeature.feature;
    activeFeatureIndex = nextFeature.index;

    const [progressContents, nextDocsContents, gitLog] = await Promise.all([
      readOptionalFile(progressPath),
      readOptionalFile(nextDocsPath),
      runCommand("git log -5 --oneline", options.projectDir)
    ]);

    const orientation = [
      `Project directory: ${options.projectDir}`,
      `Selected feature index: ${activeFeatureIndex}`,
      `Selected feature description: ${activeFeature.description}`,
      `Acceptance steps:\n${activeFeature.steps.map((step, index) => `  ${index + 1}. ${step}`).join("\n")}`,
      `Recent git log:\n${gitLog || "(none)"}`,
      `progress.md:\n${progressContents ?? "(missing)"}`,
      `temp-docs/next.md:\n${nextDocsContents ?? "(missing)"}`
    ].join("\n\n");

    const instructions = await buildInstructions(activeFeature, codingAgentDoc);
    const agent = new Agent({
      name: "coding-agent",
      instructions,
      model: {
        name: "gpt-4.1-mini",
        temperature: 0.2
      },
      tools,
      outputType: codingOutputSchema
    });

    const runResult = await runner.run(agent, [user(orientation)], {
      stream: true,
      maxTurns: MAX_TURNS
    });

    const transcript: string[] = [];
    for await (const event of runResult) {
      if (event.type === "run_item_stream_event") {
        if (event.name === "message_output_created") {
          const rawContent = (event.item as { rawItem?: { content?: Array<{ type?: string; text?: string }> } })
            .rawItem?.content;
          const text = rawContent
            ?.filter((part) => part.type === "output_text")
            .map((part) => part.text)
            .join("")
            .trim();
          if (text) {
            transcript.push(text);
          }
        }

        if (event.name === "tool_called") {
          const rawItem = (event.item as { rawItem?: { name?: string; arguments?: string } }).rawItem;
          if (rawItem?.name) {
            transcript.push(`[tool call] ${rawItem.name} ${rawItem.arguments ?? ""}`.trim());
          }
        }

        if (event.name === "tool_output") {
          const outputItem = event.item as { output?: string };
          if (outputItem.output) {
            transcript.push(`[tool output] ${outputItem.output}`);
          }
        }
      }
    }

    await runResult.completed;

    if (transcript.length > 0) {
      console.log(`[ralph] Captured ${transcript.length} transcript entries.`);
    }

    const finalOutput = runResult.finalOutput as CodingOutput | undefined;
    if (!finalOutput) {
      throw new Error("Coding agent did not return a final output.");
    }

    const prdAfterContents = await readFile(prdPath, "utf8");
    const prdAfter = parsePrd(prdAfterContents);
    validatePrdMutation(prdSnapshot, prdAfter, activeFeatureIndex);

    if (finalOutput.completed) {
      if (!prdAfter[activeFeatureIndex].passes) {
        prdAfter[activeFeatureIndex].passes = true;
        validatePrdMutation(prdSnapshot, prdAfter, activeFeatureIndex);
        await writeFile(prdPath, `${JSON.stringify(prdAfter, null, 2)}\n`, "utf8");
      }
    }

    const sessionLogPath = path.join(options.projectDir, "temp-docs", "last-run.json");
    await mkdir(path.dirname(sessionLogPath), { recursive: true });
    await writeFile(
      sessionLogPath,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          featureIndex: activeFeatureIndex,
          featureDescription: activeFeature.description,
          output: finalOutput,
          transcript
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    if (finalOutput.progressUpdate) {
      const timestamp = new Date().toISOString();
      const latestProgress = (await readOptionalFile(progressPath)) ?? "";
      const prefix = latestProgress.length > 0 && !latestProgress.endsWith("\n")
        ? `${latestProgress}\n`
        : latestProgress;
      const entry = `- ${timestamp} ${finalOutput.progressUpdate}`;
      await writeFile(progressPath, `${prefix}${entry}\n`, "utf8");
    }

    await mkdir(path.dirname(nextDocsPath), { recursive: true });
    await writeFile(nextDocsPath, renderTempDocsIndex(finalOutput.tempDocs), "utf8");

    console.log("[ralph] Coding loop iteration complete.");
    console.log("[ralph] Summary:", finalOutput.summary);

    if (!finalOutput.completed) {
      console.warn("[ralph] Feature not marked as completed. Ending loop.");
      break;
    }
  }

  console.log("[ralph] Coding agent loop complete.");
}
