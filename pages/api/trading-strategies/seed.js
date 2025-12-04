import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

const initialStrategies = [
  {
    name: "Breakout Strategy",
    description: "Momentum-based breakout trading on key levels",
    category: "Momentum",
    active: true
  },
  {
    name: "Support & Resistance",
    description: "Trading bounces off key S&R levels",
    category: "Price Action",
    active: true
  },
  {
    name: "Trend Following",
    description: "Following established trends with pullback entries",
    category: "Trend",
    active: true
  },
  {
    name: "Reversal Pattern",
    description: "Trading reversal patterns at key levels",
    category: "Reversal",
    active: true
  },
  {
    name: "Scalping",
    description: "Quick scalp trades on lower timeframes",
    category: "Scalping",
    active: true
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await client.connect()
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'production'
    const db = client.db(dbName)
    const collection = db.collection('TradingStrategy')

    const existingCount = await collection.countDocuments()
    if (existingCount > 0) {
      return res.status(200).json({ message: 'Strategies already exist', count: existingCount })
    }

    const strategiesWithTimestamps = initialStrategies.map(strategy => ({
      ...strategy,
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    const result = await collection.insertMany(strategiesWithTimestamps)
    res.status(201).json({ 
      message: 'Trading strategies seeded successfully', 
      insertedCount: result.insertedCount 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  } finally {
    await client.close()
  }
}