<template>
    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-8">
        <h1 class="text-8xl font-bold mb-12 text-center">VIBEDLE</h1>

        <div class="w-full max-w-2xs">
            <Button @click="createRoom" :disabled="isCreatingRoom" class="w-full mb-8 text-xl cursor-pointer">
                <Icon v-if="isCreatingRoom" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
                <span>{{ isCreatingRoom ? 'Creating…' : 'Create room' }}</span>
            </Button>

            <div class="flex items-center gap-4">
                <Input 
                    v-model="roomCode"
                    type="text" 
                    placeholder="Room code"
                    maxlength="4"
                    @keydown.enter="joinRoom"
                    :disabled="isJoiningRoom"
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                <Button @click="joinRoom" class="cursor-pointer" :disabled="!isValidRoomCode || isJoiningRoom">
                    <Icon v-if="isJoiningRoom" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
                    <span>{{ isJoiningRoom ? 'Joining…' : 'Join room' }}</span>
                </Button>
            </div>
      </div>
    </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Vibedle — Real-time Pop Culture Trivia',
  link: [
    { rel: 'canonical', href: useRequestURL().origin }
  ]
})

useSeoMeta({
  title: 'Vibedle — Real-time Pop Culture Trivia',
  description: 'Join friends in fast-paced rounds with progressive clues and speed-based scoring. Create or join a room and start vibing with trivia.',
  ogTitle: 'Vibedle — Real-time Pop Culture Trivia',
  ogDescription: 'Fast-paced multiplayer trivia with progressive clue reveals and speed-based scoring.',
  ogUrl: useRequestURL().href,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const roomCode = ref('')
const isCreatingRoom = ref(false)
const isJoiningRoom = ref(false)

const isValidRoomCode = computed(() => {
    return roomCode.value.length === 4
})

async function createRoom() {
    if (isCreatingRoom.value) return
    isCreatingRoom.value = true
    let currentUser = user.value
    if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
            console.error('Error signing in anonymously:', error)
            isCreatingRoom.value = false
            return
        }
        currentUser = data.user
    }
    if (!currentUser) { isCreatingRoom.value = false; return }


    const code = generateRoomCode()
    try {
        const { error } = await supabase.from('rooms').insert({ code, host_id: currentUser.id })
        if (error) throw error
        await router.push(`/room/${code}`)
    } catch (error) {
        console.error('Error creating room:', error)
        // Here you can add logic to retry with a new code if you get a duplicate key error
        isCreatingRoom.value = false
    }
}

function generateRoomCode(length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}



async function joinRoom() {
    if (!isValidRoomCode.value || isJoiningRoom.value) return
    isJoiningRoom.value = true
    if (!isValidRoomCode.value) { isJoiningRoom.value = false; return }
    
    let currentUser = user.value
    if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
            console.error('Error signing in anonymously:', error)
            isJoiningRoom.value = false
            return
        }
        currentUser = data.user
    }
    if (!currentUser) { isJoiningRoom.value = false; return }

    // Check if room exists
    const { data: room, error } = await supabase
        .from('rooms')
        .select('code')
        .eq('code', roomCode.value)
        .single()

    if (error || !room) {
        alert('Room not found. Please check the room code and try again.')
        isJoiningRoom.value = false
        return
    }

    // Navigate to the room
    await router.push(`/room/${roomCode.value}`)
}
</script>