export const config = {
  runtime: 'edge',
}

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Message } from '@/features/messages/messages'

// Supabaseクライアントの初期化
let supabase: SupabaseClient | null = null
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    const { messages: newMessages, sessionId } = (await req.json()) as {
      messages: Message[]
      sessionId: string
    }
    const currentTime = new Date().toISOString()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ message: 'sessionId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!Array.isArray(newMessages) || newMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Invalid messages data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (supabase) {
      const { data: existingSession, error: selectError } = await supabase
        .from('public_chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle()

      if (selectError) {
        console.error('Error checking session:', selectError)
        throw selectError
      }

      let currentSessionId = existingSession?.id

      if (currentSessionId) {
        const { error: sessionError } = await supabase
          .from('public_chat_sessions')
          .update({ updated_at: currentTime })
          .eq('id', currentSessionId)

        if (sessionError) {
          console.error('Error updating session:', sessionError)
          throw sessionError
        }
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('public_chat_sessions')
          .insert({
            id: sessionId,
            title: '',
            created_at: currentTime,
            updated_at: currentTime,
          })
          .select('id')
          .single()

        if (sessionError) {
          console.error('Error inserting session:', sessionError)
          throw sessionError
        }
        currentSessionId = newSession?.id
      }

      if (!currentSessionId) {
        throw new Error('Failed to get or create session ID')
      }

      const messagesToSave = newMessages.map((msg: Message) => ({
        session_id: currentSessionId,
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
        created_at: msg.timestamp || currentTime,
      }))

      const { error: messageError } = await supabase
        .from('public_messages')
        .insert(messagesToSave)

      if (messageError) {
        console.error('Error inserting messages:', messageError)
        throw messageError
      }
    }

    return new Response(
      JSON.stringify({ message: 'Logs saved successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error saving chat log:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ message: 'Error saving chat log', error: errorMessage }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
