#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { runProbe, redact } from './probe-agents.mjs';
const reportPath = fileURLToPath(new URL('./probe-report.json', import.meta.url));
try {
  const result = await runProbe({ apiKey: process.env.OPENAI_API_KEY, reportPath, inventoryMode: process.env.PROBE_INVENTORY_MODE === 'inline' ? 'inline' : 'function', keepSession: process.env.KEEP_SESSION === '1' });
  console.log(JSON.stringify({ ok: true, report_path: reportPath, session_id: result.session_id, cleanup: result.cleanup, subagents: result.subagent_ids.length, tool_calls: result.tool_calls_handled.length, usage: result.usage }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: redact(error.message, [process.env.OPENAI_API_KEY]), report_path: reportPath }));
  process.exitCode = 1;
}
