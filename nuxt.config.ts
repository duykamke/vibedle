import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/tailwind.css'],
  modules: [
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxtjs/supabase',
    'shadcn-nuxt',
  ],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/room/:code'],
      saveRedirectToCookie: true,
    },
    types: "@@/types/database.types.ts",
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./app/components/ui",
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  runtimeConfig: {
    vercelAiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
  }
})