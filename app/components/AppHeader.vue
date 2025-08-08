<template>
  <header class="w-full border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
    <div class="flex mx-auto max-w-6xl justify-between px-4 py-3 items-center">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="font-semibold">VIBEDLE</NuxtLink>

        <div v-if="roomCode" class="justify-self-center flex items-center gap-3">
          <span class="text-sm font-medium">Room {{ roomCode }}</span>
          <Button size="sm" variant="outline" class="h-8 px-2 cursor-pointer" @click="copyShare">
            <Icon v-if="!copied" name="mdi:link-variant" class="h-4 w-4 mr-1" />
            <Icon v-else name="mdi:check" class="h-4 w-4 mr-1 text-emerald-500" />
            <span class="text-xs">{{ copied ? 'Copied' : 'Copy link' }}</span>
          </Button>
        </div>
      </div>

      <div class="justify-self-end flex items-center gap-3">
        <template v-if="!user">
          <Button size="sm" class="cursor-pointer" @click="goAuth">Sign in</Button>
        </template>
        <template v-else-if="isGuest">
          <span class="text-xs text-muted-foreground">Guest</span>
          <Button size="sm" class="cursor-pointer" @click="goAuth">Sign in</Button>
        </template>
        <template v-else>
          <NuxtLink to="/submit" class="text-sm underline">Submit</NuxtLink>
          <NuxtLink to="/my/submissions" class="text-sm underline">My submissions</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/review" class="text-sm underline">Admin</NuxtLink>
          <span class="text-xs text-muted-foreground hidden sm:inline">{{ user.email }}</span>
          <Button size="sm" variant="secondary" class="cursor-pointer" @click="signOut">Sign out</Button>
        </template>
      </div>
    </div>
  </header>

</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const nuxtUser = useSupabaseUser()
const route = useRoute()
const router = useRouter()
const url = useRequestURL()

const user = computed(() => nuxtUser.value)
const isGuest = computed(() => !!nuxtUser.value && ((nuxtUser.value as any).is_anonymous || nuxtUser.value?.app_metadata?.provider === 'anonymous'))
const isAdmin = ref(false)
const copied = ref(false)

const roomCode = computed<string | null>(() => {
  const path = route.path || ''
  const codeParam = (route.params as any)?.code
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam
  return path.startsWith('/room/') && typeof code === 'string' ? code : null
})

const shareUrl = computed<string>(() => {
  if (!roomCode.value) return `${url.origin}`
  return `${url.origin}/room/${roomCode.value}`
})

watchEffect(async () => {
  if (!nuxtUser.value || isGuest.value) { isAdmin.value = false; return }
  const { data } = await supabase.rpc('is_admin', { user_uuid: nuxtUser.value.id })
  isAdmin.value = !!data
})

function goAuth() {
  const redirect = encodeURIComponent(route.fullPath)
  router.push(`/login?redirect=${redirect}`)
}

async function signOut() {
  await supabase.auth.signOut()
  router.push('/')
}

async function copyShare() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  } catch (e) {
    // no-op
  }
}
</script>
