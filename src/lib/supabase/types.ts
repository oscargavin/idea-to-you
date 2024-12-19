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