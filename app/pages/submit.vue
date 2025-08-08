<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Submit Trivia</h1>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Category</label>
        <select v-model="categoryId" class="w-full border rounded px-3 py-2">
          <option :value="null">Uncategorized</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.display_name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Question</label>
        <textarea v-model="question" class="w-full border rounded px-3 py-2" rows="2" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Answer</label>
        <input v-model="answer" class="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Alternative answers (comma-separated)</label>
        <input v-model="alternatives" class="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Clues (one per line)</label>
        <textarea v-model="cluesText" class="w-full border rounded px-3 py-2" rows="5" />
      </div>
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
definePageMeta({ middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { data: categories } = await useAsyncData('submit-categories', async () => {
  const { data } = await supabase.from('categories').select('id, display_name').eq('is_active', true)
  return data || []
})

const categoryId = ref<string | null>(null)
const question = ref('')
const answer = ref('')
const alternatives = ref('')
const cluesText = ref('')
const loading = ref(false)

async function submit() {
  if (loading.value) return
  if (!user.value || (user.value as any).is_anonymous || user.value?.app_metadata?.provider === 'anonymous') {
    const redirectInfo = useSupabaseCookieRedirect()
    redirectInfo.path.value = '/submit'
    return navigateTo('/login')
  }
  loading.value = true
  const clues = cluesText.value.split('\n').filter(Boolean).map((line, i) => ({ type: 'text', title: `Clue ${i+1}`, weight: i+1, content: line.trim() }))
  const alt = alternatives.value.split(',').map(s => s.trim()).filter(Boolean)
  const { error } = await supabase.from('trivia_content').insert({
    created_by: user.value.id,
    category_id: categoryId.value,
    question: question.value.trim(),
    answer: answer.value.trim(),
    alternative_answers: alt.length ? alt : null,
    clues,
    is_active: false,
  })
  loading.value = false
  if (error) { alert(error.message); return }
  question.value = ''
  answer.value = ''
  alternatives.value = ''
  cluesText.value = ''
  alert('Submitted!')
}
</script>


