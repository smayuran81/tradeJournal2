import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const TradeJournal = dynamic(() => import('../components/TradeJournal'), { ssr: false })

export default function TradeJournalPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          router.push('/login')
        }
        setLoading(false)
      })
  }, [router])

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
        <div>Access Denied</div>
      </div>
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      {/* Top Bar */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button 
            onClick={() => router.push('/')}
            style={{padding:'8px 16px',background:'transparent',border:'1px solid #d1d5db',borderRadius:6,cursor:'pointer',fontSize:14}}
          >
            ← Dashboard
          </button>
          <h1 style={{margin:0,fontSize:20,fontWeight:700,color:'#1f2937'}}>Trade Journal</h1>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:14,color:'#6b7280'}}>Welcome, {user.name}</span>
          <button 
            onClick={handleSignOut}
            style={{padding:'8px 16px',background:'#dc2626',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:14,fontWeight:600}}
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Trade Journal */}
      <div style={{flex:1}}>
        <TradeJournal />
      </div>
    </div>
  )
}