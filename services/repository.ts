import { Trade, WeeklyData, PairReview } from '../types/models'

class Repository {
  // Trade Journal Methods
  async saveTrade(trade: Trade): Promise<void> {
    console.log('Saving Trade:', trade)
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
  }

  async getTrades(): Promise<Trade[]> {
    console.log('Getting Trades')
    const response = await fetch('/api/trades')
    const result = await response.json()
    return result.success ? result.data : []
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<void> {
    console.log('Repository: Updating Trade ID:', id)
    console.log('Repository: Updates:', updates)
    
    const response = await fetch(`/api/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    console.log('Repository: Response status:', response.status)
    const result = await response.json()
    console.log('Repository: Response data:', result)
    
    if (!result.success) {
      throw new Error(`Update failed: ${result.error}`)
    }
  }

  async deleteTrade(id: string): Promise<void> {
    console.log('Repository: Deleting Trade ID:', id)
    
    const response = await fetch(`/api/trades/${id}`, {
      method: 'DELETE'
    })
    
    const result = await response.json()
    if (!result.success) {
      throw new Error(`Delete failed: ${result.error}`)
    }
  }

  // Weekly Analysis Methods
  async saveWeeklyData(weekKey: string, pairs: any[], reviews: Record<string, PairReview>): Promise<void> {
    const weeklyData: WeeklyData = {
      weekKey,
      pairs,
      reviews,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    console.log('Saving Weekly Data:', weeklyData)
    const response = await fetch('/api/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weeklyData)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
  }

  async getWeeklyData(weekKey: string): Promise<WeeklyData | null> {
    console.log('Getting Weekly Data for:', weekKey)
    const response = await fetch(`/api/weekly?weekKey=${weekKey}`)
    const result = await response.json()
    return result.success ? result.data : null
  }

  async updatePairReview(weekKey: string, pair: string, review: PairReview): Promise<void> {
    console.log('Updating Pair Review:', { weekKey, pair, review })
    // TODO: Implement pair review update
  }
}

export const repository = new Repository()