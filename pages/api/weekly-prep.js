import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)

export default async function handler(req, res) {
  try {
    await client.connect()
    const db = client.db('trading')
    const collection = db.collection('weeklyPrep')

    if (req.method === 'GET') {
      const { weekKey } = req.query
      if (weekKey) {
        const prep = await collection.findOne({ weekKey })
        res.status(200).json({ success: true, data: prep })
      } else {
        const preps = await collection.find({}).sort({ weekKey: -1 }).toArray()
        res.status(200).json({ success: true, data: preps })
      }
    } else if (req.method === 'POST') {
      const prepData = {
        ...req.body,
        updatedAt: new Date()
      }
      if (!req.body.createdAt) {
        prepData.createdAt = new Date()
      }
      const result = await collection.replaceOne(
        { weekKey: prepData.weekKey },
        prepData,
        { upsert: true }
      )
      res.status(200).json({ success: true, data: result })
    } else if (req.method === 'DELETE') {
      const { weekKey } = req.query
      const result = await collection.deleteOne({ weekKey })
      res.status(200).json({ success: true, data: result })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Weekly Prep API error:', error)
    res.status(500).json({ success: false, error: error.message })
  } finally {
    await client.close()
  }
}
