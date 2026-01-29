export interface CodingOptions {
  projectDir: string;
}

export async function runCodingLoop(options: CodingOptions): Promise<void> {
  console.log("[ralph] Coding agent loop starting...", {
    projectDir: options.projectDir
  });

  console.log("[ralph] Coding agent stub complete.");
}
