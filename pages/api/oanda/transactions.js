export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const url = `${process.env.OANDA_API_URL}/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/transactions?id=1-1000`
    console.log('Fetching from:', url)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OANDA_API_TOKEN}`
      }
    })

    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Oanda API error response:', errorText)
      throw new Error(`Oanda API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Oanda response data:', JSON.stringify(data, null, 2))
    res.status(200).json(data)
  } catch (error) {
    console.error('Oanda API error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch Oanda transactions' })
  }
}