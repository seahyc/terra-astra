import {createLibraryService} from '@/lib/terra/model-library/service.mjs';
import {createD1ModelStore} from '@/lib/terra/model-library/store.mjs';
import { env, waitUntil } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { planQuestion, worldAnswerSchema } from '@/lib/terra/answer-plan';
import { createTerraHttpHandler } from '@/lib/terra/server/http-handler.mjs';
import { runProbe, SEA_DATASET_INVENTORY } from '@/tools/api-probe/probe-agents.mjs';
import { streamOpening } from '@/tools/api-probe/opening.mjs';
import { createImageAnswerService } from '@/tools/api-probe/image-answer.mjs';
import { createAnswerRouter } from '@/lib/terra/server/answer-router.mjs';
import { createModelAnswerService } from '@/lib/terra/server/model-answer.mjs';
import { validateProceduralModelRecipe } from '@/lib/terra/sculptures/procedural-model';
import { sceneInventory } from '@/lib/terra/server/scene-context.mjs';

const runtime = env as unknown as Record<string, string | undefined>;
const handle = createTerraHttpHandler({
  apiKey: runtime.OPENAI_API_KEY ?? '',
  authorize: async () => (await getChatGPTUser())?.userId ?? null,
  planQuestion, worldAnswerSchema, runProbe, streamOpening,
  answerQuestion: createAnswerRouter({ worldAnswerSchema, runProbe, fastModel: runtime.OPENAI_FAST_MODEL || 'gpt-5.6-luna', answerModel: runtime.OPENAI_ANSWER_MODEL || 'gpt-5.6-terra' }),
  inventory: { ...SEA_DATASET_INVENTORY, java_profile: { ...SEA_DATASET_INVENTORY.java_profile, visualization: { available_in_client: false, point_count: 121, source: 'Cached measurements only; no shared profile visualization.' } }, world_visualization: sceneInventory },
  libraryService: createLibraryService({defer:waitUntil,store:createD1ModelStore((env as unknown as {DB?:D1Database}).DB)}),
  modelService: createModelAnswerService({validateRecipe:validateProceduralModelRecipe}),
  imageService: createImageAnswerService({ model: runtime.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare', cacheSize: 1 }),
});
export const GET = handle;
export const POST = handle;
