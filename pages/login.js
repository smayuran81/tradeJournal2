import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          router.push('/')
        }
      })
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (data.success) {
        router.push('/')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'}}>
      <div style={{background:'white',padding:40,borderRadius:12,boxShadow:'0 10px 25px rgba(0,0,0,0.2)',maxWidth:400,width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:30}}>
          <div style={{width:60,height:60,background:'linear-gradient(45deg, #fbbf24, #f59e0b)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 15px'}}>📈</div>
          <h1 style={{margin:0,color:'#1f2937',fontSize:24,fontWeight:700}}>TradingJournal Pro</h1>
          <p style={{color:'#6b7280',margin:'8px 0 0'}}>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:14,fontWeight:600,color:'#374151',marginBottom:6}}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{width:'100%',padding:'12px',border:'1px solid #d1d5db',borderRadius:6,fontSize:16}}
              placeholder="Enter username"
              required
            />
          </div>
          
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:14,fontWeight:600,color:'#374151',marginBottom:6}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{width:'100%',padding:'12px',border:'1px solid #d1d5db',borderRadius:6,fontSize:16}}
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',padding:12,borderRadius:6,marginBottom:20,fontSize:14}}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%',
              padding:'12px',
              background:loading ? '#9ca3af' : 'linear-gradient(45deg, #f59e0b, #d97706)',
              color:'white',
              border:'none',
              borderRadius:6,
              fontSize:16,
              fontWeight:600,
              cursor:loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  )
}