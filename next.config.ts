import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Silence Supabase realtime websocket connection errors in dev
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
