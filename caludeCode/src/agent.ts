import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import fs from "fs";
import path from "path";

const client = new Anthropic();

const SYSTEM = `You are an expert software test planner. Analyze source code thoroughly and produce actionable test plans covering:
- Unit tests for every public function, method, and class
- Integration tests for component interactions
- Edge cases: null/undefined inputs, boundary values, empty collections, large inputs
- Error paths: invalid inputs, exceptions, API failures
- Security-relevant behaviors (input validation, auth checks) where applicable

For each test case provide: descriptive name, preconditions, input/action, expected result, and test type (unit/integration/e2e).
Group tests by module or component. Prioritize by risk.`;

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage",
  "__pycache__", ".venv", ".next", "out",
]);

const readFileTool = betaZodTool({
  name: "read_file",
  description: "Read the full contents of a source code file for analysis",
  inputSchema: z.object({
    file_path: z.string().describe("Path to the file to read"),
  }),
  run: async ({ file_path }) => {
    console.log(`  [read_file]  ${file_path}`);
    try {
      return fs.readFileSync(file_path, "utf-8");
    } catch (err: any) {
      return `Error reading file: ${err.message}`;
    }
  },
});

const listFilesTool = betaZodTool({
  name: "list_files",
  description: "List source files in a directory with optional extension filtering",
  inputSchema: z.object({
    directory: z.string().describe("Directory path to list"),
    recursive: z.boolean().default(false).describe("Recurse into subdirectories"),
    extensions: z
      .array(z.string())
      .optional()
      .describe('File extensions to include, e.g. [".ts", ".js", ".py"]'),
  }),
  run: async ({ directory, recursive, extensions }) => {
    console.log(`  [list_files] ${directory} (recursive=${recursive})`);
    const results: string[] = [];

    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && recursive && !SKIP_DIRS.has(entry.name)) {
          walk(full);
        } else if (entry.isFile()) {
          if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(full);
          }
        }
      }
    };

    walk(directory);
    return results.length > 0 ? results.join("\n") : "No files found";
  },
});

const writeTestPlanTool = betaZodTool({
  name: "write_test_plan",
  description: "Write the completed test plan to a markdown file",
  inputSchema: z.object({
    output_path: z.string().describe("Destination file path for the test plan"),
    content: z.string().describe("Complete test plan content in markdown format"),
  }),
  run: async ({ output_path, content }) => {
    console.log(`  [write_test_plan] ${output_path}`);
    try {
      const dir = path.dirname(output_path);
      if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(output_path, content, "utf-8");
      return `Test plan written to: ${path.resolve(output_path)}`;
    } catch (err: any) {
      return `Error writing file: ${err.message}`;
    }
  },
});

export interface PlannerOptions {
  targetPath: string;
  outputPath: string;
  context?: string;
}

export async function runTestPlannerAgent(opts: PlannerOptions): Promise<void> {
  const { targetPath, outputPath, context } = opts;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedOutput = path.resolve(outputPath);

  const prompt = [
    `Create a comprehensive test plan for the source code at: ${resolvedTarget}`,
    context ? `\nAdditional context: ${context}` : "",
    `\nWhen finished, write the test plan to: ${resolvedOutput}`,
    "\nSteps:",
    "1. Explore the directory structure to understand the codebase",
    "2. Read the relevant source files",
    "3. Write a thorough test plan covering all testable behaviors",
  ].join("");

  console.log("\nTest Planner Agent");
  console.log("==================");
  console.log(`Target : ${resolvedTarget}`);
  console.log(`Output : ${resolvedOutput}`);
  console.log("\nAgent is running...\n");

  // toolRunner handles the agentic loop automatically
  const finalMessage = await (client.beta.messages as any).toolRunner({
    model: "claude-opus-4-8",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    tools: [readFileTool, listFilesTool, writeTestPlanTool],
    messages: [{ role: "user", content: prompt }],
  });

  console.log("\n--- Agent Summary ---");
  for (const block of finalMessage.content ?? []) {
    if (block.type === "text") {
      console.log(block.text);
    }
  }
}
