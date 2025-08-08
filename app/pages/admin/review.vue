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
        <div class="mt-2"><span class="text-xs text-muted-foreground">Clues:</span>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="(c, i) in s.clues" :key="i">{{ c.content }}</li>
          </ul>
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
    .select('id, question, answer, clues, created_at, is_active')
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
</script>


