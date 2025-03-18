export const config = {
  runtime: 'edge',
}

// エッジランタイムでは従来のNextApiRequest/ResponseのAPIではなく
// Requestとnext/serverからのNextResponseを使用
import { NextResponse } from 'next/server'

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const body = await req.json()
    const { text, speaker, speed, pitch, intonation, serverUrl } = body
    const apiUrl =
      serverUrl ||
      process.env.AIVIS_SPEECH_SERVER_URL ||
      'http://localhost:10101'
    const apiKey = process.env.AIVIS_SPEECH_KEY

    // APIキーの確認（もし必須の場合）
    if (!apiKey) {
      console.warn('AIVIS_SPEECH_KEY is not set')
    }

    // 共通ヘッダーの設定
    const headers = {
      'Content-Type': 'application/json',
      // APIキーがある場合のみヘッダーを追加
      ...(apiKey && { 'X-API-Key': apiKey }),
    }

    // 1. Audio Query の生成
    const queryResponse = await fetch(
      `${apiUrl}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`,
      {
        method: 'POST',
        headers,
      }
    )

    if (!queryResponse.ok) {
      throw new Error(`Audio query failed: ${queryResponse.status}`)
    }

    const queryData = await queryResponse.json()
    queryData.speedScale = speed
    queryData.pitchScale = pitch
    queryData.intonationScale = intonation

    // 2. 音声合成
    const synthesisResponse = await fetch(
      `${apiUrl}/synthesis?speaker=${speaker}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
          ...(apiKey && { 'X-API-Key': apiKey }),
        },
        body: JSON.stringify(queryData),
      }
    )

    if (!synthesisResponse.ok) {
      throw new Error(`Synthesis failed: ${synthesisResponse.status}`)
    }

    // 音声データをそのまま返す
    const audioData = await synthesisResponse.arrayBuffer()
    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/wav',
      },
    })
  } catch (error) {
    console.error('Error in AivisSpeech TTS:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
