export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  try {
    const { message, googleTtsTypeByLang, voiceLanguageCode } = await req.json()

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: message },
          voice: { languageCode: voiceLanguageCode, name: googleTtsTypeByLang },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error: 'Google TTS API Error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()

    if (!data.audioContent) {
      throw new Error('No audio content received from Google TTS')
    }

    // Base64デコード
    const binaryString = atob(data.audioContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // バイナリデータを数値配列として返す
    return new Response(
      JSON.stringify({
        audio: {
          data: Array.from(bytes),
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error in Google TTS:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
