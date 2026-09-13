#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.openai.com/v1";
const AGENTS_BETA = "agents=v1";
const TIMEOUT_MS = 120_000;
const CLEANUP_TIMEOUT_MS = 10_000;
const REPORT_PATH = fileURLToPath(new URL("./probe-report.json", import.meta.url));

export const SEA_DATASET_INVENTORY = Object.freeze({
  scope: "Terra Astra checked-in Southeast Asia/global source inventory",
  java_profile: {
    id: "java-north-south",
    question: "Show me Java’s mountains and the ocean floor to its south. How far does the landscape drop?",
    source: "NOAA NCEI ETOPO 2022, Ice Surface, 60 arc-second source; bilinear globe-scale sample",
    source_url: "https://www.ncei.noaa.gov/products/etopo-global-relief-model",
    source_doi: "https://doi.org/10.25921/fd45-gt74",
    source_grid_sha256: "38ec07739763397d9a560dc608a4023a8e00c1ffa648ac592f15a851747a380f",
    visualization: { available_in_client: true, point_count: 121, source: "public/data/sea-java-profile.json" },
    longitude: 112.922,
    latitude_bounds: { north: -6, south: -12 },
    resolution_degrees: 0.25,
    sampling: "Bilinear samples every 0.05 degrees from a 0.25-degree grid; spacing does not increase source resolution.",
    highest: { latitude: -7.9, distance_km: 211.3, elevation_m: 984 },
    lowest: { latitude: -10.85, distance_km: 539.3, elevation_m: -5361 },
    vertical_range_m: 6345,
    limitations: [
      "These are smoothed grid samples, not measured summit heights or the maximum depth of the entire trench.",
      "The section follows one meridian across Java; it does not follow a Singapore-to-Java travel route.",
      "The globe exaggerates relief; its glowing interior is artistic and is not a geological measurement.",
      "These data describe surface shape. They do not establish tectonic causes or historical change.",
    ],
  },
  datasets: [
    { name: "Natural Earth", use: "global and regional geography", live: false },
    { name: "NASA Black Marble 2016", use: "artistically sampled historical night-light intensity", live: false },
    { name: "OpenStreetMap", use: "central Singapore street geometry retrieved 2026-09-09", live: false },
    { name: "NOAA NCEI ETOPO 2022", use: "globe-scale terrain and ocean-floor relief", live: false },
  ],
  caveats: [
    "Night-light intensity is not population.",
    "Detailed streets cover central Singapore only.",
    "Terrain is exaggerated and the stellar interior is imagined.",
    "The inventory contains no live people or live locations.",
  ],
});

function apiHeaders(apiKey, extra = {}) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": AGENTS_BETA,
    ...extra,
  };
}

export function redact(value, secrets = []) {
  let text = String(value);
  for (const secret of secrets) if (secret) text = text.split(secret).join("[REDACTED]");
  return text.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]");
}

async function apiJson(apiKey, path, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}${path}`, {
    ...init,
    headers: apiHeaders(apiKey, init.headers),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${redact(body.slice(0, 800), [apiKey])}`);
  return body ? JSON.parse(body) : null;
}

async function openEventStream(apiKey, sessionId, signal, fetchImpl = fetch) {
  return fetchImpl(`${API_BASE}/agents/sessions/${sessionId}/events`, {
    headers: apiHeaders(apiKey),
    signal,
  });
}

export async function* parseSse(response, secrets = []) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Agents session create failed (${response.status}): ${redact(body.slice(0, 800), secrets)}`);
  }
  if (!response.body) throw new Error("Agents session stream had no body");
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
      if (!data || data === "[DONE]") continue;
      yield JSON.parse(data);
    }
  }
}

export function functionResult(action, inventory = SEA_DATASET_INVENTORY) {
  if (action.type !== "function_call") return null;
  if (action.name !== "get_sea_dataset_inventory") {
    return {
      type: "agent.session.input.tool_result",
      turn_id: action.turn_id,
      call_id: action.call_id,
      success: false,
      error: `Unsupported function: ${action.name}`,
    };
  }
  return {
    type: "agent.session.input.tool_result",
    turn_id: action.turn_id,
    call_id: action.call_id,
    success: true,
    output: JSON.stringify(inventory),
  };
}

export function recordEvent(report, event) {
  const type = event.type ?? "unknown";
  report.event_counts[type] = (report.event_counts[type] ?? 0) + 1;
  if (event.session_id && !report.session_id) report.session_id = event.session_id;
  if (event.session?.id && !report.session_id) report.session_id = event.session.id;
  if (type === "agent.session.subagent.created") {
    const id = event.subagent?.id ?? event.subagent_id;
    if (id && !report.subagent_ids.includes(id)) report.subagent_ids.push(id);
  }
  if (event.session?.status) report.statuses.push(event.session.status);
  if (type === "agent.session.turn.item.done" && event.item) {
    report.items ??= [];
    report.items.push(event.item);
    report.item_types ??= {};
    report.item_types[event.item.type] = (report.item_types[event.item.type] ?? 0) + 1;
    const item = event.item;
    if (item.type === "message" && item.role === "assistant" && item.phase === "final_answer") {
      const turnId = item.turn_id ?? event.turn_id;
      report.text_by_turn[turnId] = (report.text_by_turn[turnId] ?? "") +
        (item.content ?? []).filter(part => part.type === "output_text").map(part => part.text).join("");
    }
  }
  if (type === "agent.session.turn.completed") {
    report.completed_turns += 1;
    const completedSubagentId = event.turn && "subagent_id" in event.turn ? event.turn.subagent_id : event.subagent_id;
    if (completedSubagentId === null) {
      report.coordinator_completed = true;
      report.final_text += report.text_by_turn[event.turn?.id ?? event.turn_id] ?? "";
    } else if (typeof completedSubagentId === "string") {
      report.completed_subagent_ids ??= [];
      if (!report.completed_subagent_ids.includes(completedSubagentId)) report.completed_subagent_ids.push(completedSubagentId);
    }
    if (event.turn?.usage) report.usage = event.turn.usage;
  }
  if (type === "agent.session.turn.failed") report.failed_turns += 1;
  return event.session?.required_actions ?? null;
}

function validateEvidence(report) {
  const failures = [];
  if (report.subagent_ids.length !== 2) failures.push(`expected 2 native subagents, observed ${report.subagent_ids.length}`);
  if (!report.subagent_ids.every(id => report.completed_subagent_ids.includes(id))) failures.push("not all native subagents completed");
  if (!report.coordinator_completed) failures.push("no completed coordinator turn was observed");
  if (report.inventory_source !== "server_inline" && !report.tool_calls_handled.some(call => call.success)) failures.push("no successful inventory function result was submitted");
  if (!report.final_text.trim()) failures.push("coordinator answer was empty");
  if (report.failed_turns) failures.push(`${report.failed_turns} failed turn event(s) observed`);
  if (failures.length) throw new Error(`Probe evidence incomplete: ${failures.join("; ")}`);
}

export async function runProbe({
  apiKey,
  keepSession = false,
  question = "Show me Java’s mountains and the ocean floor to its south. How far does the landscape drop?",
  inventory = SEA_DATASET_INVENTORY,
  inventoryMode = "function",
  answerMode = "evidence",
  onEvent = () => {},
  signal: externalSignal,
  fetchImpl = fetch,
  reportPath = REPORT_PATH,
} = {}) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is required; no API request was made.");
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const signal = externalSignal ? AbortSignal.any([timeoutSignal, externalSignal]) : timeoutSignal;
  const report = {
    started_at: new Date().toISOString(),
    model: "gpt-6-astra",
    inventory_source: inventoryMode === "inline" ? "server_inline" : "function_callback",
    session_id: null,
    event_counts: {},
    subagent_ids: [],
    completed_subagent_ids: [],
    tool_calls_handled: [],
    statuses: [],
    usage: null,
    final_text: "",
    text_by_turn: {},
    completed_turns: 0,
    coordinator_completed: false,
    failed_turns: 0,
    cleanup: "not_started",
  };
  let success = false;
  try {
    const response = await fetchImpl(`${API_BASE}/agents/sessions`, {
      method: "POST",
      headers: apiHeaders(apiKey),
      signal,
      body: JSON.stringify({
        agent: {
          model: "gpt-6-astra",
          instructions: answerMode === "world" ? [
            "You are Astra, the concise geographic guide to an interactive Earth. Answer arbitrary geographic, historical or scientific questions with geographic context. Use exactly two native subagents: one reviews the explanation and uncertainty, the other identifies up to four useful location anchors. Wait for both. No further delegation.",
            "You may use general knowledge but it is NOT source-verified or current data. The supplied inventory states what the globe actually contains. Sculptures listed as available_in_client are already rendered by the app, so describe their conceptual features rather than saying they cannot be shown. Starlight means the app's artistic particle material, not literal night observations. Distinguish established background knowledge, uncertainty and unavailable live data. Do not invent measurements, citations, current counts or live conditions. For current questions explain that a current source is unavailable. For non-geographic questions answer briefly and return no targets.",
            "Return ONLY one JSON object, no markdown, with title (max100 chars), explanation (at most110 words), limitation (a short plain sentence), targets (0 to4 items each with name, latitude [-80,80], longitude [-180,180], span [2,60] in degrees). Coordinates are approximate orientation anchors, NOT precise boundaries, historical routes or event extents. Targets should be in useful narrative order. Do not include unconfident coordinates. Never instruct app actions in the explanation or claim a camera has moved. Never describe missing satellite, aircraft, historical territory or global street layers as visible.",
          ].join(" ") : [
            "You are Terra Astra's evidence coordinator. Answer the user's geography question using only the supplied dataset evidence.",
            inventoryMode === "inline" ? "The server has supplied the measured dataset inventory in the user input." : "First, the coordinator itself must call get_sea_dataset_inventory exactly once.",
            "Using the inventory, create exactly two independent subagents in parallel and include the user's question and complete returned inventory in each task: one checks the relevant quantities and locations, and one checks the limitations and unsupported inferences. Each task should request at most 60 words and no further delegation.",
            "Wait for both and combine their findings.",
            "Ground the final concise answer only in the supplied inventory and the two subagent findings.",
            "Do not claim current or live data. If the question exceeds the evidence, say what is missing. Explain the answer naturally for spoken delivery, without discussing this API test. Finish in at most 180 words.",
          ].join(" "),
          multi_agent: { enabled: true, max_concurrent_subagents: 2 },
          reasoning: { effort: "low", summary: "concise" },
          text: { format: { type: "text" }, verbosity: "low" },
          tools: inventoryMode === "inline" ? [] : [{
            type: "function",
            name: "get_sea_dataset_inventory",
            description: "Return the fixed, checked-in Southeast Asia/global data inventory and its limitations. The coordinator must call this before creating subagents.",
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
            defer_loading: false,
          }],
        },
        environment: { type: "none" },
        input: answerMode === "world" ? `Use two native subagents in parallel: one checks a concise general-knowledge explanation and its uncertainty, one proposes geographic orientation anchors. Give both the question and the inventory. Wait for both. Return the final JSON in the schema from your instructions. User question: ${JSON.stringify(question)}\nActual available globe data: ${JSON.stringify(inventory)}` : `Use two native subagents in parallel before answering. ${inventoryMode === "inline" ? "Use the server-supplied inventory below" : "First call get_sea_dataset_inventory"}, then delegate the quantitative/location audit to one subagent and the evidence-limit/unsupported-inference audit to another. Give each the full inventory, wait for both results, then answer this question:
${question}${inventoryMode === "inline" ? "\n\nServer-measured inventory:\n" + JSON.stringify(inventory) : ""}`,
        stream: true,
      }),
    });

    let currentStream = response;
    let attachments = 0;
    const answeredCalls = new Set();
    const submitActions = async pendingActions => {
      const fresh = pendingActions.filter(action => !answeredCalls.has(action.call_id));
      if (!fresh.length) return;
      const results = fresh.map(action => functionResult(action, inventory)).filter(Boolean);
      if (!results.length) throw new Error("Session required action but exposed no supported pending function calls");
      for (const result of results) {
        answeredCalls.add(result.call_id);
        report.tool_calls_handled.push({ call_id: result.call_id, turn_id: result.turn_id, success: result.success });
      }
      await apiJson(apiKey, `/agents/sessions/${report.session_id}/events`, {
        method: "POST",
        signal,
        headers: { "Idempotency-Key": `terra-astra-probe-${results[0].turn_id}` },
        body: JSON.stringify({ events: results }),
      }, fetchImpl);
    };
    while (true) {
      for await (const event of parseSse(currentStream, [apiKey])) {
        const pending = recordEvent(report, event);
        onEvent({
          type: event.type ?? "unknown",
          session_id: event.session_id ?? event.session?.id ?? report.session_id,
          subagent_id: event.subagent?.id ?? event.subagent_id ?? event.turn?.subagent_id ?? null,
          status: event.session?.status ?? null,
        });
        if (event.type === "agent.session.requires_action") {
          let currentActions = pending;
          if (!currentActions?.length) {
            const current = await apiJson(apiKey, `/agents/sessions/${report.session_id}`, { signal }, fetchImpl);
            currentActions = current.required_actions ?? [];
          }
          await submitActions(currentActions ?? []);
        }
      }
      if (!report.session_id) throw new Error("Stream ended without a session ID");

      const session = await apiJson(apiKey, `/agents/sessions/${report.session_id}`, { signal }, fetchImpl);
      const pendingActions = session.required_actions ?? [];
      if (pendingActions.length) {
        // Subscribe first: continuation events can be emitted immediately after results arrive.
        const subscribed = await openEventStream(apiKey, report.session_id, signal, fetchImpl);
        await submitActions(pendingActions);
        currentStream = subscribed;
      } else if (session.status === "idle") {
        break;
      } else if (session.status === "failed") {
        throw new Error(`Agents session failed: ${session.error ?? "unknown error"}`);
      } else {
        currentStream = await openEventStream(apiKey, report.session_id, signal, fetchImpl);
      }

      attachments += 1;
      if (attachments > 8) throw new Error("Exceeded 8 event-stream attachments without reaching idle");
    }
    if (!report.session_id) throw new Error("Stream ended without a session ID");
    // The root SSE stream may omit child turn lifecycle events. Verify saved
    // turns before cleanup instead of mistaking wait-tool completion for success.
    if (report.subagent_ids.some(id => !report.completed_subagent_ids.includes(id))) {
      report.saved_turns = [];
      let after;
      for (let page = 0; page < 10; page++) {
        const query = new URLSearchParams({ order: "asc", limit: "100" });
        if (after) query.set("after", after);
        const saved = await apiJson(apiKey, `/agents/sessions/${report.session_id}/turns?${query}`, { signal }, fetchImpl);
        report.saved_turns.push(...(saved.data ?? []).map(turn => ({ id: turn.id, subagent_id: turn.subagent_id, status: turn.status, usage: turn.usage })));
        if (!saved.has_more) break;
        after = saved.last_id ?? saved.data?.at(-1)?.id;
        if (!after || page === 9) throw new Error("Saved turn pagination did not complete");
      }
      for (const id of report.subagent_ids) {
        const children = await apiJson(apiKey, `/agents/sessions/${report.session_id}/subagents/${id}/turns?limit=100&order=asc`, { signal }, fetchImpl);
        if (children.has_more) throw new Error("Unexpected child turn pagination in bounded probe");
        const turns = children.data ?? [];
        report.saved_turns.push(...turns.map(turn => ({ id: turn.id, subagent_id: id, status: turn.status, usage: turn.usage })));
        if (turns.length && turns.every(turn => turn.status === "completed") && !report.completed_subagent_ids.includes(id)) report.completed_subagent_ids.push(id);
      }
      report.completed_turns = Math.max(report.completed_turns, report.saved_turns.filter(turn => turn.status === "completed").length);
    }
    validateEvidence(report);
    success = true;
    report.completed_at = new Date().toISOString();
    return report;
  } catch (error) {
    report.failure = redact(String(error.message).slice(0, 1000), [apiKey]);
    throw error;
  } finally {
    if (report.session_id && !keepSession) {
      const cleanupSignal = AbortSignal.timeout(CLEANUP_TIMEOUT_MS);
      try {
        if (!success) {
          await apiJson(apiKey, `/agents/sessions/${report.session_id}/events`, {
            method: "POST",
            signal: cleanupSignal,
            headers: { "Idempotency-Key": `terra-astra-probe-cancel-${Date.now()}` },
            body: JSON.stringify({ events: [{ type: "agent.session.input.cancel" }] }),
          }, fetchImpl);
          report.cancel = "requested_before_delete";
        }
      } catch (error) {
        report.cancel = `cancel_failed: ${String(error.message).slice(0, 300)}`;
      }
      try {
        await apiJson(apiKey, `/agents/sessions/${report.session_id}`, { method: "DELETE", signal: cleanupSignal }, fetchImpl);
        report.cleanup = "deleted";
      } catch (error) {
        report.cleanup = `delete_failed: ${String(error.message).slice(0, 300)}`;
      }
    } else if (report.session_id) {
      report.cleanup = "kept_by_request";
    }
    report.final_text = report.final_text.slice(0, 4000);
    delete report.text_by_turn;
    if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProbe({ apiKey: process.env.OPENAI_API_KEY, inventoryMode: process.env.PROBE_INVENTORY_MODE === "inline" ? "inline" : "function", onEvent: event => { if (event.type.includes("subagent.created") || event.type.includes("requires_action")) console.log(JSON.stringify(event)); }, keepSession: process.env.KEEP_SESSION === "1" })
    .then(report => {
      console.log(JSON.stringify({ ok: true, report_path: REPORT_PATH, session_id: report.session_id, cleanup: report.cleanup, subagents: report.subagent_ids.length, tool_calls: report.tool_calls_handled.length, usage: report.usage }, null, 2));
    })
    .catch(error => {
      console.error(JSON.stringify({ ok: false, error: redact(error.message, [process.env.OPENAI_API_KEY]), report_path: REPORT_PATH }, null, 2));
      process.exitCode = 1;
    });
}
