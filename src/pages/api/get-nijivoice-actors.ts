import type { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const apiKey = searchParams.get('apiKey')

  const nijivoiceApiKey = apiKey || process.env.NIJIVOICE_API_KEY
  if (!nijivoiceApiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
    })
  }

  try {
    const response = await fetch(
      'https://api.nijivoice.com/api/platform/v1/voice-actors',
      {
        headers: {
          'x-api-key': nijivoiceApiKey as string,
        },
      }
    )
    const data = await response.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error) {
    console.error('Failed to fetch voice actors:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch voice actors' }),
      { status: 500 }
    )
  }
}
