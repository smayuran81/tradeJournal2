import { MongoClient } from 'mongodb'

let client
let clientPromise

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(process.env.MONGODB_URI)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(process.env.MONGODB_URI)
  clientPromise = client.connect()
}

export default async function handler(req, res) {
  try {
    const sessionCookie = req.cookies.session
    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    
    let session
    try {
      session = JSON.parse(sessionCookie)
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid session' })
    }
    
    console.log('API called:', req.method, req.url)
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI)
    
    const client = await clientPromise
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'trading'
    console.log('Trades API - Connecting to database:', dbName, 'Profile:', profile)
    const db = client.db(dbName)
    const collection = db.collection('trades')

    if (req.method === 'POST') {
      const trade = {
        ...req.body,
        userId: session.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      console.log('Saving trade to MongoDB:', JSON.stringify(trade, null, 2))
      const result = await collection.insertOne(trade)
      console.log('MongoDB insert result:', result)
      res.json({ success: true, data: result })
    } else if (req.method === 'GET') {
      const trades = await collection.find({ userId: session.userId }).toArray()
      res.json({ success: true, data: trades })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('MongoDB error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    res.status(500).json({ success: false, error: error.message })
  }
}