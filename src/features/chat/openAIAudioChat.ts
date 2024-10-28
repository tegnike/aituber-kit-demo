import { Message } from '@/features/messages/messages'
import OpenAI from 'openai'
import settingsStore from '@/features/stores/settings'
import { handleReceiveTextFromRtFn } from './handlers'
import {
  base64ToArrayBuffer,
  AudioBufferManager,
} from '@/utils/audioBufferManager'

export async function getOpenAIAudioChatResponseStream(
  messages: Message[]
): Promise<ReadableStream<string>> {
  const ss = settingsStore.getState()
  const openai = new OpenAI({
    apiKey: ss.openaiKey,
    dangerouslyAllowBrowser: true,
  })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      modalities: ['text', 'audio'],
      audio: {
        voice: ss.audioModeVoice,
        format: 'pcm16',
      },
    })

    return new ReadableStream({
      async start(controller) {
        // handleReceiveText を handleReceiveTextFromRtFn() から取得
        const handleReceiveText = handleReceiveTextFromRtFn()

        const bufferManager = new AudioBufferManager(async (buffer) => {
          await handleReceiveText('', 'assistant', 'response.audio', buffer)
        })

        for await (const chunk of response) {
          const audio = chunk.choices[0]?.delta?.audio
          if (audio) {
            if (audio.transcript) {
              controller.enqueue(audio.transcript)
            } else if (audio.data) {
              bufferManager.addData(base64ToArrayBuffer(audio.data))
            }
          }
        }

        // ストリーム終了後に残っているバッファを送信
        await bufferManager.flush()
        controller.close()
      },
    })
  } catch (error) {
    console.error('OpenAI Audio API error:', error)
    throw error
  }
}