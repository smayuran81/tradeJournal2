import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await client.connect()
    const profile = process.env.PROFILE || process.env.NODE_ENV
    const dbName = profile === 'dev' || profile === 'development' ? 'DEV' : 'production'
    console.log('Seeding database:', dbName, 'Profile:', profile)
    const db = client.db(dbName)
    const collection = db.collection('TradingStrategy')

    const strategies = [
      {
        name: 'Daily Pull back',
        description: 'Trade pullbacks in daily trend',
        category: 'Pullback',
        winRate: '68%',
        riskReward: '1:3',
        sections: [
          { id: 'setup', name: 'Setup Description' },
          { 
            id: 'rules', 
            name: 'Rules',
            subsections: [
              { id: 'market-condition', name: 'Market Condition', color: '#FF6B6B', text: '', image: null, checkList: [] },
              { id: 'potential-setup', name: 'When Setup Looks Like Potential', color: '#4ECDC4', text: '', image: null, checkList: [] },
              { id: 'ongoing-development', name: 'Ongoing Development', color: '#45B7D1', text: '', image: null, checkList: [] },
              { id: 'real-candidate', name: 'Real Candidate', color: '#96CEB4', text: '', image: null, checkList: [] },
              { id: 'entry-condition', name: 'Entry Condition', color: '#FFEAA7', text: '', image: null, checkList: [] },
              { id: 'exit-condition', name: 'Exit Condition', color: '#DDA0DD', text: '', image: null, checkList: [] },
              { id: 'trade-management', name: 'Trade Management', color: '#98D8C8', text: '', image: null, checkList: [] }
            ]
          },
          { id: 'examples', name: 'Examples' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Support/Resistance Breakout',
        description: 'Trade breakouts from key levels',
        category: 'Breakout',
        winRate: '58%',
        riskReward: '1:3',
        sections: [
          { id: 'setup', name: 'Setup Description' },
          { id: 'rules', name: 'Rules' },
          { id: 'backtest', name: 'Backtest Results' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Price Action Reversal',
        description: 'Candlestick pattern reversals',
        category: 'Reversal',
        winRate: '72%',
        riskReward: '1:2',
        sections: [
          { id: 'setup', name: 'Setup Description' },
          { id: 'rules', name: 'Rules' },
          { id: 'patterns', name: 'Patterns' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Fibonacci Retracement',
        description: 'Trade retracements at key fib levels',
        category: 'Retracement',
        winRate: '61%',
        riskReward: '1:2.8',
        sections: [
          { id: 'setup', name: 'Setup Description' },
          { id: 'rules', name: 'Rules' },
          { id: 'levels', name: 'Key Levels' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    await collection.deleteMany({})
    const result = await collection.insertMany(strategies)
    res.status(200).json({ message: 'Strategies seeded successfully', count: result.insertedCount })
  } catch (error) {
    res.status(500).json({ error: error.message })
  } finally {
    await client.close()
  }
}