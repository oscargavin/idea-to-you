// src/lib/supabase/types.ts
export type Database = {
    public: {
      Tables: {
        profiles: {
          Row: {
            id: string
            updated_at: string
            username: string | null
            avatar_url: string | null
            website: string | null
          }
          Insert: {
            id: string
            updated_at?: string
            username?: string | null
            avatar_url?: string | null
            website?: string | null
          }
          Update: {
            id?: string
            updated_at?: string
            username?: string | null
            avatar_url?: string | null
            website?: string | null
          }
        }
      }
    }
  }
  
  // src/lib/supabase/client.ts
  import { createClient } from '@supabase/supabase-js'
  import { Database } from './types'
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })