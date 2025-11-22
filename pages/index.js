import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Box, Container, Button, Tabs, Tab } from '@mui/material'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'
import WeekControls from '../components/WeekControls'
import Dashboard from '../components/Dashboard'
import WeeklyAnalysisWizard from '../components/WeeklyAnalysisWizard'
import PairAnalysis from '../components/PairAnalysis'
import JournalHistory from '../components/JournalHistory'
import AddPairModal from '../components/AddPairModal'
import PlanForm from '../components/PlanForm'
import ChecklistPanel from '../components/ChecklistPanel'
import ReviewPanel from '../components/ReviewPanel'
import Toasts from '../components/Toast'
const TradeJournal = dynamic(() => import('../components/TradeJournal'), { ssr: false })

const TickerGrid = dynamic(() => import('../components/TickerGrid'), { ssr: false })
const EditorPanel = dynamic(() => import('../components/EditorPanel'), { ssr: false })

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selected, setSelected] = useState(null)
  const [weekKey, setWeekKey] = useState(getWeekKey(new Date()))
  const [pairs, setPairs] = useState([])
  const [selectedPair, setSelectedPair] = useState(null)
  const [reviewsByPair, setReviewsByPair] = useState({})
  const [tab, setTab] = useState(0)
  
  const [view, setView] = useState('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  function showToast(message, type = 'success', ms = 3000){
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms)
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('weekly-data')
      if (raw) {
        const parsed = JSON.parse(raw)
        const week = parsed[weekKey] || {}
        setPairs(week.pairs || [
          { pair: 'EUR/USD', bid: '1.0923', ask: '1.0925' },
          { pair: 'GBP/USD', bid: '1.2531', ask: '1.2534' },
          { pair: 'USD/JPY', bid: '149.12', ask: '149.15' },
        ])
        setReviewsByPair(week.reviews || {})
      } else {
        setPairs([
          { pair: 'EUR/USD', bid: '1.0923', ask: '1.0925' },
          { pair: 'GBP/USD', bid: '1.2531', ask: '1.2534' },
          { pair: 'USD/JPY', bid: '149.12', ask: '149.15' },
        ])
      }
    } catch (e) {}
  }, [weekKey])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('weekly-data')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed[weekKey] = { pairs, reviews: reviewsByPair }
      localStorage.setItem('weekly-data', JSON.stringify(parsed))
    } catch (e) {}
  }, [weekKey, pairs, reviewsByPair])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <Topbar onToggle={() => setSidebarOpen(s => !s)} userName="Mayuran" weekKey={weekKey} onWeekChange={setWeekKey} onNavigate={(v) => setView(v)} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebarOpen && <Sidebar open={sidebarOpen} onNavigate={(v) => setView(v)} />}
        <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'background.paper' }}>
            {view !== 'trade-journal' && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button variant="contained" onClick={() => setView('wizard')}>
                  Start Weekly Analysis
                </Button>
                <WeekControls
                  weekKey={weekKey}
                  onWeekChange={setWeekKey}
                  onAddPair={() => setModalOpen(true)}
                  showAddPair={true}
                />
              </Box>
            )}
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {view === 'dashboard' && (
              <Dashboard pairs={pairs} reviews={reviewsByPair} onOpenPair={(p, t) => { setSelectedPair(p); setTab(t === 'daily' ? 1 : t === 'review' ? 2 : 0); setView('analysis') }} />
            )}
            {view === 'trade-journal' && (
              <Box sx={{ height: '100%' }}>
                <TradeJournal />
              </Box>
            )}
            {view === 'wizard' && (
              <WeeklyAnalysisWizard pairs={pairs} onStart={(selected) => { setView('analysis'); setSelectedPair({ pair: selected[0] }); }} onAddPair={() => setModalOpen(true)} />
            )}
            {view === 'analysis' && selectedPair && (
              <PairAnalysis pair={selectedPair.pair} data={reviewsByPair[selectedPair.pair] || {}} onSave={(payload) => {
                setReviewsByPair(r => ({ ...r, [selectedPair.pair]: { ...(r[selectedPair.pair]||{}), ...payload, meta: { ...(r[selectedPair.pair]?.meta||{}), updatedAt: Date.now() } } }))
                showToast('Plan saved', 'success')
              }} />
            )}
            {view === 'history' && (
              <JournalHistory />
            )}

            {selectedPair && view === 'dashboard' && (
              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Plan" />
                  <Tab label="Daily Checklist" />
                  <Tab label="Weekly Review" />
                </Tabs>

                <Box sx={{ overflow: 'auto' }}>
                  {tab === 0 && (
                    <PlanForm
                      initial={reviewsByPair[selectedPair.pair]?.plan || {}}
                      onSave={(plan) => setReviewsByPair(r => ({ ...r, [selectedPair.pair]: { ...(r[selectedPair.pair] || {}), plan, meta: { ...(r[selectedPair.pair]?.meta || {}), updatedAt: Date.now() } } }))}
                    />
                  )}

                  {tab === 1 && (
                    <ChecklistPanel
                      plan={reviewsByPair[selectedPair.pair]?.plan || {}}
                      progress={reviewsByPair[selectedPair.pair]?.progress || { daily: {} }}
                      onToggle={(progress) => setReviewsByPair(r => ({ ...r, [selectedPair.pair]: { ...(r[selectedPair.pair] || {}), progress, meta: { ...(r[selectedPair.pair]?.meta || {}), updatedAt: Date.now() } } }))}
                    />
                  )}

                  {tab === 2 && (
                    <ReviewPanel
                      review={reviewsByPair[selectedPair.pair]?.review || {}}
                      onSave={(review) => setReviewsByPair(r => ({ ...r, [selectedPair.pair]: { ...(r[selectedPair.pair] || {}), review, meta: { ...(r[selectedPair.pair]?.meta || {}), updatedAt: Date.now() } } }))}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>

          <AddPairModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(p) => {
            const newPair = { ...p, createdAt: Date.now() }
            setPairs(prev => [newPair, ...prev])
            setModalOpen(false)
            setSelectedPair(newPair)
            setView('analysis')
            showToast(`${newPair.pair} added`, 'success')
          }} />

          <Toasts toasts={toasts} />
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
