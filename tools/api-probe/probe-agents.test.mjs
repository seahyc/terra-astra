import test from "node:test";
import assert from "node:assert/strict";
import { parseSse, recordEvent, functionResult, redact, SEA_DATASET_INVENTORY } from "./probe-agents.mjs";

function report() {
  return { event_counts: {}, session_id: null, subagent_ids: [], statuses: [], final_text: "", text_by_turn: {}, completed_turns: 0, coordinator_completed: false, failed_turns: 0, usage: null };
}

function responseFor(events) {
  const payload = events.map(event => `event: message\ndata: ${JSON.stringify(event)}\n\n`).join("");
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(payload)); controller.close(); } }), { status: 200 });
}

test("SSE pending action can be recorded, fulfilled, and followed by coordinator completion", async () => {
  const pending = { type: "function_call", turn_id: "turn_1", call_id: "call_1", name: "get_sea_dataset_inventory", arguments: {} };
  const events = [
    { type: "agent.session.created", session: { id: "sess_1", status: "in_progress" } },
    { type: "agent.session.requires_action", session: { id: "sess_1", status: "requires_action", required_actions: [pending] } },
    { type: "agent.session.subagent.created", session_id: "sess_1", subagent: { id: "sub_1" } },
    { type: "agent.session.subagent.created", session_id: "sess_1", subagent: { id: "sub_2" } },
    { type: "agent.session.turn.output_text.delta", session_id: "sess_1", turn_id: "turn_sub", delta: "Subagent draft." },
    { type: "agent.session.turn.item.done", item: { type: "message", role: "assistant", phase: "commentary", turn_id: "turn_1", content: [{type: "output_text", text: "I will check."}] } },
    { type: "agent.session.turn.item.done", item: { type: "message", role: "assistant", phase: "final_answer", turn_id: "turn_1", content: [{type: "output_text", text: "Grounded answer."}] } },
    { type: "agent.session.turn.completed", session_id: "sess_1", turn: { id: "turn_1", subagent_id: null, usage: { total_tokens: 42 } } },
  ];
  const observed = report();
  let actions;
  for await (const event of parseSse(responseFor(events))) actions = recordEvent(observed, event) ?? actions;
  assert.equal(observed.session_id, "sess_1");
  assert.deepEqual(observed.subagent_ids, ["sub_1", "sub_2"]);
  assert.equal(observed.coordinator_completed, true);
  assert.equal(observed.final_text, "Grounded answer.");
  assert.equal(actions.length, 1);
  const result = functionResult(actions[0]);
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(result.output), SEA_DATASET_INVENTORY);
});

test("failed and unsupported calls are never reported as successful", async () => {
  const observed = report();
  recordEvent(observed, { type: "agent.session.turn.failed", session_id: "sess_2", turn: { subagent_id: null } });
  assert.equal(observed.failed_turns, 1);
  const result = functionResult({ type: "function_call", turn_id: "turn_2", call_id: "call_2", name: "unknown" });
  assert.equal(result.success, false);
  assert.match(result.error, /Unsupported function/);
});

test("credential-shaped and exact secrets are redacted", () => {
  assert.equal(redact("upstream echoed secret-value and sk-abcdefghijklmnop", ["secret-value"]), "upstream echoed [REDACTED] and [REDACTED_API_KEY]");
});

test("runProbe fulfills required action before an open stream can finish", async () => {
  let streamController;
  let sessionStatus = "in_progress";
  const encoder = new TextEncoder();
  const emit = event => streamController.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  const initial = new Response(new ReadableStream({
    start(controller) {
      streamController = controller;
      emit({ type: "agent.session.created", session: { id: "sess_live", status: "in_progress" } });
      emit({ type: "agent.session.requires_action", session: { id: "sess_live", status: "requires_action", required_actions: [{ type: "function_call", turn_id: "turn_main", call_id: "call_inventory", name: "get_sea_dataset_inventory", arguments: {} }] } });
      // Deliberately stays open. Only the mocked tool-result POST releases completion events.
    },
  }), { status: 200 });
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET" });
    if (String(url).endsWith("/agents/sessions") && init.method === "POST") return initial;
    if (String(url).endsWith("/sess_live/events") && init.method === "POST") {
      const body = JSON.parse(init.body);
      if (body.events[0].type === "agent.session.input.tool_result") {
        emit({ type: "agent.session.subagent.created", session_id: "sess_live", subagent: { id: "sub_a" } });
        emit({ type: "agent.session.subagent.created", session_id: "sess_live", subagent: { id: "sub_b" } });
        // The real root stream omits child turn events; completion comes from saved turns.
        emit({ type: "agent.session.turn.item.done", item: { type: "message", role: "assistant", phase: "final_answer", turn_id: "turn_main", content: [{type: "output_text", text: "Verified answer."}] } });
        emit({ type: "agent.session.turn.completed", session_id: "sess_live", turn: { id: "turn_main", subagent_id: null, usage: { total_tokens: 12 } } });
        sessionStatus = "idle";
        streamController.close();
      }
      return new Response("{}", { status: 200 });
    }
    if (String(url).endsWith("/sess_live") && (init.method ?? "GET") === "GET") return Response.json({ id: "sess_live", status: sessionStatus, required_actions: [] });
    if (String(url).includes("/subagents/sub_a/turns?")) return Response.json({data:[{id:"turn_a",subagent_id:"sub_a",status:"completed"}],has_more:false});
    if (String(url).includes("/subagents/sub_b/turns?")) return Response.json({data:[{id:"turn_b",subagent_id:"sub_b",status:"completed"}],has_more:false});
    if (String(url).includes("/sess_live/turns?")) return Response.json({ data: [
      {id: "turn_main", subagent_id: null, status: "completed"},
    ], has_more: false });
    if (String(url).endsWith("/sess_live") && init.method === "DELETE") return Response.json({ id: "sess_live", deleted: true });
    throw new Error(`Unexpected fetch: ${init.method ?? "GET"} ${url}`);
  };
  const { runProbe } = await import("./probe-agents.mjs");
  const result = await runProbe({ apiKey: "test-key", fetchImpl, reportPath: null });
  assert.equal(result.final_text, "Verified answer.");
  assert.equal(result.subagent_ids.length, 2);
  assert.equal(result.completed_subagent_ids.length, 2);
  assert.equal(result.saved_turns.length, 3);
  assert.equal(result.tool_calls_handled.length, 1);
  assert.equal(result.cleanup, "deleted");
  assert.ok(calls.some(call => call.method === "POST" && call.url.endsWith("/sess_live/events")));
});
