export const config = {
  runtime: 'edge',
}

import { NextRequest } from 'next/server'

const getLanguageCode = (selectLanguage: string): string => {
  switch (selectLanguage) {
    case 'ja':
      return 'JP'
    case 'en':
      return 'EN'
    case 'zh':
      return 'ZH'
    default:
      return 'EN'
  }
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const message = body.message
    const stylebertvits2ModelId = body.stylebertvits2ModelId
    const stylebertvits2ServerUrl =
      body.stylebertvits2ServerUrl || process.env.STYLEBERTVITS2_SERVER_URL
    const stylebertvits2ApiKey =
      body.stylebertvits2ApiKey || process.env.STYLEBERTVITS2_API_KEY
    const stylebertvits2Style = body.stylebertvits2Style
    const stylebertvits2SdpRatio = body.stylebertvits2SdpRatio
    const stylebertvits2Length = body.stylebertvits2Length
    const selectLanguage = getLanguageCode(body.selectLanguage)

    if (!stylebertvits2ServerUrl.includes('https://api.runpod.ai')) {
      const queryParams = new URLSearchParams({
        text: message,
        model_id: stylebertvits2ModelId,
        style: stylebertvits2Style,
        sdp_ratio: stylebertvits2SdpRatio,
        length: stylebertvits2Length,
        language: selectLanguage,
      })

      const voice = await fetch(
        `${stylebertvits2ServerUrl.replace(/\/$/, '')}/voice?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'audio/wav',
            'X-API-Key': stylebertvits2ApiKey,
          },
        }
      )

      if (!voice.ok) {
        throw new Error(
          `サーバーからの応答が異常です。ステータスコード: ${voice.status}`
        )
      }

      const arrayBuffer = await voice.arrayBuffer()
      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': arrayBuffer.byteLength.toString(),
        },
      })
    } else {
      const voice = await fetch(
        `${stylebertvits2ServerUrl.replace(/\/$/, '')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${stylebertvits2ApiKey}`,
            'X-API-Key': stylebertvits2ApiKey,
          },
          body: JSON.stringify({
            input: {
              action: '/voice',
              model_id: stylebertvits2ModelId,
              text: message,
              style: stylebertvits2Style,
              sdp_ratio: stylebertvits2SdpRatio,
              length: stylebertvits2Length,
              language: selectLanguage,
            },
          }),
        }
      )

      if (!voice.ok) {
        throw new Error(
          `サーバーからの応答が異常です。ステータスコード: ${voice.status}`
        )
      }

      const voiceData = await voice.json()
      const base64Audio = voiceData.output.voice
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      return new Response(bytes, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': bytes.length.toString(),
        },
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
