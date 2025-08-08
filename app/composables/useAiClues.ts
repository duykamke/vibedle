import wtf from 'wtf_wikipedia'

interface GenerateOptions {
    maxClues?: number // 1-8
    allowMedia?: boolean // if true, model may return image/audio URLs
}

async function fetchWikipediaExtract(answer: string): Promise<string | null> {
    try {
        const res: any = await wtf.fetch(answer).catch(() => null)
        const doc: any = Array.isArray(res) ? res[0] : res
        if (doc && typeof doc.text === 'function') {
            const text = (doc.text() as string | undefined)?.trim()
            if (text) return text.slice(0, 50_000)
        }
    } catch (_) {
        // ignore
    }
    return null
}

export function useAiClues() {
    const generateClues = async (params: { question: string; answer: string; options?: GenerateOptions }): Promise<GeneratedClue[]> => {
        const { question, answer, options } = params
        const maxClues = Math.max(1, Math.min(8, options?.maxClues ?? 5))
        const allowMedia = !!options?.allowMedia

        if (!question?.trim() || !answer?.trim()) throw new Error('Question and answer are required')

        // Server will handle AI Gateway; no API key required on client

        // 1) Fetch Wikipedia extract client-side
        const context = await fetchWikipediaExtract(answer)
        if (!context) throw new Error('Could not find Wikipedia content for the answer')

        // 2) Call Nuxt server route to generate clues (avoids CORS)
        const resp = await fetch('/api/generate-clues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                answer,
                context,
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
