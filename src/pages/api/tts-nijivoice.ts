import { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    })
  }

  const body = await req.json()
  const { script, speed, voiceActorId, apiKey, emotionalLevel, soundDuration } =
    req.body

  const nijivoiceApiKey = apiKey || process.env.NIJIVOICE_API_KEY
  if (!nijivoiceApiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
    })
  }

  try {
    const response = await fetch(
      `https://api.nijivoice.com/api/platform/v1/voice-actors/${voiceActorId}/generate-voice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': nijivoiceApiKey,
        },
        body: JSON.stringify({
          script,
          speed: speed.toString(),
          format: 'wav',
          emotionalLevel: emotionalLevel.toString(),
          soundDuration: soundDuration.toString(),
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Nijivoice API error: ${response.status}`)
    }

    const data = await response.json()
    const audioUrl = data.generatedVoice.audioFileUrl

    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file')
    }

    return new Response(audioResponse.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error) {
    console.error('Error in Nijivoice TTS:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}
