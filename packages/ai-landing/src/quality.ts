import { spawn } from "node:child_process";
import path from "node:path";
import { scriptsDir } from "./paths.js";
import type { QualityCheckResult } from "./types.js";

function run(command: string, args: string[], cwd: string, timeoutMs = 90_000): Promise<QualityCheckResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (d) => { stdout += String(d); });
    child.stderr.on("data", (d) => { stderr += String(d); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        name: args.some((a) => a.includes("check_fold")) ? "check_fold" : "score_landing",
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ name: "score_landing", ok: false, exitCode: null, stdout, stderr: String(err) });
    });
  });
}

export async function runQualityChecks(params: {
  indexHtml: string;
  cwd: string;
  runFoldCheck?: boolean;
}): Promise<QualityCheckResult[]> {
  const checks: QualityCheckResult[] = [];
  const scoreCheck = await run("python3", [path.join(scriptsDir, "score_landing.py"), "--json", params.indexHtml], params.cwd);
  try {
    const results = JSON.parse(scoreCheck.stdout || "[]") as Array<{ score?: number }>;
    const minScore = Math.min(...results.map((r) => r.score ?? 0));
    scoreCheck.ok = Number.isFinite(minScore) && minScore > 80;
    if (!scoreCheck.ok) {
      scoreCheck.stderr = [scoreCheck.stderr, `quality threshold failed: score ${minScore} <= 80`].filter(Boolean).join("\n");
    }
  } catch {
    scoreCheck.ok = false;
    scoreCheck.stderr = [scoreCheck.stderr, "could not parse score_landing --json output"].filter(Boolean).join("\n");
  }
  checks.push(scoreCheck);
  if (params.runFoldCheck) {
    checks.push(await run("node", [path.join(scriptsDir, "check_fold.mjs"), params.indexHtml], params.cwd, 120_000));
  }
  return checks;
}

export function summarizeQuality(checks: QualityCheckResult[]): string {
  return checks.map((c) => [
    `# ${c.name}: ${c.ok ? "PASS" : "FAIL"}`,
    c.stdout.trim(),
    c.stderr.trim() ? `stderr:\n${c.stderr.trim()}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}
