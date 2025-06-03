export const config = {
  runtime: 'edge',
}

import OpenAI from 'openai'

// 感情表現を豊かにする追加指示を行うモデル、念の為リスト形式
const gpt4oEmotionalInstructionModels = ['gpt-4o']

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    console.log('Request body:', body)

    const { message, voice, model, speed, apiKey, emotion } = body
    const openaiTTSKey =
      apiKey || process.env.OPENAI_TTS_KEY || process.env.OPENAI_KEY

    console.log('Parsed parameters:', {
      hasMessage: !!message,
      hasVoice: !!voice,
      hasModel: !!model,
      hasKey: !!openaiTTSKey,
      speed,
    })

    if (!message || !voice || !model || !openaiTTSKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters',
          missing: {
            message: !message,
            voice: !voice,
            model: !model,
            key: !openaiTTSKey,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const openai = new OpenAI({ apiKey: openaiTTSKey })
    const options: {
      model: any
      voice: any
      speed: any
      input: any
      instructions?: any
    } = {
      model: model,
      voice: voice,
      speed: speed,
      input: message,
    }

    if (gpt4oEmotionalInstructionModels.some((m) => model.includes(m))) {
      options.instructions = `Please speak "${message}" with rich emotional expression.`
    }

    const mp3 = await openai.audio.speech.create(options)

    const audioData = await mp3.arrayBuffer()

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error) {
    console.error('OpenAI TTS error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate speech' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
