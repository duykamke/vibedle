<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Pending Submissions</h1>
    <div v-if="loading">Loading…</div>
    <div v-else class="space-y-4">
      <div v-for="s in submissions" :key="s.id" class="border rounded p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs text-muted-foreground">Submitted {{ new Date(s.created_at).toLocaleString() }}</div>
          <div class="flex gap-2">
            <Button size="sm" variant="secondary" @click="approve(s.id)">Approve</Button>
            <Button size="sm" variant="destructive" @click="reject(s.id)">Reject</Button>
          </div>
        </div>
        <div class="font-medium">Q: {{ s.question }}</div>
        <div class="text-sm">A: {{ s.answer }}</div>
        <div class="mt-2">
          <div class="text-xs text-muted-foreground mb-1">Alternative answers:</div>
          <div v-if="!s.alternative_answers || s.alternative_answers.length === 0" class="text-sm text-muted-foreground">None</div>
          <ul v-else class="list-disc ml-5 text-sm">
            <li v-for="(alt, i) in s.alternative_answers" :key="i">{{ alt }}</li>
          </ul>
        </div>

        <div class="mt-3">
          <div class="text-xs text-muted-foreground mb-1">Clues:</div>
          <div v-if="!s.clues || s.clues.length === 0" class="text-sm text-muted-foreground">None</div>
          <div v-else class="space-y-2">
            <div v-for="(c, i) in s.clues" :key="i" class="border rounded p-2">
              <div class="flex items-center justify-between">
                <div class="text-xs font-medium">{{ c.title || `Clue ${i+1}` }} <span class="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{{ c.type }}</span></div>
                <div class="text-[10px] text-muted-foreground">Weight: {{ c.weight }}</div>
              </div>
              <div class="mt-1 text-sm" v-if="c.type === 'text'">{{ c.content }}</div>
              <div class="mt-1" v-else-if="c.type === 'image' && isValidUrl(c.content)">
                <img :src="c.content" alt="clue image" class="max-h-40 rounded border object-contain" />
                <div class="text-xs text-muted-foreground break-all mt-1">{{ c.content }}</div>
              </div>
              <div class="mt-1" v-else-if="c.type === 'audio' && isValidUrl(c.content)">
                <audio :src="c.content" controls class="w-full" />
                <div class="text-xs text-muted-foreground break-all mt-1">{{ c.content }}</div>
              </div>
              <div class="mt-1 text-xs text-muted-foreground" v-else>Invalid or unsupported clue content.</div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="submissions.length === 0" class="text-sm text-muted-foreground">No pending submissions.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(true)
const submissions = ref<any[]>([])
const isAdmin = ref(false)

onMounted(async () => {
  if (!user.value || (user.value as any).is_anonymous || user.value?.app_metadata?.provider === 'anonymous') {
    const redirectInfo = useSupabaseCookieRedirect()
    redirectInfo.path.value = '/admin/review'
    return navigateTo('/login')
  }
  const { data: adminData } = await supabase.rpc('is_admin', { user_uuid: user.value.id })
  isAdmin.value = !!adminData
  if (!isAdmin.value) {
    return navigateTo('/')
  }
  const { data } = await supabase
    .from('trivia_content')
    .select('id, question, answer, clues, alternative_answers, created_at, is_active')
    .eq('is_active', false)
    .order('created_at', { ascending: true })
  submissions.value = data || []
  loading.value = false
})

async function approve(id: string) {
  await supabase.from('trivia_content').update({ is_active: true }).eq('id', id)
  submissions.value = submissions.value.filter(s => s.id !== id)
}

async function reject(id: string) {
  await supabase.from('trivia_content').delete().eq('id', id)
  submissions.value = submissions.value.filter(s => s.id !== id)
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
</script>


