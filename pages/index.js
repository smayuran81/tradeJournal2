import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { Box, Container, Button, Tabs, Tab } from '@mui/material'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'

const TickerGrid = dynamic(() => import('../components/TickerGrid'), { ssr: false })
const EditorPanel = dynamic(() => import('../components/EditorPanel'), { ssr: false })

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')

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
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <Topbar 
        onToggle={() => setSidebarOpen(s => !s)} 
        userName={user.name} 
        userImage={null}
        onSignOut={handleSignOut}
        isAdmin={user.username === 'admin'}
      />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebarOpen && <Sidebar open={sidebarOpen} onNavigate={setCurrentView} onClose={() => setSidebarOpen(false)} isAdmin={user.username === 'admin'} />}
        <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <Dashboard user={user} currentView={currentView} />
        </Box>
      </Box>
    </Box>
  )
}

function getWeekKey(d) {
  // get Monday of the week (ISO week starting Monday)
  const date = new Date(d)
  const day = date.getDay() || 7
  const monday = new Date(date.getTime() - (day - 1) * 86400000)
  return monday.toISOString().slice(0,10)
}

function generateWeekKeys(n = 4) {
  const out = []
  const now = new Date()
  for (let i=0;i<n;i++){
    const d = new Date(now.getTime() - i * 7 * 86400000)
    out.push(getWeekKey(d))
  }
  return out
}

function exportWeek(weekKey){
  try{
    const raw = localStorage.getItem('weekly-data')
    const parsed = raw ? JSON.parse(raw) : {}
    const data = parsed[weekKey] || {}
    const blob = new Blob([JSON.stringify({ week: weekKey, data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-${weekKey}.json`
    a.click()
    URL.revokeObjectURL(url)
  }catch(e){console.error(e)}
}
