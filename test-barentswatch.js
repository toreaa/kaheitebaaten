// Test script for Barentswatch API
const CLIENT_ID = 'tabodsvik@gmail.com:kaheitebaaten'
const CLIENT_SECRET = "fnwioUFHu89 p3ry*9hUI)=YR$)hbuoe'cjq39R0"

// Let's try both methods
console.log('Testing with credentials:')
console.log('CLIENT_ID length:', CLIENT_ID.length)
console.log('CLIENT_SECRET length:', CLIENT_SECRET.length)

async function testBarentswatch() {
  console.log('\n=== Method 1: Credentials in body ===')

  try {
    // Step 1: Get OAuth2 token (Method 1: body)
    const tokenResponse = await fetch('https://id.barentswatch.no/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'ais',
      }),
    })

    console.log('Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token error response:', errorText)

      // Try Method 2: Basic Auth
      console.log('\n=== Method 2: Basic Auth ===')
      const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      console.log('Basic auth header (first 50 chars):', basicAuth.substring(0, 50) + '...')

      const tokenResponse2 = await fetch('https://id.barentswatch.no/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'ais',
        }),
      })

      console.log('Token response status (Basic Auth):', tokenResponse2.status)

      if (!tokenResponse2.ok) {
        const errorText2 = await tokenResponse2.text()
        console.error('❌ Token error response (Basic Auth):', errorText2)
        return
      }

      const tokenData = await tokenResponse2.json()
      console.log('✅ Token received with Basic Auth!')
      await testAIS(tokenData.access_token)
      return
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ Token received with body method!')
    await testAIS(tokenData.access_token)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function testAIS(accessToken) {
  try {
    console.log('\nToken expires in:', accessToken.length, 'chars')
    console.log('Token (first 50 chars):', accessToken.substring(0, 50) + '...')

    // Step 2: Fetch AIS data
    console.log('\n2. Testing AIS API call...')
    const aisResponse = await fetch(
      'https://live.ais.barentswatch.no/v1/latest/combined',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('AIS response status:', aisResponse.status)

    if (!aisResponse.ok) {
      const errorText = await aisResponse.text()
      console.error('❌ AIS error response:', errorText)
      return
    }

    const aisData = await aisResponse.json()
    console.log('✅ AIS data received!')
    console.log('Total vessels:', aisData.length)

    // Step 3: Filter for Tromsøysundet
    console.log('\n3. Filtering for Tromsøysundet area...')
    const BOUNDS = {
      latMin: 69.62,
      latMax: 69.68,
      lonMin: 18.90,
      lonMax: 19.02,
    }

    const tromsøVessels = aisData.filter(vessel => {
      const lat = vessel.latitude
      const lon = vessel.longitude

      return lat && lon &&
        lat >= BOUNDS.latMin && lat <= BOUNDS.latMax &&
        lon >= BOUNDS.lonMin && lon <= BOUNDS.lonMax
    })

    console.log('Vessels in Tromsøysundet:', tromsøVessels.length)

    if (tromsøVessels.length > 0) {
      console.log('\n4. Sample vessels in Tromsøysundet:')
      tromsøVessels.forEach((vessel, i) => {
        console.log(`\n${i + 1}. ${vessel.name}`)
        console.log('   MMSI:', vessel.mmsi)
        console.log('   Position:', `${vessel.latitude.toFixed(4)}°N, ${vessel.longitude.toFixed(4)}°E`)
        console.log('   Speed:', vessel.speedOverGround, 'knots')
        console.log('   Course:', vessel.courseOverGround, '°')
        console.log('   Heading:', vessel.trueHeading, '°')
        console.log('   Updated:', vessel.msgtime)
      })
      console.log('\nFull sample object:', JSON.stringify(tromsøVessels[0], null, 2))
    } else {
      console.log('\n⚠️ No vessels found in Tromsøysundet area')
      console.log('Let me check the actual data structure...')
      console.log('\nFirst vessel complete object:')
      console.log(JSON.stringify(aisData[0], null, 2))
    }
  } catch (error) {
    console.error('❌ AIS Error:', error.message)
  }
}

testBarentswatch()
