<template>
    <div class="flex h-[calc(100vh-56px)] p-6 gap-6">
        <!-- Left Sidebar - Players -->
        <div class="w-72 flex flex-col">
            <div class="bg-card border rounded-lg p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        Players ({{ players.length }})
                    </h2>
                    <Button v-if="isHost" size="sm" variant="outline" class="cursor-pointer" @click="resetScores">Reset Points</Button>
                </div>
                <div v-if="!isPresenceReady" class="flex-1 grid place-items-center">
                    <div class="inline-flex items-center text-sm text-muted-foreground">
                        <Icon name="mdi:loading" class="h-4 w-4 animate-spin mr-2" /> Connecting…
                    </div>
                </div>
                <div v-else class="space-y-3">
                    <div v-for="(player, idx) in displayPlayers" :key="player.id" class="p-3 bg-secondary/30 rounded-lg">

                        <!-- Normal state: name display with edit button -->
                        <div v-if="!(player.id === user?.id && isEditingName)"
                            class="flex items-start gap-3">
                            <div v-if="gameState.isActive" class="w-5 text-center mt-1">
                                <Icon v-if="idx === 0" name="mdi:trophy" class="w-4 h-4 text-amber-500" />
                                <Icon v-else-if="idx === 1" name="mdi:medal" class="w-4 h-4 text-slate-400" />
                                <Icon v-else-if="idx === 2" name="mdi:medal-outline" class="w-4 h-4 text-amber-700/70" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="font-medium truncate">
                                        {{ getPlayerDisplayName(player) }}
                                    </span>
                                    <Icon v-if="gameState.playersGuessed.has(player.id)" name="mdi:check-circle" class="w-4 h-4 text-emerald-500" />
                                    <Button v-if="player.id === user?.id" @click="startEditingName" size="sm"
                                        variant="ghost" class="p-1 h-6 w-6 opacity-60 hover:opacity-100 cursor-pointer">
                                        <Icon name="mdi:pencil" class="h-3 w-3" />
                                    </Button>
                                </div>
                                <div class="mt-1 flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" class="text-xs">
                                        {{ (gameState.scores?.[player.id] || 0) }} pts
                                    </Badge>
                                    <Badge v-if="player.id === user?.id" variant="secondary" class="text-xs">You</Badge>
                                    <Badge v-if="player.id === room?.host_id" variant="default" class="text-xs">Host</Badge>
                                </div>
                            </div>
                        </div>

                        <!-- Edit state: inline input with icons -->
                        <div v-else class="flex items-center gap-2 w-full">
                            <input v-model="tempName" @keydown.enter="updatePlayerName"
                                @keydown.escape="cancelEditingName" type="text" placeholder="Enter your name..."
                                class="flex-1 min-w-0 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                maxlength="20" ref="nameInput" />
                            <Button variant="ghost" size="icon" class="cursor-pointer" @click="updatePlayerName">
                                <Icon name="mdi:check" class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" class="cursor-pointer" @click="cancelEditingName">
                                <Icon name="mdi:close" class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Middle Content - Game/Settings -->
        <div class="flex-1 flex flex-col min-h-0">
            <div class="bg-card border rounded-lg p-8 flex-1 flex flex-col min-h-0">
                <div v-if="!gameState.isActive" class="text-center mb-6">
                    <p class="text-muted-foreground">{{ isHost ? 'Configure settings and start the game' : 'Waiting for the host to start the game' }}</p>
                    <div v-if="isHost" class="flex items-center justify-center gap-2 mt-2 h-5">
                        <div v-if="isSavingSettings" class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-xs text-green-600">Saving...</span>
                        </div>
                        <div v-else-if="hasPendingChanges" class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <span class="text-xs text-amber-600">Will save in {{ Math.ceil(500 / 1000) }}s...</span>
                        </div>
                    </div>
                </div>

                <!-- Game Active -->
                <div v-if="gameState.isActive" class="space-y-6">
                    <!-- Game Header -->
                    <div class="text-center relative">
                        <div class="text-2xl font-bold mb-2">
                            Round {{ gameState.currentRound + 1 }} of {{ gameState.totalRounds }}
                        </div>
                        <div class="text-muted-foreground">
                            {{ gameState.playersGuessed.size }} / {{ players.length }} players guessed
                        </div>
                        <div v-if="isHost" class="absolute right-0 top-0 flex gap-2">
                            <Button size="icon" variant="ghost" class="h-8 w-8 cursor-pointer" @click="showNextClue">
                                <Icon name="mdi:skip-next" class="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="ghost" class="h-8 w-8 cursor-pointer" @click="nextRound">
                                <Icon name="mdi:chevron-double-right" class="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <!-- Compact Leaderboard -->
                    <div v-if="leaderboard.length" class="flex items-center justify-center gap-2 flex-wrap">
                        <div v-for="(entry, i) in leaderboard" :key="entry.id" class="px-3 py-1 rounded-full bg-secondary/30 text-sm">
                            <span class="font-medium">{{ i + 1 }}.</span>
                            <span>{{ getPlayerDisplayNameById(entry.id) }}</span>
                            <span class="text-muted-foreground">— {{ entry.score }} pts</span>
                        </div>
                    </div>

                    <!-- Current Clue -->
                    <div v-if="gameState.currentContent && gameState.currentClueIndex >= 0" class="space-y-6">
                        <!-- Category and Clue Counter -->
                        <div class="text-center space-y-2">
                            <div class="flex items-center justify-center gap-3">
                                <Icon :name="getCategoryIcon(gameState.currentContent.category_id || '')" 
                                      class="text-2xl"
                                      :style="{ color: getCategoryColor(gameState.currentContent.category_id || '') }" />
                                <h3 class="text-xl font-semibold">{{ getCategoryName(gameState.currentContent.category_id || '') }}</h3>
                            </div>
                            <div class="text-sm text-muted-foreground">
                                Clue {{ gameState.currentClueIndex + 1 }} of {{ gameState.currentContent.clues.length }}
                            </div>
                        </div>

                        <!-- Single Current Clue -->
                        <div v-if="gameState.currentContent.clues[gameState.currentClueIndex]" 
                             class="p-8 border-2 rounded-lg bg-card border-primary/20">
                            <div class="text-center mb-6">
                                <h4 class="text-lg font-semibold">{{ gameState.currentContent.clues[gameState.currentClueIndex]?.title }}</h4>
                            </div>
                            
                            <!-- Text Clue -->
                            <div v-if="gameState.currentContent.clues[gameState.currentClueIndex]?.type === 'text'" 
                                 class="text-xl leading-relaxed text-center">
                                {{ gameState.currentContent.clues[gameState.currentClueIndex]?.content }}
                            </div>
                            
                            <!-- Image Clue -->
                            <div v-else-if="gameState.currentContent.clues[gameState.currentClueIndex]?.type === 'image'" 
                                 class="text-center">
                                <img :src="gameState.currentContent.clues[gameState.currentClueIndex]?.content" 
                                     :alt="gameState.currentContent.clues[gameState.currentClueIndex]?.title" 
                                     class="max-w-full max-h-80 mx-auto rounded-lg shadow-lg" />
                            </div>
                            
                            <!-- Audio Clue -->
                            <div v-else-if="gameState.currentContent.clues[gameState.currentClueIndex]?.type === 'audio'" 
                                 class="text-center">
                                <audio controls class="mx-auto">
                                    <source :src="gameState.currentContent.clues[gameState.currentClueIndex]?.content" type="audio/mpeg">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        </div>
                    </div>

                    <!-- Timer -->
                    <div v-if="gameState.clueStartTime" class="text-center">
                        <div class="w-40 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                            <div class="h-full transition-all duration-100 ease-linear"
                                 :class="timerColorClass"
                                 :style="{ width: `${timeRemaining}%` }">
                            </div>
                        </div>
                        <p class="text-sm text-muted-foreground mt-2">{{ secondsRemaining }}s remaining</p>
                    </div>
                </div>

                <!-- Settings Form for Host (when game not active) -->
                <div v-else-if="isHost" class="flex flex-col gap-8 min-h-0">
                    <div class="min-h-0 flex-1">
                        <h3 class="text-lg font-semibold mb-4">Categories</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div v-for="category in allCategories" :key="category.id"
                                @click="toggleCategory(category.id)" :class="[
                                    'p-3 border-2 rounded-lg cursor-pointer transition-all hover:scale-105',
                                    settings.categories?.includes(category.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                ]"
                                :style="settings.categories?.includes(category.id) ? { borderColor: category.color, backgroundColor: category.color + '15' } : {}">
                                <div class="flex items-center gap-3">
                                    <Icon :name="category.icon" class="text-2xl flex-shrink-0"
                                        :style="{ color: category.color }" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium truncate">{{ category.display_name }}</div>
                                        <div class="text-xs text-muted-foreground">{{ category.content_count }} items</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-sm font-medium mb-3">Number of Rounds: {{ settings.rounds
                                }}</label>
                            <Slider :model-value="[settings.rounds || 5]" :max="10" :min="1" :step="1"
                                @update:model-value="(value) => settings.rounds = value?.[0] || 5" />
                            <div class="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>1</span>
                                <span>10</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-3">Clue Duration: {{ settings.clue_duration
                                }}s</label>
                            <Slider :model-value="[settings.clue_duration || 10]" :max="15" :min="5" :step="1"
                                @update:model-value="(value) => settings.clue_duration = value?.[0] || 10" />
                            <div class="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>5s</span>
                                <span>15s</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center pt-8 space-y-2">
                        <Button @click="startGame" size="lg" class="px-12 text-lg cursor-pointer" :disabled="!canStartGame">
                            Start Game
                        </Button>
                        <p v-if="!canStartGame" class="text-sm text-muted-foreground text-center">
                            Select at least one category to start the game
                        </p>
                    </div>
                </div>

                <!-- Read-only Settings for Players (when game not active) -->
                <div v-else class="space-y-6 min-h-0 flex-1">
                    <div>
                        <h3 class="text-lg font-semibold mb-4">Selected Categories</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div v-for="categoryId in validSelectedCategories" :key="categoryId"
                                class="p-3 border-2 rounded-lg" :style="{
                                    borderColor: getCategoryColor(categoryId),
                                    backgroundColor: getCategoryColor(categoryId) + '15'
                                }">
                                <div class="flex items-center gap-3">
                                    <Icon :name="getCategoryIcon(categoryId)" class="text-2xl flex-shrink-0"
                                        :style="{ color: getCategoryColor(categoryId) }" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium truncate">{{ getCategoryName(categoryId) }}</div>
                                        <div class="text-xs text-muted-foreground">{{ getCategoryCount(categoryId) }} items</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-secondary/20 rounded-lg">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-primary">{{ room?.rounds }}</div>
                            <div class="text-sm text-muted-foreground">Rounds</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-primary">{{ room?.clue_duration }}s</div>
                            <div class="text-sm text-muted-foreground">Clue Duration</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Sidebar - Chat -->
        <div class="w-80 flex flex-col">
            <div class="bg-card border rounded-lg p-6 flex-1 flex flex-col min-h-0">
                <h2 class="text-xl font-bold mb-4">Chat</h2>

                <div class="flex-1 overflow-y-auto mb-4 space-y-3 min-h-0" ref="chatContainer">
                    <div v-for="message in chatMessages" :key="message.id" class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium">{{ message.playerName }}</span>
                            <span class="text-xs text-muted-foreground">{{ formatTime(message.timestamp) }}</span>
                        </div>
                        <div class="text-sm bg-secondary/30 rounded-lg p-2 whitespace-pre-wrap break-words">{{ message.content }}</div>
                    </div>
                    <div v-if="chatMessages.length === 0" class="text-center text-muted-foreground text-sm py-8">
                        No messages yet. Say hello! 👋
                    </div>
                </div>

                <div class="flex gap-2">
                    <textarea 
                        ref="chatInput"
                        v-model="newMessage"
                        @keydown.enter="handleTextareaEnter"
                        @input="autoResizeTextarea"
                        rows="3"
                        :placeholder="gameState.isActive && gameState.playersGuessed.has(user?.id || '') ? 'You have already guessed correctly!' : 'Type a message (Shift+Enter for newline)...'"
                        :disabled="gameState.isActive && gameState.playersGuessed.has(user?.id || '')"
                        class="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto whitespace-pre-wrap break-words min-h-9 max-h-32" 
                    />
                    <Button 
                        @click="sendMessage" 
                         size="sm" class="cursor-pointer"
                        :disabled="!newMessage.trim() || (gameState.isActive && gameState.playersGuessed.has(user?.id || ''))"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Tables, TablesUpdate } from '@@/types/database.types'
import type { Player } from '@@/types/player'
import { useScoring } from '../../composables/useScoring'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const roomCode = route.params.code as string

const url = useRequestURL()
useHead({
  title: `Room ${roomCode} — Vibedle` ,
  link: [
    { rel: 'canonical', href: `${url.origin}/room/${roomCode}` }
  ]
})

useSeoMeta({
  title: `Vibedle — Room ${roomCode}`,
  description: 'Play real-time pop culture trivia with friends. Guess faster to earn more points!',
  ogTitle: `Vibedle — Room ${roomCode}`,
  ogDescription: 'Real-time multiplayer trivia with progressive clues and speed-based scoring.',
  ogUrl: `${url.origin}/room/${roomCode}`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})

const { data: room, refresh: refreshRoom } = await useAsyncData<Tables<'rooms'>>('room', async () => {
    const { data } = await supabase.from('rooms').select().eq('code', roomCode).single()
    return data
})

interface CategoryWithCount {
    id: string
    display_name: string
    icon: string
    color: string
    content_count: number
}

const { data: allCategories } = await useAsyncData<CategoryWithCount[] | null>('categories', async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('id, display_name, icon, color, trivia_content(count)')
        .eq('is_active', true)
        .eq('trivia_content.is_active', true)

    if (error) {
        console.error('Failed to load categories with counts', error)
        return []
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        display_name: row.display_name,
        icon: row.icon,
        color: row.color,
        content_count: row?.trivia_content?.[0]?.count ?? 0,
    }))
})

interface ChatMessage {
    id: string
    playerName: string
    content: string
    timestamp: string
}

interface Clue {
    type: 'text' | 'image' | 'audio'
    title: string
    weight: number
    content: string
}

interface TriviaContent {
    id: string
    question: string
    answer: string
    alternative_answers: string[] | null
    clues: Clue[]
    category_id: string | null
}

interface GameState {
    isActive: boolean
    currentRound: number
    totalRounds: number
    currentContent: TriviaContent | null
    currentClueIndex: number
    clueStartTime: number | null
    playersGuessed: Set<string>
    roundAnswers: Map<string, { answer: string, timestamp: number, clueIndex: number, points: number }>
    scores: Record<string, number>
}

const players = ref<Player[]>([])
const settings = ref<TablesUpdate<'rooms'>>({
    rounds: 5,
    clue_duration: 10,
    categories: []
})
const chatMessages = ref<ChatMessage[]>([])
const newMessage = ref('')
const isSavingSettings = ref(false)
const hasPendingChanges = ref(false)
const playerName = useLocalStorage<string>('vibedle_player_name', '')
const isEditingName = ref(false)
const tempName = ref('')

// Game state
const gameState = ref<GameState>({
    isActive: false,
    currentRound: 0,
    totalRounds: 0,
    currentContent: null,
    currentClueIndex: -1,
    clueStartTime: null,
    playersGuessed: new Set(),
    roundAnswers: new Map(),
    scores: {}
})
const gameContent = ref<TriviaContent[]>([])
const clueTimer = ref<NodeJS.Timeout | null>(null)
const visualTimer = ref<NodeJS.Timeout | null>(null)
const timeRemaining = ref(100)
const chatContainer = ref<HTMLElement | null>(null)
const chatInput = ref<HTMLInputElement | null>(null)

const { calculatePoints } = useScoring()

const isPresenceReady = ref(false)

const displayPlayers = computed(() => {
    // Sort players by score desc, then by join time stable via existing order
    const scores = gameState.value.scores || {}
    return [...players.value].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
})

const leaderboard = computed(() => {
    const scores = gameState.value.scores || {}
    const entries = Object.keys(scores).map(id => ({ id, score: Number(scores[id] || 0) }))
    return entries.sort((a, b) => (b.score) - (a.score)).slice(0, 3)
})

function getPlayerDisplayNameById(id: string) {
    const player = players.value.find(p => p.id === id)
    return player ? getPlayerDisplayName(player) : 'Player'
}

const timerColorClass = computed(() => {
    if (timeRemaining.value > 66) return 'bg-emerald-500'
    if (timeRemaining.value > 33) return 'bg-amber-500'
    return 'bg-red-500'
})

const secondsRemaining = computed(() => {
    const duration = (settings.value.clue_duration || room.value?.clue_duration || 10)
    return Math.max(0, Math.ceil((timeRemaining.value / 100) * duration))
})

function resetScores() {
    if (!isHost.value) return
    gameState.value.scores = Object.fromEntries(players.value.map(p => [p.id, 0]))
    // Keep current round answers as-is; this only resets cumulative points.
    broadcastGameState()
}

const isHost = computed(() => room.value?.host_id === user.value?.id)

const validSelectedCategories = computed(() => {
    if (!room.value?.categories || !allCategories.value) return []
    
    return room.value.categories.filter(categoryId => 
        allCategories.value?.some(cat => cat.id === categoryId)
    )
})

function getSelectedCategoryNames(categoryIds?: string[] | null) {
    const ids = categoryIds || settings.value.categories;
    if (!ids || ids.length === 0) return 'None';
    return ids.map(id => allCategories.value?.find(c => c.id === id)?.display_name).filter(Boolean).join(', ')
}

function getCategoryName(categoryId: string) {
    return allCategories.value?.find(c => c.id === categoryId)?.display_name || 'Unknown'
}

function getCategoryIcon(categoryId: string) {
    return allCategories.value?.find(c => c.id === categoryId)?.icon || 'mdi:help-circle'
}

function getCategoryColor(categoryId: string) {
    return allCategories.value?.find(c => c.id === categoryId)?.color || '#6b7280'
}

function getCategoryCount(categoryId: string) {
    return allCategories.value?.find((c: any) => c.id === categoryId)?.content_count ?? 0
}

function toggleCategory(categoryId: string) {
    const newCategories = settings.value.categories ? [...settings.value.categories] : [];
    const index = newCategories.indexOf(categoryId);
    if (index > -1) {
        newCategories.splice(index, 1);
    } else {
        newCategories.push(categoryId);
    }
    settings.value.categories = newCategories;
}

function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollChatToBottom() {
    if (chatContainer.value) {
        nextTick(() => {
            const container = chatContainer.value!
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            })
        })
    }
}

function generatePlayerName(playerIndex: number): string {
    return `Player ${playerIndex + 1}`
}

function getPlayerDisplayName(player: any): string {
    // If the player has a custom name (not the default generated one), use it
    if (player.name && !player.name.startsWith('Player ') && player.name !== 'Anonymous') {
        return player.name
    }
    // Otherwise, generate a numbered name based on their position in the sorted list
    const playerIndex = players.value.findIndex(p => p.id === player.id)
    return generatePlayerName(playerIndex)
}

async function updatePlayerName() {
    if (!user.value || !tempName.value.trim()) return

    const newName = tempName.value.trim()
    playerName.value = newName

    // Update presence with new name
    if (channel) {
        await channel.track({
            id: user.value.id,
            name: newName,
            joined_at: new Date().toISOString(),
        })
    }

    isEditingName.value = false
}

function startEditingName() {
    const currentPlayer = players.value.find(p => p.id === user.value?.id)
    tempName.value = playerName.value || currentPlayer?.name || ''
    isEditingName.value = true

    // Focus the input after Vue updates the DOM
    nextTick(() => {
        const nameInput = document.querySelector('input[ref="nameInput"]') as HTMLInputElement
        if (nameInput) {
            nameInput.focus()
            nameInput.select()
        }
    })
}

function cancelEditingName() {
    tempName.value = ''
    isEditingName.value = false
}

async function sendMessage() {
    if (!newMessage.value.trim() || !user.value) return

    const currentPlayer = players.value.find(p => p.id === user.value?.id)
    const displayName = currentPlayer ? getPlayerDisplayName(currentPlayer) : (playerName.value || 'Anonymous')

    // During active game, send all messages to host for answer checking
    if (gameState.value.isActive && !gameState.value.playersGuessed.has(user.value.id)) {
        // Send guess to host for verification
        if (channel) {
            await channel.send({
                type: 'broadcast',
                event: 'player_guess',
                payload: {
                    playerId: user.value.id,
                    playerName: displayName,
                    guess: newMessage.value.trim(),
                    timestamp: new Date().toISOString()
                }
            })
        }
    } else if (!gameState.value.isActive || !gameState.value.playersGuessed.has(user.value.id)) {
        // Regular chat message (not during game or already guessed correctly)
        const message: ChatMessage = {
            id: crypto.randomUUID(),
            playerName: displayName,
            content: newMessage.value.trim(),
            timestamp: new Date().toISOString()
        }

        // Send message through channel
        if (channel) {
            await channel.send({
                type: 'broadcast',
                event: 'chat_message',
                payload: message
            })
        }
    }

    newMessage.value = ''
}

// Host-only function to check player guesses
function handlePlayerGuess(playerId: string, playerName: string, guess: string, timestamp: string) {
    if (!isHost.value || !gameState.value.isActive || !gameState.value.currentContent) return
    if (gameState.value.playersGuessed.has(playerId)) return // Already guessed correctly

    const isCorrect = checkAnswer(
        guess,
        gameState.value.currentContent.answer,
        gameState.value.currentContent.alternative_answers
    )

    if (isCorrect) {
        // Player guessed correctly
        const correctRank = gameState.value.playersGuessed.size
        const elapsedMs = gameState.value.clueStartTime ? Date.now() - gameState.value.clueStartTime : 0
        const clueDurationMs = (settings.value.clue_duration || 10) * 1000
        const totalClues = gameState.value.currentContent?.clues.length || 1
        const points = calculatePoints({
            clueIndex: gameState.value.currentClueIndex,
            totalClues,
            elapsedMs,
            clueDurationMs,
            correctRankInRound: correctRank,
        })

        gameState.value.playersGuessed.add(playerId)
        gameState.value.roundAnswers.set(playerId, {
            answer: guess,
            timestamp: Date.now(),
            clueIndex: gameState.value.currentClueIndex,
            points,
        })

        // Update cumulative score
        const prev = gameState.value.scores[playerId] || 0
        gameState.value.scores[playerId] = prev + points

        // Send correct answer message
        const correctMessage: ChatMessage = {
            id: crypto.randomUUID(),
            playerName: playerName,
            content: `✅ Correct answer! +${points} pts`,
            timestamp: timestamp
        }

        if (channel) {
            channel.send({
                type: 'broadcast',
                event: 'chat_message',
                payload: correctMessage
            })
        }

        // Check if everyone has guessed
        const activePlayers = players.value.length
        if (gameState.value.playersGuessed.size >= activePlayers) {
            // Everyone guessed, move to next round
            setTimeout(() => {
                nextRound()
            }, 1000)
        } else {
            broadcastGameState()
        }
    } else {
        // Incorrect guess, show as regular chat message
        const message: ChatMessage = {
            id: crypto.randomUUID(),
            playerName: playerName,
            content: guess,
            timestamp: timestamp
        }

        if (channel) {
            channel.send({
                type: 'broadcast',
                event: 'chat_message',
                payload: message
            })
        }
    }
}


const isUpdatingFromDatabase = ref(false)

watch(room, (newRoom) => {
    if (!newRoom) return

    // Avoid clobbering user edits: if we have pending changes or are saving, skip syncing from DB
    if (hasPendingChanges.value || isSavingSettings.value) return

    const nextRounds = newRoom.rounds ?? 5
    const nextClueDuration = newRoom.clue_duration ?? 10
    const nextCategories = newRoom.categories ?? []

    const categoriesEqual = Array.isArray(settings.value.categories)
        && settings.value.categories?.length === nextCategories.length
        && settings.value.categories?.every((id, i) => id === nextCategories[i])

    const needsSync = (settings.value.rounds ?? 5) !== nextRounds
        || (settings.value.clue_duration ?? 10) !== nextClueDuration
        || !categoriesEqual

    if (!needsSync) return

    isUpdatingFromDatabase.value = true
    settings.value.rounds = nextRounds
    settings.value.clue_duration = nextClueDuration
    settings.value.categories = nextCategories
    nextTick(() => {
        isUpdatingFromDatabase.value = false
    })
}, { immediate: true })

// Auto-save function (without debounce)
async function updateSettings() {
    if (!isHost.value) return;

    isSavingSettings.value = true;
    hasPendingChanges.value = false;
    try {
        const { error } = await supabase
            .from('rooms')
            .update({
                rounds: settings.value.rounds,
                clue_duration: settings.value.clue_duration,
                categories: settings.value.categories,
            })
            .eq('code', roomCode)

        if (error) {
            console.error('Error updating settings:', error);
        }
    } finally {
        isSavingSettings.value = false;
        // After saving, allow the DB watcher to sync if the server disagrees
        // but do not mark pending, to avoid immediate overwrite
    }
}

// Create debounced version
const debouncedUpdateSettings = useDebounceFn(updateSettings, 500)

// Auto-save when settings change (debounced) - but not when updating from database
watch(settings, () => {
    if (!isHost.value) return
    if (isUpdatingFromDatabase.value) return
    // Mark pending first to block DB watcher from clobbering values
    hasPendingChanges.value = true
    debouncedUpdateSettings()
}, { deep: true })

// Watch for new chat messages and auto-scroll
watch(chatMessages, () => {
    scrollChatToBottom()
}, { deep: true })

// Auto-focus chat input on keyboard press
function handleGlobalKeyPress(event: KeyboardEvent) {
    // Ignore if already focused on an input, textarea, or contenteditable
    const activeElement = document.activeElement
    if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
    )) {
        return
    }

    // Ignore special keys (ctrl, alt, cmd, etc.)
    if (event.ctrlKey || event.altKey || event.metaKey) {
        return
    }

    // Ignore function keys, escape, arrow keys, etc.
    if (event.key.length > 1 && !['Backspace', 'Delete', 'Space'].includes(event.key)) {
        return
    }

    // Focus the chat input if it's available and not disabled
    const inputEl = chatInput.value as HTMLTextAreaElement | HTMLInputElement | null
    if (inputEl && !(inputEl as any).disabled) {
        inputEl.focus()
        // If it's a printable character, add it to the input
        if (event.key.length === 1 || event.key === 'Space') {
            const char = event.key === 'Space' ? ' ' : event.key
            newMessage.value += char
            event.preventDefault()
        }
        // Ensure proper height after programmatic changes
        autoResizeTextarea()
    }
}

function handleTextareaEnter(e: KeyboardEvent) {
    if (e.shiftKey) {
        return // allow newline
    }
    e.preventDefault()
    sendMessage()
}

function autoResizeTextarea() {
    const el = chatInput.value as HTMLTextAreaElement | null
    if (!el) return
    // reset height to recalc, then set to scrollHeight
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px' // cap at ~max-h-32
}

async function handleUpdateSettings() {
    await updateSettings()
}

const canStartGame = computed(() => {
    return settings.value.categories && settings.value.categories.length > 0
})

async function fetchTriviaContent(): Promise<TriviaContent[]> {
    if (!settings.value.categories || settings.value.categories.length === 0) return []

    console.log('Fetching trivia content for categories:', settings.value.categories)
    
    // Filter out any non-UUID values and ensure we have valid category IDs
    const validCategoryIds = settings.value.categories.filter(id => {
        // Basic UUID format check (36 characters with hyphens)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return typeof id === 'string' && uuidRegex.test(id)
    })

    if (validCategoryIds.length === 0) {
        console.error('No valid category UUIDs found:', settings.value.categories)
        return []
    }

    console.log('Valid category IDs:', validCategoryIds)

    const { data, error } = await supabase.rpc('get_random_trivia_content', {
        category_ids: validCategoryIds,
        limit_count: settings.value.rounds || 5
    })

    if (error) {
        console.error('Error fetching trivia content:', error)
        console.error('Categories passed:', validCategoryIds)
        return []
    }

    return data?.map((item: any) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        alternative_answers: item.alternative_answers,
        clues: (item.clues as Clue[]).sort((a, b) => a.weight - b.weight), // Sort by weight (easiest last)
        category_id: item.category_id
    })) || []
}

function checkAnswer(guess: string, correctAnswer: string, alternativeAnswers: string[] | null): boolean {
    const normalizeAnswer = (answer: string) => 
        answer.toLowerCase().trim().replace(/[^\w\s]/g, '')

    const normalizedGuess = normalizeAnswer(guess)
    const normalizedCorrect = normalizeAnswer(correctAnswer)

    // Check main answer
    if (normalizedGuess === normalizedCorrect) return true

    // Check alternative answers
    if (alternativeAnswers) {
        return alternativeAnswers.some(alt => normalizeAnswer(alt) === normalizedGuess)
    }

    return false
}

function startVisualTimer(startTime?: number) {
    if (visualTimer.value) {
        clearInterval(visualTimer.value)
    }

    const clueStartTime = startTime || gameState.value.clueStartTime
    if (!clueStartTime) return

    const duration = (settings.value.clue_duration || room.value?.clue_duration || 10) * 1000
    timeRemaining.value = 100

    // Start visual timer that updates every 100ms
    visualTimer.value = setInterval(() => {
        if (clueStartTime) {
            const elapsed = Date.now() - clueStartTime
            const remaining = Math.max(0, 100 - (elapsed / duration * 100))
            timeRemaining.value = remaining
            
            if (remaining <= 0) {
                clearInterval(visualTimer.value!)
                visualTimer.value = null
            }
        }
    }, 100)
}

function startClueTimer() {
    if (clueTimer.value) {
        clearTimeout(clueTimer.value)
    }

    const duration = (settings.value.clue_duration || 10) * 1000
    gameState.value.clueStartTime = Date.now()
    
    // Start visual timer
    startVisualTimer()

    // Only host manages the actual game timer
    if (isHost.value) {
        clueTimer.value = setTimeout(() => {
            showNextClue()
        }, duration)
    }
}

function showNextClue() {
    if (!gameState.value.currentContent) return

    gameState.value.currentClueIndex++
    
    if (gameState.value.currentClueIndex < gameState.value.currentContent.clues.length) {
        // Show next clue
        startClueTimer()
        broadcastGameState()
    } else {
        // All clues shown, wait 2 seconds then next round
        setTimeout(() => {
            nextRound()
        }, 2000)
    }
}

function nextRound() {
    if (clueTimer.value) {
        clearTimeout(clueTimer.value)
        clueTimer.value = null
    }
    if (visualTimer.value) {
        clearInterval(visualTimer.value)
        visualTimer.value = null
    }

    gameState.value.currentRound++
    gameState.value.playersGuessed.clear()
    gameState.value.roundAnswers.clear()

    if (gameState.value.currentRound >= gameState.value.totalRounds) {
        // Game finished
        endGame()
    } else {
        // Start next round
        const nextContent = gameContent.value[gameState.value.currentRound]
        if (nextContent) {
            gameState.value.currentContent = nextContent
            gameState.value.currentClueIndex = 0
            startClueTimer()
            broadcastGameState()
        } else {
            // No more content, end game
            endGame()
        }
    }
}

function endGame() {
    gameState.value.isActive = false
    gameState.value.currentContent = null
    gameState.value.currentClueIndex = -1
    
    if (clueTimer.value) {
        clearTimeout(clueTimer.value)
        clueTimer.value = null
    }
    if (visualTimer.value) {
        clearInterval(visualTimer.value)
        visualTimer.value = null
    }
    
    broadcastGameState()
}

function broadcastGameState() {
    if (channel && isHost.value) {
        channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: {
                ...gameState.value,
                playersGuessed: Array.from(gameState.value.playersGuessed),
                roundAnswers: Array.from(gameState.value.roundAnswers.entries()),
                clueStartTime: gameState.value.clueStartTime, // Include timer info
                scores: gameState.value.scores
            }
        })
    }
}

async function startGame() {
    if (!isHost.value || !canStartGame.value) return;

    // Save settings immediately before starting the game (not debounced)
    await updateSettings();

    console.log('Starting game with settings:', settings.value)
    console.log('All categories available:', allCategories.value)

    // Fetch trivia content
    const content = await fetchTriviaContent()
    if (content.length === 0) {
        console.error('No trivia content found for selected categories')
        alert('No trivia content found for the selected categories. Please select different categories or check that content exists in the database.')
        return
    }

    // Initialize game state
    gameContent.value = content
    gameState.value = {
        isActive: true,
        currentRound: 0,
        totalRounds: settings.value.rounds || 5,
        currentContent: content[0] || null,
        currentClueIndex: 0,
        clueStartTime: null,
        playersGuessed: new Set(),
        roundAnswers: new Map(),
        scores: Object.fromEntries(players.value.map(p => [p.id, 0]))
    }

    // Start first clue
    startClueTimer()
    broadcastGameState()
}


let channel: RealtimeChannel

async function initializeRoom() {
    let currentUser = user.value
    if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) { return }
        currentUser = data.user
    }
    if (!currentUser) return;

    channel = supabase.channel(`room-${roomCode}`, {
        config: {
            presence: { key: currentUser.id },
            broadcast: {
                self: true
            }
        }
    })

    channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, () => {
            refreshRoom()
        })
        .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState<Player>()
            const newPlayers = Object.keys(presenceState).map(key => {
                const pres = presenceState[key]?.[0]
                return {
                    id: key,
                    name: pres?.name || pres?.presence_ref || 'Anonymous',
                    joined_at: pres?.joined_at || new Date().toISOString(),
                }
            })
            players.value = newPlayers.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
            isPresenceReady.value = true

            // Host updates room player_count and last_seen_at to support stale room cleanup
            if (isHost.value) {
                supabase
                    .from('rooms')
                    .update({
                        player_count: players.value.length,
                        last_seen_at: new Date().toISOString(),
                    })
                    .eq('code', roomCode)
                    .then(({ error }) => {
                        if (error) console.error('Failed to update room presence stats', error)
                    })
            }
        })
        .on('presence', { event: 'leave' }, async ({ leftPresences }) => {
            const hostLeft = leftPresences.some(p => p.id === room.value?.host_id)

            if (hostLeft) {
                const remainingPlayers = players.value.filter(p => p.id !== room.value?.host_id);
                if (remainingPlayers.length > 0) {
                    const newHost = remainingPlayers[0];
                    if (newHost?.id === currentUser?.id) {
                        await supabase
                            .from('rooms')
                            .update({ host_id: newHost.id })
                            .eq('code', roomCode)
                    }
                }
            }
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
            chatMessages.value.push(payload as ChatMessage)
        })
        .on('broadcast', { event: 'player_guess' }, ({ payload }) => {
            // Only host processes player guesses
            if (isHost.value) {
                handlePlayerGuess(payload.playerId, payload.playerName, payload.guess, payload.timestamp)
            }
        })
        .on('broadcast', { event: 'game_state' }, ({ payload }) => {
            if (!isHost.value) {
                // Update game state from host
                gameState.value = {
                    ...payload,
                    playersGuessed: new Set(payload.playersGuessed),
                    roundAnswers: new Map(payload.roundAnswers)
                }
                
                // Start visual timer for non-host players
                if (payload.clueStartTime && payload.isActive) {
                    startVisualTimer(payload.clueStartTime)
                }
            }
        })
        .subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') return

            // Ensure we have a persisted player name; fallback to user metadata once
            if (!playerName.value) {
                playerName.value = currentUser?.user_metadata.full_name || currentUser?.email || 'Anonymous'
            }

            await channel.track({
                id: currentUser?.id || '',
                name: playerName.value,
                joined_at: new Date().toISOString(),
            })
        })
}

onMounted(() => {
    initializeRoom()
    // Add global keypress listener
    document.addEventListener('keydown', handleGlobalKeyPress)
})

onUnmounted(() => {
    if (channel) {
        supabase.removeChannel(channel)
    }
    if (clueTimer.value) {
        clearTimeout(clueTimer.value)
    }
    if (visualTimer.value) {
        clearInterval(visualTimer.value)
    }
    // Remove global keypress listener
    document.removeEventListener('keydown', handleGlobalKeyPress)
})
</script>
