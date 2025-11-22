import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)

export default async function handler(req, res) {
  try {
    await client.connect()
    const db = client.db('trading')
    const collection = db.collection('weekly')

    if (req.method === 'POST') {
      const weeklyData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      console.log('Saving weekly data to MongoDB:', weeklyData)
      const result = await collection.replaceOne(
        { weekKey: weeklyData.weekKey },
        weeklyData,
        { upsert: true }
      )
      res.json({ success: true, data: result })
    } else if (req.method === 'GET') {
      const { weekKey } = req.query
      const weeklyData = await collection.findOne({ weekKey })
      res.json({ success: true, data: weeklyData })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('MongoDB error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}