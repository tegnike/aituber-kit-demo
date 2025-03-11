export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const { message, ttsType, languageCode } = await req.json()

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: message },
          voice: { languageCode: languageCode, name: ttsType },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google TTS API Error:', error)
      return new Response(
        JSON.stringify({ error: 'Google TTS API Error', details: error }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
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
        audio: data.audioContent,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error in Google Text-to-Speech:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
