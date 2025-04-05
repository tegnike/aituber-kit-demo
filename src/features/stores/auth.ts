import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient, User, Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: ReturnType<typeof createClient> | null = null

if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserName: (name: string) => Promise<void>
  getUserName: () => Promise<string | null>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,

      signInWithGoogle: async () => {
        try {
          set({ loading: true, error: null })
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}`,
            },
          })
          
          if (error) throw error
        } catch (error: any) {
          set({ error: error.message })
          console.error('Google sign in error:', error)
        } finally {
          set({ loading: false })
        }
      },

      signInWithEmail: async (email, password) => {
        try {
          set({ loading: true, error: null })
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (error) throw error
          set({ user: data.user, session: data.session })
        } catch (error: any) {
          set({ error: error.message })
          console.error('Email sign in error:', error)
        } finally {
          set({ loading: false })
        }
      },

      signUpWithEmail: async (email, password) => {
        try {
          set({ loading: true, error: null })
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}`,
            },
          })
          
          if (error) throw error
          set({ user: data.user, session: data.session })
        } catch (error: any) {
          set({ error: error.message })
          console.error('Email sign up error:', error)
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        try {
          set({ loading: true, error: null })
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { error } = await supabase.auth.signOut()
          if (error) throw error
          
          set({ user: null, session: null })
        } catch (error: any) {
          set({ error: error.message })
          console.error('Sign out error:', error)
        } finally {
          set({ loading: false })
        }
      },

      updateUserName: async (name) => {
        try {
          set({ loading: true, error: null })
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { user } = get()
          if (!user) throw new Error('User not authenticated')
          
          const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, name, updated_at: new Date().toISOString() })
          
          if (error) throw error
        } catch (error: any) {
          set({ error: error.message })
          console.error('Update user name error:', error)
        } finally {
          set({ loading: false })
        }
      },

      getUserName: async () => {
        try {
          if (!supabase) throw new Error('Supabase client not initialized')
          
          const { user } = get()
          if (!user) return null
          
          const { data, error } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()
          
          if (error) throw error
          return data?.name || null
        } catch (error) {
          console.error('Get user name error:', error)
          return null
        }
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'aituber-kit-auth',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
)

if (typeof window !== 'undefined' && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.setState({
      user: session?.user || null,
      session: session,
    })
  })
}

export default useAuthStore
