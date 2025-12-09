import { useState, useEffect } from 'react'
import { repository } from '../services/repository'
import OandaTransactions from './OandaTransactions'
import StrategyPlaybook from './StrategyPlaybook'
import TradeJournal from './TradeJournal'

export default function Dashboard({ user, currentView = 'strategy-playbook', onMonthClick, monthFilter }) {
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    bestTrade: 0,
    worstTrade: 0,
    recentTrades: [],
    monthlyStats: [],
    equityCurve: []
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

      // Calculate monthly stats based on entry date
      const monthlyData = {}
      trades.forEach(trade => {
        const entryDate = trade.entryTime || trade.date
        if (!entryDate) return
        
        const date = new Date(entryDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { totalR: 0, trades: 0, wins: 0, losses: 0 }
        }
        
        const rValue = trade.rrAchieved ? parseFloat(trade.rrAchieved) : 0
        monthlyData[monthKey].totalR += rValue
        monthlyData[monthKey].trades += 1
        if (trade.result === 'Win') monthlyData[monthKey].wins += 1
        if (trade.result === 'Loss') monthlyData[monthKey].losses += 1
      })

      const monthlyStats = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          totalR: data.totalR.toFixed(2),
          trades: data.trades,
          winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0
        }))

      // Calculate equity curve
      const sortedTrades = trades
        .filter(t => t.entryTime || t.date)
        .sort((a, b) => new Date(a.entryTime || a.date) - new Date(b.entryTime || b.date))
      
      let cumulativeR = 0
      const equityCurve = sortedTrades.map(trade => {
        const rValue = trade.rrAchieved ? parseFloat(trade.rrAchieved) : 0
        cumulativeR += rValue
        return {
          date: new Date(trade.entryTime || trade.date).toLocaleDateString(),
          equity: cumulativeR.toFixed(2)
        }
      })

      setStats({
        totalTrades,
        winRate,
        totalProfit: Math.round(totalProfit * 10000) / 10000,
        bestTrade: Math.round(bestTrade * 10000) / 10000,
        worstTrade: Math.round(worstTrade * 10000) / 10000,
        recentTrades,
        monthlyStats,
        equityCurve
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

  if (currentView === 'trade-journal') {
    return <TradeJournal monthFilter={monthFilter} />
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

      {/* Monthly Performance Table */}
      <div style={{background:'white',padding:20,borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:20}}>
        <h3 style={{marginBottom:20,color:'#1f2937',fontSize:18,fontWeight:700}}>📊 Monthly Performance</h3>
        {stats.monthlyStats.length > 0 ? (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                  <th style={{padding:'12px',textAlign:'left',fontWeight:600,color:'#374151'}}>Month</th>
                  <th style={{padding:'12px',textAlign:'right',fontWeight:600,color:'#374151'}}>Total R</th>
                  <th style={{padding:'12px',textAlign:'right',fontWeight:600,color:'#374151'}}>Trades</th>
                  <th style={{padding:'12px',textAlign:'right',fontWeight:600,color:'#374151'}}>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthlyStats.map((stat, idx) => (
                  <tr 
                    key={stat.month} 
                    onClick={() => onMonthClick && onMonthClick(stat.month)}
                    style={{
                      borderBottom:'1px solid #f3f4f6',
                      background:idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      cursor: onMonthClick ? 'pointer' : 'default',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => onMonthClick && (e.currentTarget.style.background = '#e5e7eb')}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}
                  >
                    <td style={{padding:'12px',fontWeight:500,color:onMonthClick ? '#3b82f6' : 'inherit'}}>{stat.month}</td>
                    <td style={{padding:'12px',textAlign:'right',fontWeight:600,color:parseFloat(stat.totalR) >= 0 ? '#10b981' : '#ef4444'}}>
                      {parseFloat(stat.totalR) >= 0 ? '+' : ''}{stat.totalR}R
                    </td>
                    <td style={{padding:'12px',textAlign:'right'}}>{stat.trades}</td>
                    <td style={{padding:'12px',textAlign:'right',fontWeight:500}}>{stat.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{textAlign:'center',color:'#6b7280',padding:40}}>No monthly data available</div>
        )}
      </div>

      {/* Equity Curve */}
      <div style={{background:'white',padding:20,borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:20}}>
        <h3 style={{marginBottom:20,color:'#1f2937',fontSize:18,fontWeight:700}}>📈 Equity Curve (R Multiple)</h3>
        {stats.equityCurve.length > 0 ? (
          <div style={{position:'relative',height:300,padding:'20px 0'}}>
            <svg width="100%" height="100%" style={{overflow:'visible'}}>
              {stats.equityCurve.map((point, idx) => {
                if (idx === 0) return null
                const prevPoint = stats.equityCurve[idx - 1]
                const x1 = (idx - 1) / (stats.equityCurve.length - 1) * 100
                const x2 = idx / (stats.equityCurve.length - 1) * 100
                const maxEquity = Math.max(...stats.equityCurve.map(p => parseFloat(p.equity)))
                const minEquity = Math.min(...stats.equityCurve.map(p => parseFloat(p.equity)))
                const range = maxEquity - minEquity || 1
                const y1 = 90 - ((parseFloat(prevPoint.equity) - minEquity) / range * 80)
                const y2 = 90 - ((parseFloat(point.equity) - minEquity) / range * 80)
                return (
                  <line
                    key={idx}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                )
              })}
              {stats.equityCurve.map((point, idx) => {
                const x = idx / (stats.equityCurve.length - 1) * 100
                const maxEquity = Math.max(...stats.equityCurve.map(p => parseFloat(p.equity)))
                const minEquity = Math.min(...stats.equityCurve.map(p => parseFloat(p.equity)))
                const range = maxEquity - minEquity || 1
                const y = 90 - ((parseFloat(point.equity) - minEquity) / range * 80)
                return (
                  <circle
                    key={idx}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="#3b82f6"
                  />
                )
              })}
            </svg>
            <div style={{marginTop:10,fontSize:12,color:'#6b7280',textAlign:'center'}}>
              Current: {stats.equityCurve[stats.equityCurve.length - 1]?.equity}R
            </div>
          </div>
        ) : (
          <div style={{textAlign:'center',color:'#6b7280',padding:40}}>No equity data available</div>
        )}
      </div>

      {/* Recent Trades */}
      <div style={{background:'white',padding:20,borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h3 style={{marginBottom:20,color:'#1f2937',fontSize:18,fontWeight:700}}>Recent Trades</h3>
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