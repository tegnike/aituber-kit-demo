export const config = {
  runtime: 'edge',
}

// export default async function handler(req: Request) {
//   if (req.method !== 'POST') {
//     return new Response(JSON.stringify({ error: 'Method not allowed' }), {
//       status: 405,
//       headers: { 'Content-Type': 'application/json' },
//     })
//   }

//   try {
//     const {
//       script,
//       speed,
//       voiceActorId,
//       apiKey,
//       emotionalLevel,
//       soundDuration,
//     } = await req.json()

//     const nijivoiceApiKey = apiKey || process.env.NIJIVOICE_API_KEY
//     if (!nijivoiceApiKey) {
//       return new Response(JSON.stringify({ error: 'API key is required' }), {
//         status: 400,
//         headers: { 'Content-Type': 'application/json' },
//       })
//     }

//     const response = await fetch(
//       `https://api.nijivoice.com/api/platform/v1/voice-actors/${voiceActorId}/generate-encoded-voice`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'x-api-key': nijivoiceApiKey,
//         },
//         body: JSON.stringify({
//           script,
//           speed: speed.toString(),
//           format: 'mp3',
//           emotionalLevel: emotionalLevel.toString(),
//           soundDuration: soundDuration.toString(),
//         }),
//       }
//     )

//     if (!response.ok) {
//       throw new Error(`Nijivoice API error: ${response.status}`)
//     }

//     const data = await response.json()
//     const base64Audio = data.generatedVoice.base64Audio
//     const audioBuffer = Buffer.from(base64Audio, 'base64')

//     return new Response(audioBuffer, {
//       headers: {
//         'Content-Type': 'audio/mpeg',
//         'Content-Length': audioBuffer.length.toString(),
//       },
//     })
//   } catch (error) {
//     console.error('Error in Nijivoice TTS:', error)
//     return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' },
//     })
//   }
// }
