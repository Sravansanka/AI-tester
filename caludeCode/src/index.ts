import Anthropic from "@anthropic-ai/sdk";
import { runTestPlannerAgent } from "./agent";

function printHelp(): void {
  console.log(`
Test Planner Agent — AI-powered test plan generator

Usage:
  npx tsx src/index.ts [options]

Options:
  --path, -p    <path>   Source code directory or file to analyze (default: .)
  --output, -o  <file>   Output file for the test plan (default: test-plan.md)
  --context, -c <text>   Extra context for the planner (e.g. "REST API, no auth")
  --help, -h             Show this help

Examples:
  npx tsx src/index.ts --path ./src --output plans/test-plan.md
  npx tsx src/index.ts --path ./src/api.ts --context "Express REST API"
  npx tsx src/index.ts --path . --output plan.md --context "React frontend app"
  `.trim());
}

function parseArgs(): { targetPath: string; outputPath: string; context?: string } {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  let targetPath = ".";
  let outputPath = "test-plan.md";
  let context: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--path" || args[i] === "-p") && args[i + 1]) {
      targetPath = args[++i];
    } else if ((args[i] === "--output" || args[i] === "-o") && args[i + 1]) {
      outputPath = args[++i];
    } else if ((args[i] === "--context" || args[i] === "-c") && args[i + 1]) {
      context = args[++i];
    }
  }

  return { targetPath, outputPath, context };
}

const options = parseArgs();

runTestPlannerAgent(options).catch((err: unknown) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Authentication failed. Set the ANTHROPIC_API_KEY environment variable.");
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error("Rate limit hit. Wait a moment and try again.");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error (${err.status}): ${err.message}`);
  } else {
    console.error("Error:", (err as Error).message ?? err);
  }
  process.exit(1);
});
