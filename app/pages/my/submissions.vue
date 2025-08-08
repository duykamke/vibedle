<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">My Submissions</h1>
    <div v-if="loading">Loading…</div>
    <div v-else class="space-y-3">
      <div v-for="s in submissions" :key="s.id" class="border rounded">
        <!-- Header (collapsible trigger) -->
        <button type="button" class="w-full text-left p-4 flex items-center justify-between hover:bg-accent/30" @click="toggleExpanded(String(s.id))">
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-1 gap-3">
              <div class="text-sm text-muted-foreground truncate">Status: {{ s.is_active ? 'approved' : 'pending' }}</div>
              <div class="text-xs shrink-0">{{ new Date(s.created_at).toLocaleString() }}</div>
            </div>
            <div class="font-medium line-clamp-1">Q: {{ s.question }}</div>
            <div class="text-sm text-muted-foreground line-clamp-1">A: {{ s.answer }}</div>
          </div>
          <Icon :name="expanded[String(s.id)] ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="h-5 w-5 ml-3 shrink-0" />
        </button>

        <!-- Content (collapsible body) -->
        <div v-show="expanded[String(s.id)]" class="px-4 pb-4 space-y-3 border-t">
          <div v-if="s.alternative_answers && s.alternative_answers.length" class="text-sm">
            <div class="text-xs font-medium mb-1">Alternative answers</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(alt, i) in s.alternative_answers" :key="i" class="text-xs bg-muted rounded px-2 py-0.5">{{ alt }}</span>
            </div>
          </div>

          <div v-if="s.tags && s.tags.length" class="text-sm">
            <div class="text-xs font-medium mb-1">Tags</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(t, i) in s.tags" :key="i" class="text-xs bg-muted rounded px-2 py-0.5">#{{ t }}</span>
            </div>
          </div>

          <div v-if="s.clues && s.clues.length" class="text-sm">
            <div class="text-xs font-medium mb-1">Clues ({{ s.clues.length }})</div>
            <ol class="list-decimal ml-4 space-y-2">
              <li v-for="(c, i) in s.clues" :key="i">
                <div class="font-medium">
                  {{ c.title || `Clue ${i + 1}` }}
                  <span class="text-xs text-muted-foreground">({{ c.type }})</span>
                </div>
                <div v-if="c.type === 'image' && isValidUrl(c.content)" class="mt-1">
                  <img :src="c.content" alt="clue image" class="max-h-32 rounded border object-contain" />
                </div>
                <div v-else class="text-muted-foreground">{{ c.content }}</div>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <div v-if="submissions.length === 0" class="text-sm text-muted-foreground">No submissions yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(true)
const submissions = ref<any[]>([])

// Collapsible state per submission id
const expanded = ref<Record<string, boolean>>({})
function toggleExpanded(id: string) {
  expanded.value[id] = !expanded.value[id]
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

onMounted(async () => {
  if (!user.value || (user.value as any).is_anonymous || user.value?.app_metadata?.provider === 'anonymous') {
    const redirectInfo = useSupabaseCookieRedirect()
    redirectInfo.path.value = '/my/submissions'
    return navigateTo('/login')
  }
  const { data } = await supabase
    .from('trivia_content')
    .select('id, question, answer, created_at, is_active, alternative_answers, clues, tags')
    .eq('created_by', user.value.id)
    .order('created_at', { ascending: false })
  submissions.value = data || []
  loading.value = false
})
</script>


