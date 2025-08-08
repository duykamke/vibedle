<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">My Submissions</h1>
    <div v-if="loading">Loading…</div>
    <div v-else class="space-y-3">
      <div v-for="s in submissions" :key="s.id" class="border rounded p-4">
        <div class="flex items-center justify-between mb-1">
          <div class="text-sm text-muted-foreground">Status: {{ s.is_active ? 'approved' : 'pending' }}</div>
          <div class="text-xs">{{ new Date(s.created_at).toLocaleString() }}</div>
        </div>
        <div class="font-medium">Q: {{ s.question }}</div>
        <div class="text-sm">A: {{ s.answer }}</div>
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

onMounted(async () => {
  if (!user.value || (user.value as any).is_anonymous || user.value?.app_metadata?.provider === 'anonymous') {
    const redirectInfo = useSupabaseCookieRedirect()
    redirectInfo.path.value = '/my/submissions'
    return navigateTo('/login')
  }
  const { data } = await supabase
    .from('trivia_content')
    .select('id, question, answer, created_at, is_active')
    .eq('created_by', user.value.id)
    .order('created_at', { ascending: false })
  submissions.value = data || []
  loading.value = false
})
</script>


