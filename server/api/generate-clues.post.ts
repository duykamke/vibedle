import { defineEventHandler, readBody } from 'h3'
import z from 'zod'
import { generateObject } from 'ai'
import { createGateway } from '@ai-sdk/gateway'

const ClueZ = z.object({
  type: z.enum(['text', 'image']),
  title: z.string(),
  weight: z.number().describe('Clue weight, starting at 1 and increasing by 1 in reveal order'),
  content: z.string().describe("The clue content. If it's an image, it's the exact image URL from the wikipedia list"),
})

const BodyZ = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  category: z.string().min(1),
  context: z.string().min(1),
  images: z.array(z.url()).default([]),
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

  const { question, answer, difficulty, category, context, images, maxClues, allowMedia } = parsed.data

  const system = `You are a trivia game assistant. Generate 6 progressive clues for a trivia question using ONLY the factual information provided from Wikipedia.

${context}

AVAILABLE WIKIPEDIA IMAGES (use ONLY these exact URLs for image clues; do not invent new URLs):
${(images || []).map((u) => `- ${u}`).join('\n')}

IMPORTANT: Base your clues ONLY on the Wikipedia information provided above. Do not add facts that are not mentioned in the Wikipedia content. If the Wikipedia information is insufficient for certain clues, create more general clues that avoid specific facts.

CRITICAL: DO NOT include the answer "${answer}" in any clue content. The clues should hint at or describe the answer without directly stating it. Avoid using the answer word(s) in your clue text.

Generate max ${maxClues} clues that progressively reveal information about the answer. Each clue should be:
1. Standalone and make sense without other clues
2. Progressively easier (clue 1 = hardest, clue ${maxClues} = easiest/most obvious)
3. Varied in approach (different angles, facts, hints)
4. Appropriate for the difficulty level
5. Between 10-50 words each (for text clues) or use an available Wikipedia image (for image clues)
6. Have a meaningful, descriptive title that hints at the type of information being revealed
7. Can be either TEXT clues or IMAGE clues (if Wikipedia images are available)

Return ONLY a JSON array with this exact structure:

For TEXT clues:
{
"type": "text",
"title": "Meaningful descriptive title here",
"content": "The clue content here",
"weight": 1
}

For IMAGE clues (ONLY if Wikipedia images are available):
{
"type": "image",
"title": "Meaningful descriptive title here", 
"content": "EXACT_IMAGE_URL_FROM_WIKIPEDIA_LIST",
"weight": 1
}

Example array:
[
{
"type": "text",
"title": "Historical Context",
"content": "The hardest clue here",
"weight": 1
},
{
"type": "image",
"title": "Visual Representation",
"content": "https://upload.wikimedia.org/wikipedia/commons/...",
"weight": 2
},
... (continue for all ${maxClues} clues)
]

IMPORTANT RULES FOR IMAGE CLUES:
- ONLY use image URLs that appear in the AVAILABLE WIKIPEDIA IMAGES list above
- DO NOT create or hallucinate image URLs
- The "content" field must be the EXACT URL from the Wikipedia images list
- Choose images that are relevant to the clue difficulty level
- Mix text and image clues for variety (aim for 2-3 image clues if good images are available)
- If no suitable Wikipedia images are available, generate all text clues`
  const user = `
Question: "${question}"
Answer: "${answer}"
Difficulty: ${difficulty}
Category: ${category}
  `

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
