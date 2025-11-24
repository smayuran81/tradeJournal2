export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.OANDA_API_URL}/v3/accounts`, {
      headers: {
        'Authorization': `Bearer ${process.env.OANDA_API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Oanda API error: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Oanda API error:', error)
    res.status(500).json({ error: 'Failed to fetch Oanda accounts' })
  }
}