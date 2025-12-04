import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

export default async function handler(req, res) {
  try {
    await client.connect()
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'trading'
    console.log('Connecting to database:', dbName, 'Profile:', profile)
    const db = client.db(dbName)
    const collection = db.collection('TradingStrategy')

    if (req.method === 'GET') {
      const strategies = await collection.find({}).toArray()
      res.status(200).json(strategies)
    } else if (req.method === 'POST') {
      const strategy = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const result = await collection.insertOne(strategy)
      res.status(201).json({ ...strategy, _id: result.insertedId })
    } else if (req.method === 'PUT') {
      const { id, ...updates } = req.body 
      console.log('Updating strategy with ID:', id)
      console.log('Updates:', JSON.stringify(updates, null, 2))
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      )
      console.log('Update result:', result)
      res.status(200).json(result)
    } else if (req.method === 'DELETE') {
      const { id } = req.query
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      res.status(200).json(result)
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  } finally {
    await client.close()
  }
}