import { MongoClient, ObjectId } from 'mongodb'

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
    
    const { id } = req.query
    const client = await clientPromise
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'trading'
    console.log('Individual Trade API - Connecting to database:', dbName, 'Profile:', profile)
    const db = client.db(dbName)
    const collection = db.collection('trades')

    if (req.method === 'PUT') {
      const updates = {
        ...req.body,
        updatedAt: new Date()
      }
      console.log('Updating trade with ID:', id)
      console.log('Update payload:', JSON.stringify(updates, null, 2))
      
      const result = await collection.updateOne(
        { id: id, userId: session.userId },
        { $set: updates }
      )
      
      console.log('MongoDB update result:', result)
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, error: 'Trade not found' })
      }
      
      res.json({ success: true, data: result })
    } else if (req.method === 'DELETE') {
      console.log('Deleting trade with ID:', id)
      
      const result = await collection.deleteOne({ id: id, userId: session.userId })
      
      console.log('MongoDB delete result:', result)
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: 'Trade not found' })
      }
      
      res.json({ success: true, data: result })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('MongoDB update error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}