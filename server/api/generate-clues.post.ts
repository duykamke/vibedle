import { defineEventHandler, readBody } from 'h3'
import z from 'zod'
import { generateObject } from 'ai'
import { createGateway } from '@ai-sdk/gateway'

const ClueZ = z.object({
  type: z.enum(['text', 'image', 'audio']).default('text'),
  title: z.string(),
  weight: z.number().describe('Clue weight, starting at 1 and increasing by 1 in reveal order'),
  content: z.string().describe('Clue content, under 180 characters'),
})

const BodyZ = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  context: z.string().min(1),
  maxClues: z.number().int().min(1).max(8).default(5),
  allowMedia: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.vercelAiGatewayApiKey as string | undefined
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'AI Gateway key not configured' })
  }

  const body = await readBody(event)
  const parsed = BodyZ.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  const { question, answer, context, maxClues, allowMedia } = parsed.data

  const system = `You generate clues for a multiplayer trivia game.
- Clues should gradually become easier.
- Avoid directly stating the exact answer until the last clue.
- Prefer type:"text". ${allowMedia ? 'You may include image or audio URLs ONLY if they are stable/public and directly relevant.' : 'Do NOT return image or audio types.'}
- Keep each text clue under 180 characters.
- Ensure factual accuracy from the provided context; do not invent facts.
- Do not include markdown.`
  const user = `Question: ${question}\nAnswer: ${answer}\nContext (Wikipedia):\n${context}\n\nReturn JSON array with ${maxClues} items.`

  const gateway = createGateway({ apiKey })
  const { object } = await generateObject({
    model: gateway('google/gemini-2.0-flash-lite'),
    output: 'array',
    schema: ClueZ,
    prompt: [
      {role: 'system', content: system},
      {role: 'user', content: user},
    ],
    temperature: 0.7,
  })

  // object is an array of ClueZ items
  // Ensure weights 1..N and trim to maxClues (defense-in-depth)
  const arr = (object as unknown[]).slice(0, maxClues).map((c: any, i: number) => ({
    type: (c?.type === 'image' || c?.type === 'audio') ? (allowMedia ? c.type : 'text') : 'text',
    title: String(c?.title ?? `Clue ${i + 1}`),
    weight: i + 1,
    content: String(c?.content ?? ''),
  })).filter((c: any) => c.content && String(c.content).trim().length > 0)

  return { clues: arr }
})
