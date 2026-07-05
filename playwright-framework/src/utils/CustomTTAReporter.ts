import {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

interface TestSummary {
  name: string;
  status: string;
  duration: number;
  error?: string;
}

export default class CustomTTAReporter implements Reporter {
  private results: TestSummary[] = [];
  private startTime: number = Date.now();
  private outputDir = 'tta-report';

  onBegin(_config: unknown, suite: Suite): void {
    console.log(`\n[TTA Reporter] Starting ${suite.allTests().length} tests...\n`);
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.results.push({
      name: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
    });
  }

  onEnd(result: FullResult): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;

    const html = this.buildHtml({ passed, failed, skipped, duration, status: result.status });
    const outputPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`\n[TTA Reporter] Report written to ${outputPath}`);
    console.log(`  Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped} | Duration: ${duration}s\n`);
  }

  private buildHtml(summary: {
    passed: number;
    failed: number;
    skipped: number;
    duration: string;
    status: string;
  }): string {
    const rows = this.results
      .map(
        (r) => `
        <tr class="${r.status}">
          <td>${r.name}</td>
          <td>${r.status}</td>
          <td>${(r.duration / 1000).toFixed(2)}s</td>
          <td>${r.error ? `<pre>${r.error}</pre>` : '-'}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TTA Test Report</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .badge { padding: 8px 16px; border-radius: 6px; font-weight: bold; color: #fff; }
    .passed-badge { background: #22c55e; }
    .failed-badge { background: #ef4444; }
    .skipped-badge { background: #f59e0b; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
    th { background: #1e293b; color: #fff; padding: 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr.passed td:nth-child(2) { color: #16a34a; font-weight: bold; }
    tr.failed td:nth-child(2) { color: #dc2626; font-weight: bold; }
    tr.skipped td:nth-child(2) { color: #d97706; font-weight: bold; }
    pre { margin: 0; white-space: pre-wrap; font-size: 12px; color: #dc2626; }
  </style>
</head>
<body>
  <h1>TTA Test Report</h1>
  <p>Status: <strong>${summary.status}</strong> | Duration: ${summary.duration}s</p>
  <div class="summary">
    <span class="badge passed-badge">Passed: ${summary.passed}</span>
    <span class="badge failed-badge">Failed: ${summary.failed}</span>
    <span class="badge skipped-badge">Skipped: ${summary.skipped}</span>
  </div>
  <table>
    <thead>
      <tr><th>Test</th><th>Status</th><th>Duration</th><th>Error</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  }
}
