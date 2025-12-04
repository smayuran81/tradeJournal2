import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

export default async function handler(req, res) {
  try {
    await client.connect()
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'production'
    const db = client.db(dbName)
    const collection = db.collection('TradingStrategy')

    if (req.method === 'GET') {
      const strategies = await collection.find({}).sort({ name: 1 }).toArray()
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
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      )
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