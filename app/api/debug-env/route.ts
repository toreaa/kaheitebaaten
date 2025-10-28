import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const clientId = process.env.BARENTSWATCH_CLIENT_ID
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET

  return NextResponse.json({
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId?.length || 0,
    clientSecretLength: clientSecret?.length || 0,
    clientIdPreview: clientId?.substring(0, 20) + '...',
    clientSecretPreview: clientSecret?.substring(0, 10) + '...',
  })
}
