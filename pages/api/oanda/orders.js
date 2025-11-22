export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.OANDA_API_URL}/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/orders`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OANDA_API_TOKEN}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Oanda API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Oanda API error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch Oanda orders' })
  }
}