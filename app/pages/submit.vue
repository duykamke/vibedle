<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Submit Trivia</h1>
    <div class="space-y-6">
      <!-- Category -->
      <div>
        <label class="block text-sm font-medium mb-1">Category</label>
        <Select v-model="categoryOption">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Uncategorized" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Uncategorized</SelectItem>
            <SelectItem v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.display_name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Question -->
      <div>
        <label class="block text-sm font-medium mb-1">Question</label>
        <textarea v-model="question" class="w-full border rounded px-3 py-2" rows="2" />
      </div>

      <!-- Canonical Answer -->
      <div>
        <label class="block text-sm font-medium mb-1">Answer</label>
        <input v-model="answer" class="w-full border rounded px-3 py-2" />
      </div>

      <!-- Alternative answers list -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium">Alternative answers</label>
          <Button size="sm" variant="outline" class="h-8 px-2 cursor-pointer" @click="addAlternative">Add alternative</Button>
        </div>
        <p class="text-xs text-muted-foreground mb-2">Add acceptable variations (e.g., abbreviations, aliases). Empty items are ignored.</p>
        <div v-if="alternativesList.length === 0" class="text-sm text-muted-foreground border rounded p-3">No alternatives added.</div>
        <div v-for="(alt, idx) in alternativesList" :key="`alt-${idx}`" class="flex items-center gap-2 mb-2">
          <input v-model="alternativesList[idx]" class="flex-1 border rounded px-3 py-2" placeholder="Alternative answer" />
          <Button size="icon" variant="ghost" class="cursor-pointer" @click="removeAlternative(idx)">
            <Icon name="mdi:close" class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Clues builder -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium">Clues</label>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" class="h-8 px-2 cursor-pointer" @click="addClue">Add clue</Button>
            <Button size="sm" class="h-8 px-2 cursor-pointer" :disabled="aiLoading || !question.trim() || !answer.trim()" @click="generateFromAi">
              <Icon v-if="aiLoading" name="mdi:loading" class="h-4 w-4 mr-2 animate-spin" />
              Generate clues
            </Button>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mb-2">Clues are revealed from top to bottom. You can add text, image URL, or audio URL. Previews shown for image/audio.</p>
        <div v-if="clues.length === 0" class="text-sm text-muted-foreground border rounded p-3">No clues added.</div>

        <div v-for="(clue, index) in clues" :key="`clue-${index}`" class="border rounded p-3 mb-3 space-y-2 bg-card/40">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Clue {{ index + 1 }}</div>
            <Button size="icon" variant="ghost" class="cursor-pointer" @click="removeClue(index)">
              <Icon name="mdi:delete" class="h-4 w-4" />
            </Button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <div>
              <label class="block text-xs font-medium mb-1">Type</label>
              <Select v-model="clue.type">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image URL</SelectItem>
                  <SelectItem value="audio">Audio URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium mb-1">Content</label>
              <template v-if="clue.type === 'text'">
                <input v-model="clue.content" class="w-full border rounded px-3 py-2" placeholder="Write the clue text" />
              </template>
              <template v-else>
                <input v-model="clue.content" class="w-full border rounded px-3 py-2" placeholder="Enter a public URL (https://...)" />
              </template>
            </div>
          </div>

          <!-- Previews -->
          <div v-if="clue.type === 'image' && isValidUrl(clue.content)" class="mt-1">
            <img :src="clue.content" alt="clue image preview" class="max-h-40 rounded border object-contain" />
          </div>
          <div v-else-if="clue.type === 'audio' && isValidUrl(clue.content)" class="mt-1">
            <audio :src="clue.content" controls class="w-full" />
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium">Tags</label>
          <span class="text-xs text-muted-foreground">Press Enter to add</span>
        </div>
        <TagsInput v-model="tags" class="w-full">
          <div class="flex w-full items-center gap-2 flex-wrap border rounded px-2 py-2">
            <TagsInputItem v-for="item in tags" :key="item" :value="item">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput placeholder="Add a tag" class="flex-1 min-w-[8rem]" />
          </div>
        </TagsInput>
        <p class="text-xs text-muted-foreground mt-1">Examples: artist, year, movie, genre</p>
      </div>

      <!-- Submit -->
      <div class="flex gap-2">
        <Button @click="submit" :disabled="loading" class="cursor-pointer">
          <Icon v-if="loading" name="mdi:loading" class="h-4 w-4 mr-2 animate-spin" />
          Submit
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAiClues } from '~/composables/useAiClues'
import type { GeneratedClue } from '~/composables/useAiClues'
definePageMeta({ middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { data: categories } = await useAsyncData('submit-categories', async () => {
  const { data } = await supabase.from('categories').select('id, display_name').eq('is_active', true)
  return data || []
})

type ClueType = 'text' | 'image' | 'audio'
type EditableClue = { type: ClueType, content: string }

const categoryId = ref<string | null>(null)
const categoryOption = computed<string>({
  get() { return categoryId.value ?? '__none__' },
  set(v: string) { categoryId.value = (v && v !== '__none__') ? v : null }
})
const question = ref('')
const answer = ref('')
const alternativesList = ref<string[]>([])
const clues = ref<EditableClue[]>([])
const tags = ref<string[]>([])
const loading = ref(false)
const aiLoading = ref(false)

function addAlternative() {
  alternativesList.value.push('')
}
function removeAlternative(index: number) {
  alternativesList.value.splice(index, 1)
}

function addClue() {
  clues.value.push({ type: 'text', content: '' })
}
function removeClue(index: number) {
  clues.value.splice(index, 1)
}

function isValidUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function submit() {
  if (loading.value) return
  if (!user.value || (user.value as any).is_anonymous || user.value?.app_metadata?.provider === 'anonymous') {
    const redirectInfo = useSupabaseCookieRedirect()
    redirectInfo.path.value = '/submit'
    return navigateTo('/login')
  }
  loading.value = true

  // Build clues with weights and titles
  const payloadClues = clues.value
    .map((c, i) => ({ type: c.type, title: `Clue ${i + 1}`, weight: i + 1, content: (c.content || '').trim() }))
    .filter(c => !!c.content)

  const alt = alternativesList.value.map(s => s.trim()).filter(Boolean)

  const { error } = await supabase.from('trivia_content').insert({
    created_by: user.value.id,
    category_id: categoryId.value,
    question: question.value.trim(),
    answer: answer.value.trim(),
    alternative_answers: alt.length ? alt : null,
    clues: payloadClues,
    tags: tags.value.length ? tags.value : null,
    is_active: false,
  })
  loading.value = false
  if (error) { alert(error.message); return }
  // reset form
  question.value = ''
  answer.value = ''
  alternativesList.value = []
  clues.value = []
  tags.value = []
  alert('Submitted!')
}

// AI-generated clues
const { generateClues } = useAiClues()
async function generateFromAi() {
  if (aiLoading.value) return
  try {
    aiLoading.value = true
    const items = await generateClues({
      question: question.value,
      answer: answer.value,
      options: { maxClues: 5, allowMedia: true },
    })
    // Map to editable clues used by the form
    clues.value = items.map((c: GeneratedClue) => ({ type: c.type, content: c.content }))
  } catch (e: any) {
    alert(e?.message || 'Failed to generate clues')
  } finally {
    aiLoading.value = false
  }
}
</script>



