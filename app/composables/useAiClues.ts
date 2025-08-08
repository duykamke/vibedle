import wtf from 'wtf_wikipedia'

interface GenerateOptions {
    maxClues?: number // 1-8
    allowMedia?: boolean // if true, model may return image/audio URLs
}

interface GenerateParams {
    question: string
    answer: string
    difficulty: string
    category: string
    options?: GenerateOptions
}

export interface GeneratedClue {
    type: 'text' | 'image' | 'audio'
    title: string
    weight: number
    content: string
}

type WikipediaData = { text: string; images: string[] }

async function fetchWikipediaData(answer: string): Promise<WikipediaData | null> {
    try {
        const res: any = await wtf.fetch(answer).catch(() => null)
        const doc: any = Array.isArray(res) ? res[0] : res
        if (doc && typeof doc.text === 'function') {
            const text = (doc.text() as string | undefined)?.trim() ?? ''
            const imgsRaw: any[] = typeof doc.images === 'function' ? (doc.images() || []) : []
            const images: string[] = imgsRaw
                .map((img: any) => (typeof img?.url === 'function' ? img.url() : null))
                .filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u))
                .slice(0, 50) // cap to a reasonable amount
            if (text) {
                return { text: text.slice(0, 50_000), images }
            }
        }
    } catch (_) {
        // ignore
    }
    return null
}

export function useAiClues() {
    const generateClues = async (params: GenerateParams): Promise<GeneratedClue[]> => {
        const { question, answer, difficulty, category, options } = params
        const maxClues = Math.max(1, Math.min(8, options?.maxClues ?? 5))
        const allowMedia = !!options?.allowMedia

        if (!question?.trim() || !answer?.trim()) throw new Error('Question and answer are required')

        // Server will handle AI Gateway; no API key required on client

        // 1) Fetch Wikipedia extract + images client-side
        const wiki = await fetchWikipediaData(answer)
        if (!wiki) throw new Error('Could not find Wikipedia content for the answer')
        const context = wiki.text
        const images = wiki.images

        // 2) Call Nuxt server route to generate clues (avoids CORS)
        const resp = await fetch('/api/generate-clues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                answer,
                difficulty,
                category,
                context,
                images,
                maxClues,
                allowMedia,
            }),
        })
        if (!resp.ok) {
            const t = await resp.text().catch(() => '')
            throw new Error(`Server AI error: ${resp.status} ${t}`)
        }
        const json = await resp.json()
        const serverClues = Array.isArray(json?.clues) ? json.clues : []

        // Validate and coerce
        const clues: GeneratedClue[] = serverClues
            .map((c: any, i: number) => ({
                type: (c?.type === 'image' || c?.type === 'audio') ? (allowMedia ? c.type : 'text') : 'text',
                title: String(c?.title ?? `Clue ${i + 1}`),
                weight: Number(c?.weight ?? i + 1),
                content: String(c?.content ?? ''),
            }))
            .filter((c: GeneratedClue) => !!c.content?.trim())
            .slice(0, maxClues)

        // Ensure weights are 1..N
        clues.forEach((c, i) => (c.weight = i + 1))

        return clues
    }

    return { generateClues }
}
