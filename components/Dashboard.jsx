import { useState, useEffect } from 'react'
import { repository } from '../services/repository'
import OandaTransactions from './OandaTransactions'
import StrategyPlaybook from './StrategyPlaybook'

export default function Dashboard({ user, currentView = 'dashboard' }) {
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    bestTrade: 0,
    worstTrade: 0,
    recentTrades: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const trades = await repository.getTrades()
      
      const totalTrades = trades.length
      const winningTrades = trades.filter(t => t.result === 'Win').length
      const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0
      
      // Calculate profits (simplified)
      const profits = trades.map(t => {
        if (!t.entryPrice || !t.exitPrice) return 0
        return Number(t.exitPrice) - Number(t.entryPrice)
      })
      
      const totalProfit = profits.reduce((sum, p) => sum + p, 0)
      const bestTrade = Math.max(...profits, 0)
      const worstTrade = Math.min(...profits, 0)
      
      // Recent trades (last 5)
      const recentTrades = trades
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

      setStats({
        totalTrades,
        winRate,
        totalProfit: Math.round(totalProfit * 10000) / 10000,
        bestTrade: Math.round(bestTrade * 10000) / 10000,
        worstTrade: Math.round(worstTrade * 10000) / 10000,
        recentTrades
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'400px'}}>
        <div>Loading dashboard...</div>
      </div>
    )
  }

  if (currentView === 'oanda-transactions') {
    return (
      <div style={{padding:20}}>
        <h1 style={{marginBottom:30,color:'#1f2937'}}>Oanda Orders</h1>
        <OandaTransactions />
      </div>
    )
  }

  if (currentView === 'strategy-playbook') {
    return <StrategyPlaybook />
  }

  return (
    <div style={{padding:20}}>
      <h1 style={{marginBottom:30,color:'#1f2937'}}>Trading Dashboard</h1>
      
      {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:20,marginBottom:40}}>
        <div style={{background:'linear-gradient(135deg, #3b82f6, #1d4ed8)',padding:20,borderRadius:12,color:'white'}}>
          <div style={{fontSize:32,fontWeight:700}}>{stats.totalTrades}</div>
          <div style={{opacity:0.9}}>Total Trades</div>
        </div>
        
        <div style={{background:'linear-gradient(135deg, #10b981, #059669)',padding:20,borderRadius:12,color:'white'}}>
          <div style={{fontSize:32,fontWeight:700}}>{stats.winRate}%</div>
          <div style={{opacity:0.9}}>Win Rate</div>
        </div>
        
        <div style={{background:'linear-gradient(135deg, #f59e0b, #d97706)',padding:20,borderRadius:12,color:'white'}}>
          <div style={{fontSize:32,fontWeight:700}}>{stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit}</div>
          <div style={{opacity:0.9}}>Total P&L</div>
        </div>
        
        <div style={{background:'linear-gradient(135deg, #8b5cf6, #7c3aed)',padding:20,borderRadius:12,color:'white'}}>
          <div style={{fontSize:32,fontWeight:700}}>+{stats.bestTrade}</div>
          <div style={{opacity:0.9}}>Best Trade</div>
        </div>
      </div>

      {/* Recent Trades */}
      <div style={{background:'white',padding:20,borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h3 style={{marginBottom:20,color:'#1f2937'}}>Recent Trades</h3>
        {stats.recentTrades.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {stats.recentTrades.map(trade => (
              <div key={trade.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,background:'#f9fafb',borderRadius:8}}>
                <div>
                  <div style={{fontWeight:600}}>{trade.pair}</div>
                  <div style={{fontSize:14,color:'#6b7280'}}>{new Date(trade.date).toLocaleDateString()}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:600,color:trade.result === 'Win' ? '#10b981' : trade.result === 'Loss' ? '#ef4444' : '#6b7280'}}>
                    {trade.result}
                  </div>
                  <div style={{fontSize:14,color:'#6b7280'}}>{trade.entryPrice} → {trade.exitPrice}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign:'center',color:'#6b7280',padding:40}}>
            No trades yet. Start by creating your first trade!
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{marginTop:30,display:'flex',gap:12,flexWrap:'wrap'}}>
        <button 
          onClick={() => window.location.href = '/trade-journal'}
          style={{padding:'12px 24px',background:'#3b82f6',color:'white',border:'none',borderRadius:8,fontWeight:600,cursor:'pointer'}}
        >
          Open Trade Journal
        </button>
        <button 
          onClick={loadDashboardData}
          style={{padding:'12px 24px',background:'transparent',border:'1px solid #d1d5db',borderRadius:8,fontWeight:600,cursor:'pointer'}}
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}