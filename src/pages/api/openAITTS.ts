export const config = {
  runtime: 'edge',
}

import OpenAI from 'openai'

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

    const { message, voice, model, speed, apiKey } = body
    const openaiTTSKey = apiKey || process.env.OPENAI_TTS_KEY

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

    const mp3 = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: message,
      speed: speed,
    })

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
