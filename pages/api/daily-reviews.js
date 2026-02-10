import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
let client
let clientPromise

if (!uri) {
  console.warn('MONGODB_URI not found, using memory storage')
} else {
  if (!client) {
    client = new MongoClient(uri)
    clientPromise = client.connect()
  }
}

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    const { weekKey } = req.query

    if (!weekKey) {
      return res.status(400).json({ error: 'weekKey is required' })
    }

    try {
      if (clientPromise) {
        const client = await clientPromise
        const db = client.db('tradingJournal')
        const collection = db.collection('dailyReviews')

        const doc = await collection.findOne({ weekKey })
        return res.status(200).json({ reviews: doc?.reviews || {} })
      }
      return res.status(200).json({ reviews: {} })
    } catch (error) {
      console.error('Failed to fetch daily reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }
  }

  if (method === 'POST') {
    const { weekKey, reviews } = req.body

    if (!weekKey) {
      return res.status(400).json({ error: 'weekKey is required' })
    }

    try {
      if (clientPromise) {
        const client = await clientPromise
        const db = client.db('tradingJournal')
        const collection = db.collection('dailyReviews')

        await collection.updateOne(
          { weekKey },
          {
            $set: {
              reviews,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        )

        return res.status(200).json({ success: true })
      }
      return res.status(200).json({ success: true, warning: 'No database configured' })
    } catch (error) {
      console.error('Failed to save daily review:', error)
      return res.status(500).json({ error: 'Failed to save review' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${method} Not Allowed`)
}
