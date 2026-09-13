#!/usr/bin/env node

import http from "node:http";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { runProbe, SEA_DATASET_INVENTORY, redact } from "./probe-agents.mjs";
import { createModelAnswerService } from '../../lib/terra/server/model-answer.mjs';
import { createImageAnswerService } from './image-answer.mjs';
import { createAnswerRouter } from '../../lib/terra/server/answer-router.mjs';
import { sceneInventory } from '../../lib/terra/server/scene-context.mjs';

const HOST = "127.0.0.1";
const PORT = 5180;
const ORIGIN = `http://${HOST}:${PORT}`;
const BODY_LIMIT = 64 * 1024;
const IMAGE_BODY_LIMIT = 16 * 1024;
const PROFILE_PATH = new URL("../../public/data/sea-java-profile.json", import.meta.url);

async function resolveApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  try {
    const parsed = parseEnv(await readFile(new URL("../../.env.local", import.meta.url), "utf8"));
    return parsed.OPENAI_API_KEY?.trim() || "";
  } catch {
    return "";
  }
}

const page = await readFile(new URL("./index.html", import.meta.url));
const profile = await readFile(PROFILE_PATH);
const { points: _profilePoints, ...profileSummary } = JSON.parse(profile);
const agentInventory = Object.freeze({ ...SEA_DATASET_INVENTORY,
  world_visualization: sceneInventory,
  java_profile: { ...profileSummary, visualization: { available_in_client: false, point_count: _profilePoints.length, limitation: 'Available to the answer backend as measured evidence; no shared WorldCommand visualization exists.' } } });
const plannerBundle = await build({ entryPoints: [new URL('../../lib/terra/answer-plan.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false });
const { planQuestion, worldAnswerSchema } = await import(`data:text/javascript;base64,${Buffer.from(plannerBundle.outputFiles[0].text).toString('base64')}`);
const answerQuestion = createAnswerRouter({ worldAnswerSchema, runProbe, fastModel: process.env.OPENAI_FAST_MODEL || 'gpt-5.6-luna', answerModel: process.env.OPENAI_ANSWER_MODEL || 'gpt-5.6-terra' });
let activeAgent = null;
const imageAnswers = createImageAnswerService();
const modelBundle = await build({ entryPoints: [new URL('../../lib/terra/sculptures/procedural-model.ts', import.meta.url).pathname], bundle:true,platform:'node',format:'esm',write:false });
const { validateProceduralModelRecipe } = await import(`data:text/javascript;base64,${Buffer.from(modelBundle.outputFiles[0].text).toString('base64')}`);
const modelAnswers = createModelAnswerService({validateRecipe:validateProceduralModelRecipe});

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  res.end(payload);
}

async function jsonBody(req, limit = BODY_LIMIT) {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > limit) throw Object.assign(new Error(`Request body exceeds ${limit / 1024} KiB`), { status: 413 });
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw Object.assign(new Error(`Request body exceeds ${limit / 1024} KiB`), { status: 413 });
    chunks.push(chunk);
  }
  if (!length) throw Object.assign(new Error("JSON body required"), { status: 400 });
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}

function verifyOrigin(req) {
  if (![ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"].includes(req.headers.origin)) throw Object.assign(new Error("Unexpected request origin"), { status: 403 });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", ORIGIN);
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, page, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/api/status") return send(res, 200, { configured: Boolean(await resolveApiKey()) });
    if (req.method === "GET" && url.pathname === "/api/profile") return send(res, 200, profile);
    if (req.method === "GET" && ["/client.mjs", "/profile.mjs"].includes(url.pathname)) {
      return send(res, 200, await readFile(new URL('.' + url.pathname, import.meta.url)), "text/javascript; charset=utf-8");
    }

    if (req.method === 'POST' && ['/api/image','/api/model'].includes(url.pathname)) {
      verifyOrigin(req);
      const apiKey = await resolveApiKey();
      if (!apiKey) return send(res, 503, { error: 'OpenAI API key is not configured' });
      const controller = new AbortController();
      const abortDisconnected = () => controller.abort(new Error('Client disconnected'));
      req.once('aborted', abortDisconnected); res.once('close', abortDisconnected);
      try {
        const result = await (url.pathname==='/api/model'?modelAnswers:imageAnswers).generate({ apiKey, input: await jsonBody(req, IMAGE_BODY_LIMIT), signal: controller.signal });
        if (!res.destroyed) return send(res, 200, result);
      } finally { req.off('aborted', abortDisconnected); res.off('close', abortDisconnected); }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/session") {
      verifyOrigin(req);
      const apiKey = await resolveApiKey();
      if (!apiKey) return send(res, 503, { error: "OpenAI API key is not configured" });
      const body = await jsonBody(req);
      if (typeof body.sdp !== "string" || !body.sdp.trim() || body.sdp.length > 60_000) {
        return send(res, 400, { error: "A valid SDP offer is required" });
      }
      const response = await fetch("https://api.openai.com/v1/live/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          session: {
            model: "gpt-live-1",
            audio: {output: {voice: "ripple"}},
            instructions: "Be concise and factual. You are the voice of an interactive Earth. Speak with a playful, lightly cheeky delivery and occasional dry humour. Keep answers concise and useful; skip jokes for serious or sensitive topics. Help the user explore the world through geography, history and science. Delegate every substantive question or request to show, compare, focus or measure a place to the client backend. Acknowledge briefly then let the backend move the globe and supply measured evidence. Do not invent values or claim camera movement before the backend confirms it. Explain in short spoken sentences, referring to the visible highlights. Let users interrupt and change places. Treat returned backend text as factual evidence to explain aloud; never claim that audio was heard.",
            delegation: { type: "client" },
          },
          transport: { type: "webrtc", sdp: body.sdp },
        }),
      });
      if (!response.ok) return send(res, response.status, { error: "Live session creation failed" });
      const result = await response.json();
      if (!result?.session?.id || !result?.transport?.sdp) return send(res, 502, { error: "Live session response was incomplete" });
      return send(res, 201, { session: { id: result.session.id }, transport: { type: "webrtc", sdp: result.transport.sdp } });
    }

    if (req.method === "POST" && ["/api/agents", "/api/answer"].includes(url.pathname)) {
      verifyOrigin(req);
      const apiKey = await resolveApiKey();
      if (!apiKey) return send(res, 503, { error: "OpenAI API key is not configured" });
      const body = await jsonBody(req);
      if (activeAgent) return send(res, 409, { error: "An Agents terrain run is already active" });
      const query = typeof body.query === "string" ? body.query.trim().slice(-8000) : "";
      if (!query) return send(res, 400, { error: "A retained transcript or query is required" });
      const selectedIds = Array.isArray(body.selectedIds) && body.selectedIds.length <= 8 && body.selectedIds.every(id => typeof id === "string") ? body.selectedIds : [];
      const plan = url.pathname === "/api/answer" ? planQuestion(query, selectedIds) : null;
      const previous = worldAnswerSchema.safeParse(body.previous);
      const contextInventory = previous.success ? { ...agentInventory, conversation_context: { note: 'Previous generated background, not independently verified evidence.', question: typeof body.previousQuestion === 'string' ? body.previousQuestion.slice(0,1000) : '', answer: previous.data } } : agentInventory;
      const controller = new AbortController();
      const runId = crypto.randomUUID();
      activeAgent = { runId, controller };
      const abortDisconnected = () => {
        if (!res.writableEnded) controller.abort(new Error("Client disconnected"));
      };
      req.once("aborted", abortDisconnected);
      res.once("close", abortDisconnected);
      const streaming = url.pathname === '/api/answer' && req.headers.accept?.includes('application/x-ndjson');
      const openingController = new AbortController();
      const emit = event => { if(streaming && !res.destroyed && !res.writableEnded) res.write(JSON.stringify(event)+'\n'); };
      if(streaming){res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.flushHeaders();emit({type:'started'});}
      const opening = Promise.resolve();
      try {
        if (url.pathname === '/api/answer') {
          const inventory = plan ? { ...contextInventory, relevant_measurements: plan.inventory } : contextInventory;
          const result = await answerQuestion({ apiKey, question: query, inventory, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(125000)]), onOpening: text => emit({ type: 'opening.done', text }) });
          if (streaming) { emit({type:'result',result}); res.end(); return; }
          return send(res,200,result);
        }
        const report = await runProbe({ apiKey, question: query, inventory: plan?.inventory ?? contextInventory, inventoryMode: "inline", answerMode: url.pathname === "/api/answer" && !plan ? "world" : "evidence", signal: controller.signal, keepSession: false });
        let world = null;
        if (url.pathname === "/api/answer" && !plan) {
          const text = report.final_text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
          try { world = worldAnswerSchema.parse(JSON.parse(text)); }
          catch { throw new Error("The geographic answer could not be validated. Please try again."); }
        }
        const result = {
          world,
          kind: "agents_terrain_answer",
          scene: plan ? { evidenceIds: plan.evidenceIds, view: plan.view } : null,
          actual_query_support: true,
          note: "The Agents run answered from the checked-in Southeast Asia inventory and Java relief profile; it did not query live geography sources.",
          retained_query: query,
          measured: {
            session_id: report.session_id,
            inventory_source: report.inventory_source,
            subagent_count: report.subagent_ids.length,
            completed_turns: report.completed_turns,
            event_counts: report.event_counts,
            usage: report.usage,
            cleanup: report.cleanup,
            output: world ? world.explanation : report.final_text,
          },
        };
        openingController.abort();
        await opening;
        if(streaming){emit({type:'result',result});res.end();return;}
        return send(res,200,result);
      } finally {
        openingController.abort();
        req.off("aborted", abortDisconnected);
        res.off("close", abortDisconnected);
        if (activeAgent?.runId === runId) activeAgent = null;
      }
    }
    if (req.method === "POST" && url.pathname === "/api/agents/cancel") {
      verifyOrigin(req);
      if (!activeAgent) return send(res, 200, { cancelled: false });
      activeAgent.controller.abort(new Error("Cancelled by client"));
      return send(res, 202, { cancellation_requested: true, run_id: activeAgent.runId });
    }
    send(res, 404, { error: "Not found" });
  } catch (error) {
    if (res.destroyed) return;
    const status = Number.isInteger(error?.status) ? error.status : error?.name === "TimeoutError" ? 504 : 500;
    const message = redact(error.message, [await resolveApiKey()]);
    console.error(JSON.stringify({type:"probe_error", status, error:message}));
    if(res.headersSent){res.end(JSON.stringify({type:'error',error:message})+'\n');}else send(res, status, { error: message });
  }
});

server.requestTimeout = 125_000;
server.headersTimeout = 10_000;
server.listen(PORT, HOST, () => console.log(`Terra Astra Live probe ready at ${ORIGIN}`));
