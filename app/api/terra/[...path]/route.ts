import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { createTerraHttpHandler } from '@/lib/terra/server/http-handler.mjs';
import { createAnswerRouter } from '@/lib/terra/server/answer-router.mjs';
import { worldAnswerSchema } from '@/lib/terra/server/answer-schema';
import { sceneInventory } from '@/lib/terra/server/scene-context.mjs';

const runtime = env as unknown as Record<string, string | undefined>;
const unavailableResearch = async () => { throw new Error('Extended research is not included in this demo.'); };
const handle = createTerraHttpHandler({
  apiKey: runtime.OPENAI_API_KEY ?? '',
  authorize: async () => (await getChatGPTUser())?.userId ?? null,
  planQuestion: () => null, worldAnswerSchema, inventory: { world_visualization: sceneInventory },
  runProbe: unavailableResearch, streamOpening: async () => {}, imageService: undefined, modelService: undefined,
  answerQuestion: createAnswerRouter({ worldAnswerSchema, runProbe: unavailableResearch, fastModel: runtime.OPENAI_FAST_MODEL || 'gpt-5.6-luna', answerModel: runtime.OPENAI_ANSWER_MODEL || 'gpt-5.6-terra' }),
});
export const GET = handle;
export const POST = handle;
