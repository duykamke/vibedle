<template>
  <div class="min-h-[calc(100vh-56px)] flex items-center justify-center p-6">
    <div class="w-full max-w-sm bg-card border rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">{{ mode === 'signin' ? 'Sign in' : 'Create account' }}</h1>
        <Button variant="ghost" size="sm" class="cursor-pointer" @click="toggleMode">
          {{ mode === 'signin' ? 'Create account' : 'Have an account? Sign in' }}
        </Button>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <FormField name="email" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="password" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="••••••••" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit" class="cursor-pointer w-full" :disabled="loading">
          <Icon v-if="loading" name="mdi:loading" class="h-4 w-4 mr-2 animate-spin" />
          <span>{{ mode === 'signin' ? 'Sign in' : 'Create account' }}</span>
        </Button>
      </form>

      
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const supabase = useSupabaseClient()
const loading = ref(false)
const mode = ref<'signin' | 'signup'>('signin')

const redirectInfo = useSupabaseCookieRedirect()
onMounted(() => {
  if (!redirectInfo.path.value) redirectInfo.path.value = window.location.pathname
})

const schema = toTypedSchema(z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
}))

const form = useForm({ validationSchema: schema })

const onSubmit = form.handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  try {
    if (mode.value === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
      })
      if (error) throw error
    }
    const path = redirectInfo.pluck()
    return navigateTo(path || '/')
  } catch (err: any) {
    alert(err?.message || 'Authentication failed')
  } finally {
    loading.value = false
  }
})

function toggleMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
}

// password sign-in removed
</script>