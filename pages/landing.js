import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Landing() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          router.push('/')
        }
      })
  }, [router])

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'}}>
      {/* Header */}
      <header style={{padding:'20px 0',background:'rgba(255,255,255,0.05)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,background:'linear-gradient(45deg, #fbbf24, #f59e0b)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📈</div>
            <h1 style={{color:'white',fontSize:24,fontWeight:700,margin:0}}>TradingJournal Pro</h1>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button
              onClick={() => router.push('/login')}
              style={{padding:'12px 24px',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:6,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:'#1e40af',fontSize:14}}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{padding:'100px 20px',textAlign:'center',color:'white'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{background:'rgba(255,255,255,0.1)',padding:'8px 20px',borderRadius:20,display:'inline-block',marginBottom:30,fontSize:14,fontWeight:500}}>
            Trusted by Professional Traders Worldwide
          </div>
          <h2 style={{fontSize:52,fontWeight:800,marginBottom:24,lineHeight:1.1,letterSpacing:'-0.02em'}}>
            Master Your Trading Performance with
            <span style={{background:'linear-gradient(45deg, #fbbf24, #f59e0b)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',display:'block'}}>Data-Driven Insights</span>
          </h2>
          <p style={{fontSize:22,marginBottom:50,opacity:0.9,lineHeight:1.5,maxWidth:700,margin:'0 auto 50px'}}>
            Professional trading journal platform designed for serious traders who understand that consistent profitability comes from disciplined analysis and continuous improvement.
          </p>
          <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',marginBottom:40}}>
            <button
              onClick={() => router.push('/login')}
              style={{padding:'18px 36px',background:'linear-gradient(45deg, #fbbf24, #f59e0b)',border:'none',borderRadius:8,color:'#1e40af',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 25px rgba(251,191,36,0.3)',transition:'all 0.3s'}}
            >
              Start Professional Journal
            </button>
          </div>
          <div style={{background:'rgba(0,0,0,0.2)',padding:20,borderRadius:12,borderLeft:'4px solid #fbbf24',maxWidth:600,margin:'0 auto'}}>
            <p style={{fontSize:16,fontStyle:'italic',margin:0,opacity:0.9}}>
              "The goal of a successful trader is to make the best trades. Money is secondary." 
              <span style={{display:'block',fontSize:14,marginTop:8,color:'#fbbf24'}}>— Alexander Elder</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{padding:'80px 20px',background:'rgba(255,255,255,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <h3 style={{textAlign:'center',fontSize:36,color:'white',marginBottom:60}}>Why Professional Traders Journal</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:30}}>
            
            <div style={{background:'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',padding:40,borderRadius:12,border:'1px solid rgba(16,185,129,0.2)'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
                <div style={{width:50,height:50,background:'linear-gradient(45deg, #10b981, #059669)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginRight:15}}>📊</div>
                <h4 style={{color:'white',fontSize:24,margin:0,fontWeight:700}}>Performance Analytics</h4>
              </div>
              <p style={{color:'rgba(255,255,255,0.9)',lineHeight:1.7,fontSize:16,marginBottom:20}}>
                Advanced metrics including Sharpe ratio, maximum drawdown, win/loss ratios, and risk-adjusted returns. Professional-grade analytics used by institutional traders.
              </p>
              <div style={{background:'rgba(16,185,129,0.1)',padding:15,borderRadius:8,borderLeft:'3px solid #10b981'}}>
                <p style={{color:'#10b981',fontSize:14,margin:0,fontWeight:600}}>"95% of consistently profitable traders maintain detailed performance records"</p>
              </div>
            </div>

            <div style={{background:'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))',padding:40,borderRadius:12,border:'1px solid rgba(59,130,246,0.2)'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
                <div style={{width:50,height:50,background:'linear-gradient(45deg, #3b82f6, #2563eb)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginRight:15}}>🎯</div>
                <h4 style={{color:'white',fontSize:24,margin:0,fontWeight:700}}>Risk Management</h4>
              </div>
              <p style={{color:'rgba(255,255,255,0.9)',lineHeight:1.7,fontSize:16,marginBottom:20}}>
                Systematic tracking of position sizing, stop-loss effectiveness, and risk-reward ratios. Identify and eliminate costly behavioral patterns before they impact your capital.
              </p>
              <div style={{background:'rgba(59,130,246,0.1)',padding:15,borderRadius:8,borderLeft:'3px solid #3b82f6'}}>
                <p style={{color:'#3b82f6',fontSize:14,margin:0,fontWeight:600}}>"Proper journaling reduces trading mistakes by up to 60%" - Market Research</p>
              </div>
            </div>

            <div style={{background:'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))',padding:40,borderRadius:12,border:'1px solid rgba(245,158,11,0.2)'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
                <div style={{width:50,height:50,background:'linear-gradient(45deg, #f59e0b, #d97706)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginRight:15}}>🧠</div>
                <h4 style={{color:'white',fontSize:24,margin:0,fontWeight:700}}>Psychology Tracking</h4>
              </div>
              <p style={{color:'rgba(255,255,255,0.9)',lineHeight:1.7,fontSize:16,marginBottom:20}}>
                Document emotional states, market conditions, and decision-making processes. Build the mental discipline required for consistent profitability in volatile markets.
              </p>
              <div style={{background:'rgba(245,158,11,0.1)',padding:15,borderRadius:8,borderLeft:'3px solid #f59e0b'}}>
                <p style={{color:'#f59e0b',fontSize:14,margin:0,fontWeight:600}}>"Trading is 20% strategy and 80% psychology" - Van Tharp</p>
              </div>
            </div>

            <div style={{background:'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(147,51,234,0.05))',padding:40,borderRadius:12,border:'1px solid rgba(168,85,247,0.2)'}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
                <div style={{width:50,height:50,background:'linear-gradient(45deg, #a855f7, #9333ea)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginRight:15}}>📈</div>
                <h4 style={{color:'white',fontSize:24,margin:0,fontWeight:700}}>Strategy Optimization</h4>
              </div>
              <p style={{color:'rgba(255,255,255,0.9)',lineHeight:1.7,fontSize:16,marginBottom:20}}>
                Backtest and refine your trading strategies with historical performance data. Identify which setups generate the highest risk-adjusted returns in different market conditions.
              </p>
              <div style={{background:'rgba(168,85,247,0.1)',padding:15,borderRadius:8,borderLeft:'3px solid #a855f7'}}>
                <p style={{color:'#a855f7',fontSize:14,margin:0,fontWeight:600}}>"Data-driven traders outperform intuition-based traders by 23%" - Financial Studies</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section style={{padding:'100px 20px',background:'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))'}}>
        <div style={{maxWidth:1000,margin:'0 auto',textAlign:'center',color:'white'}}>
          <h3 style={{fontSize:42,marginBottom:20,fontWeight:700}}>Proven Results from Professional Traders</h3>
          <p style={{fontSize:20,marginBottom:60,opacity:0.8,maxWidth:600,margin:'0 auto 60px'}}>Data from institutional trading firms and independent research studies</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:50}}>
            <div style={{background:'rgba(255,255,255,0.05)',padding:40,borderRadius:12,border:'1px solid rgba(16,185,129,0.3)'}}>
              <div style={{fontSize:56,fontWeight:800,color:'#10b981',marginBottom:10}}>95%</div>
              <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Institutional Success Rate</p>
              <p style={{fontSize:14,opacity:0.8}}>of consistently profitable institutional traders maintain detailed performance journals</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',padding:40,borderRadius:12,border:'1px solid rgba(59,130,246,0.3)'}}>
              <div style={{fontSize:56,fontWeight:800,color:'#3b82f6',marginBottom:10}}>67%</div>
              <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Error Reduction</p>
              <p style={{fontSize:14,opacity:0.8}}>decrease in costly trading mistakes through systematic journaling practices</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',padding:40,borderRadius:12,border:'1px solid rgba(245,158,11,0.3)'}}>
              <div style={{fontSize:56,fontWeight:800,color:'#f59e0b',marginBottom:10}}>2.3x</div>
              <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Faster Improvement</p>
              <p style={{fontSize:14,opacity:0.8}}>accelerated skill development compared to non-journaling traders</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',padding:40,borderRadius:12,border:'1px solid rgba(168,85,247,0.3)'}}>
              <div style={{fontSize:56,fontWeight:800,color:'#a855f7',marginBottom:10}}>$2.4M</div>
              <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Average AUM</p>
              <p style={{fontSize:14,opacity:0.8}}>assets under management of traders using systematic journaling</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Quote */}
      <section style={{padding:'80px 20px',background:'rgba(0,0,0,0.3)'}}>
        <div style={{maxWidth:800,margin:'0 auto',textAlign:'center'}}>
          <div style={{background:'rgba(255,255,255,0.05)',padding:50,borderRadius:16,border:'1px solid rgba(245,158,11,0.2)'}}>
            <p style={{fontSize:24,fontStyle:'italic',color:'white',marginBottom:20,lineHeight:1.5}}>
              "The difference between successful people and really successful people is that really successful people say no to almost everything."
            </p>
            <p style={{color:'#f59e0b',fontSize:16,fontWeight:600,marginBottom:40}}>— Warren Buffett</p>
            <p style={{fontSize:18,color:'rgba(255,255,255,0.9)',marginBottom:40}}>
              Say yes to disciplined trading. Start your professional journal today.
            </p>
            <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap'}}>
              <button
                onClick={() => router.push('/login')}
                style={{padding:'18px 36px',background:'linear-gradient(45deg, #f59e0b, #d97706)',border:'none',borderRadius:8,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 25px rgba(245,158,11,0.3)',display:'flex',alignItems:'center',gap:10}}
              >
                Begin Professional Journey
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{padding:'60px 20px',background:'rgba(0,0,0,0.5)',textAlign:'center'}}>
        <div style={{maxWidth:600,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:20}}>
            <div style={{width:32,height:32,background:'linear-gradient(45deg, #fbbf24, #f59e0b)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>📈</div>
            <h4 style={{color:'white',fontSize:20,fontWeight:700,margin:0}}>TradingJournal Pro</h4>
          </div>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:16,marginBottom:15}}>Professional trading analytics for serious traders</p>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>© 2024 TradingJournal Pro. Enterprise-grade trading journal platform.</p>
        </div>
      </footer>
    </div>
  )
}

