import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { planQuestion, worldAnswerSchema } from '@/lib/terra/answer-plan';
import { createTerraHttpHandler } from '@/lib/terra/server/http-handler.mjs';
import { runProbe, SEA_DATASET_INVENTORY } from '@/tools/api-probe/probe-agents.mjs';
import { streamOpening } from '@/tools/api-probe/opening.mjs';
import { createImageAnswerService } from '@/tools/api-probe/image-answer.mjs';
import { createAnswerRouter } from '@/lib/terra/server/answer-router.mjs';

const runtime = env as unknown as Record<string, string | undefined>;
const handle = createTerraHttpHandler({
  apiKey: runtime.OPENAI_API_KEY ?? '',
  authorize: async () => (await getChatGPTUser())?.userId ?? null,
  planQuestion, worldAnswerSchema, runProbe, streamOpening,
  answerQuestion: createAnswerRouter({ worldAnswerSchema, runProbe, fastModel: runtime.OPENAI_FAST_MODEL || 'gpt-5.6-luna', answerModel: runtime.OPENAI_ANSWER_MODEL || 'gpt-5.6-terra' }),
  inventory: { ...SEA_DATASET_INVENTORY, java_profile: { ...SEA_DATASET_INVENTORY.java_profile, visualization: { available_in_client: false, point_count: 121, source: 'Cached measurements only; no shared profile visualization.' } }, world_visualization: { command_boundary: 'Only shared WorldCommand; validated geographic anchors can fly to any location at region scale', detailed_city_targets: ['Singapore', 'New York'], perspectives: ['aerial', 'horizon', 'cutaway'], layers: ['satellites', 'aircraft', 'ships', 'urban'], orbit: '12 deterministic illustrated orbital lights, not live tracking', aircraft: '20 deterministic illustrated city-pair movements', ships: '6 deterministic illustrated open-water movements', urban: 'Procedural activity in curated New York and Singapore city views' } },
  imageService: createImageAnswerService({ model: runtime.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare', cacheSize: 1 }),
});
export const GET = handle;
export const POST = handle;
