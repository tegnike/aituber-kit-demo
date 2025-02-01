export const config = {
  runtime: 'edge',
}

import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
    const { messages, sessionId } = await req.json()
    const created_at = new Date().toISOString()

    // メッセージ内の画像データを省略
    const processedMessages = messages.map((msg: any) => {
      if (msg.content && Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map((content: any) => {
            if (content.type === 'image') {
              return {
                type: 'image',
                image: '[image data omitted]',
              }
            }
            return content
          }),
        }
      }
      return msg
    })

    if (supabase) {
      // セッションが存在しない場合のみ作成（UPSERTを使用）
      const { error: sessionError } = await supabase
        .from('public_chat_sessions')
        .upsert(
          {
            id: sessionId,
            title: '', // 空文字列として保存
            created_at: created_at,
          },
          { onConflict: 'id' }
        )

      if (sessionError) throw sessionError

      // 最新のメッセージの保存
      const lastMessage = processedMessages[processedMessages.length - 1]
      const messageToSave = {
        session_id: sessionId,
        role: lastMessage.role,
        content: Array.isArray(lastMessage.content)
          ? JSON.stringify(lastMessage.content)
          : lastMessage.content,
      }

      const { error: messageError } = await supabase
        .from('public_messages')
        .insert(messageToSave)

      if (messageError) throw messageError
    }

    return new Response(JSON.stringify({ message: 'Log saved successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error saving chat log:', error)
    return new Response(JSON.stringify({ message: 'Error saving chat log' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
