import { z } from 'zod';

export const worldTargetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().finite().min(-80).max(80),
  longitude: z.number().finite().min(-180).max(180),
  span: z.number().finite().min(2).max(60),
});
export const worldAnswerSchema = z.object({
  title: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(2000),
  limitation: z.string().trim().max(500),
  targets: z.array(worldTargetSchema).max(4),
  perspective: z.enum(['aerial', 'horizon', 'cutaway']).optional(),
  modelBrief: z.object({
    title:z.string().trim().min(1).max(100),
    prompt:z.string().trim().min(1).max(1400),
  }).strict().optional(),
  imageBrief: z.object({
    title: z.string().trim().min(1).max(100),
    prompt: z.string().trim().min(1).max(1400),
  }).strict().optional(),
});
