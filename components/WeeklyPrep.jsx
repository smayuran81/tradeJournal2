import { useState, useEffect, useRef } from 'react'

// TODO: Move to database collection for dynamic management
const PREP_TICKERS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD',
  'NZDUSD', 'USDCHF', 'SPX500', 'NAS100', 'XAUUSD'
]

// TODO: Move to database collection for dynamic management
const PREP_QUESTIONS = [
  { id: 'q1', section: 'Technical Analysis', text: 'What is the HTF (weekly/monthly) trend direction?', type: 'text' },
  { id: 'q2', section: 'Technical Analysis', text: 'Where are the key support/resistance levels?', type: 'text' },
  { id: 'q3', section: 'Technical Analysis', text: 'Is price at a significant level (S/R, supply/demand zone)?', type: 'boolean' },
  { id: 'q4', section: 'Technical Analysis', text: 'Is price above or below the 10/20/50 EMA?', type: 'text' },
  { id: 'q5', section: 'Technical Analysis', text: 'Are there any chart patterns forming (H&S, wedge, triangle)?', type: 'text' },
  { id: 'q6', section: 'Technical Analysis', text: 'What does the LTF (4H/1H) structure look like?', type: 'text' },
  { id: 'q7', section: 'Fundamental & News', text: 'Any high-impact news events this week for this pair?', type: 'text' },
  { id: 'q8', section: 'Fundamental & News', text: 'Is there a central bank decision this week?', type: 'boolean' },
  { id: 'q9', section: 'Fundamental & News', text: 'What is the current market sentiment for this pair?', type: 'text' },
  { id: 'q10', section: 'Fundamental & News', text: 'Any geopolitical events that could impact this pair?', type: 'text' },
  { id: 'q11', section: 'Weekly Bias', text: 'What is the overall bias for this pair?', type: 'select', options: ['Bullish', 'Bearish', 'Neutral'] },
  { id: 'q12', section: 'Weekly Bias', text: 'Key notes / trade plan for the week', type: 'text' },
]

// TODO: Move to database collection for dynamic management
// Each strategy has branching questions: yes/no points to next question id or 'QUALIFIED'/'NOT_QUALIFIED'
const STRATEGY_QUALIFIERS = [
  {
    id: 'daily-pullback',
    name: 'Daily Pull back',
    questions: [
      { id: 'dp-q1', text: 'Is price trending on the daily timeframe?', yes: 'dp-q2', no: 'NOT_QUALIFIED' },
      { id: 'dp-q2', text: 'Is price pulling back to 10/20 EMA or key support?', yes: 'dp-q3', no: 'NOT_QUALIFIED' },
      { id: 'dp-q3', text: 'Is there a rejection candle or reversal signal at the pullback level?', yes: 'QUALIFIED', no: 'NOT_QUALIFIED' },
    ],
  },
  {
    id: 'sr-breakout',
    name: 'Support/Resistance Breakout',
    questions: [
      { id: 'sr-q1', text: 'Is price approaching a clearly defined support or resistance level?', yes: 'sr-q2', no: 'NOT_QUALIFIED' },
      { id: 'sr-q2', text: 'Has the level been tested at least 2-3 times?', yes: 'sr-q3', no: 'NOT_QUALIFIED' },
      { id: 'sr-q3', text: 'Is there increasing momentum (volume/candle size) into the level?', yes: 'sr-q4', no: 'NOT_QUALIFIED' },
      { id: 'sr-q4', text: 'Is there a clean break and retest of the level?', yes: 'QUALIFIED', no: 'NOT_QUALIFIED' },
    ],
  },
  {
    id: 'pa-reversal',
    name: 'Price Action Reversal',
    questions: [
      { id: 'pa-q1', text: 'Is price at a key support/resistance or supply/demand zone?', yes: 'pa-q2', no: 'NOT_QUALIFIED' },
      { id: 'pa-q2', text: 'Is there a clear reversal candlestick pattern (engulfing, pin bar, morning/evening star)?', yes: 'pa-q3', no: 'NOT_QUALIFIED' },
      { id: 'pa-q3', text: 'Does the HTF trend or structure support the reversal direction?', yes: 'QUALIFIED', no: 'NOT_QUALIFIED' },
    ],
  },
  {
    id: 'fib-retracement',
    name: 'Fibonacci Retracement',
    questions: [
      { id: 'fib-q1', text: 'Is there a clear impulsive move to draw Fibonacci levels from?', yes: 'fib-q2', no: 'NOT_QUALIFIED' },
      { id: 'fib-q2', text: 'Is price retracing to the 38.2%, 50%, or 61.8% level?', yes: 'fib-q3', no: 'NOT_QUALIFIED' },
      { id: 'fib-q3', text: 'Does the fib level confluence with another support/resistance level?', yes: 'fib-q4', no: 'NOT_QUALIFIED' },
      { id: 'fib-q4', text: 'Is there a price action confirmation signal at the fib level?', yes: 'QUALIFIED', no: 'NOT_QUALIFIED' },
    ],
  },
]

function getWeekKey(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay() || 7
  const monday = new Date(date.getTime() - (day - 1) * 86400000)
  return monday.toISOString().slice(0, 10)
}

function getWeekRange(weekKey, endDate) {
  const start = new Date(weekKey + 'T00:00:00')
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date(start.getTime() + 4 * 86400000)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

function computeCompletionForTicker(tickerResponses) {
  if (!tickerResponses) return 0
  let answered = 0
  PREP_QUESTIONS.forEach(q => {
    const val = tickerResponses[q.id]
    if (q.type === 'boolean' && val !== undefined && val !== null) answered++
    else if (q.type === 'select' && val) answered++
    else if (q.type === 'text' && val && val.trim().length > 0) answered++
  })
  return answered
}

function computeStatus(responses) {
  const tickers = Object.keys(responses)
  if (tickers.length === 0) return 'in-progress'
  const allComplete = tickers.every(t => computeCompletionForTicker(responses[t]) === PREP_QUESTIONS.length)
  return allComplete ? 'completed' : 'in-progress'
}

export default function WeeklyPrep() {
  const [phase, setPhase] = useState('landing')
  const [selectedTickers, setSelectedTickers] = useState([])
  const [activeTicker, setActiveTicker] = useState(null)
  const [responses, setResponses] = useState({})
  const [pastPreps, setPastPreps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [viewingPrep, setViewingPrep] = useState(null)
  const [qualifierModalOpen, setQualifierModalOpen] = useState(false)
  const [qualifierStrategyId, setQualifierStrategyId] = useState(null)
  const [qualifierCurrentQuestionId, setQualifierCurrentQuestionId] = useState(null)
  const [qualifierAnswers, setQualifierAnswers] = useState({})
  const [prepStartDate, setPrepStartDate] = useState('')
  const [prepEndDate, setPrepEndDate] = useState('')
  const saveTimeoutRef = useRef(null)
  const currentWeekKey = prepStartDate || getWeekKey()

  useEffect(() => {
    loadPreps()
  }, [])

  async function loadPreps() {
    setLoading(true)
    try {
      const allRes = await fetch('/api/weekly-prep')
      const allData = await allRes.json()
      if (allData.success && allData.data) {
        setPastPreps(allData.data)
      }
    } catch (error) {
      console.error('Failed to load trading preps:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleStartNewPrep() {
    const monday = getWeekKey()
    const friday = new Date(monday + 'T00:00:00')
    friday.setDate(friday.getDate() + 4)
    setPrepStartDate(monday)
    setPrepEndDate(friday.toISOString().slice(0, 10))
    setSelectedTickers([])
    setResponses({})
    setPhase('select-tickers')
  }

  function handleContinuePrep(prep) {
    setSelectedTickers(prep.selectedTickers || [])
    setResponses(prep.responses || {})
    setActiveTicker((prep.selectedTickers || [])[0] || null)
    const wk = prep.weekKey
    setPrepStartDate(prep.startDate || wk)
    if (prep.endDate) {
      setPrepEndDate(prep.endDate)
    } else {
      const fri = new Date(wk + 'T00:00:00')
      fri.setDate(fri.getDate() + 4)
      setPrepEndDate(fri.toISOString().slice(0, 10))
    }
    setPhase('checklist')
  }

  async function handleDeletePrep(weekKey) {
    if (!window.confirm('Delete this prep? This cannot be undone.')) return
    try {
      await fetch(`/api/weekly-prep?weekKey=${encodeURIComponent(weekKey)}`, { method: 'DELETE' })
      await loadPreps()
    } catch (err) {
      console.error('Failed to delete prep:', err)
    }
  }

  function handleToggleTicker(ticker) {
    setSelectedTickers(s => s.includes(ticker) ? s.filter(t => t !== ticker) : [...s, ticker])
  }

  function handleSelectAll() {
    if (selectedTickers.length === PREP_TICKERS.length) {
      setSelectedTickers([])
    } else {
      setSelectedTickers([...PREP_TICKERS])
    }
  }

  function handleBeginPrep() {
    setResponses(prev => {
      const merged = { ...prev }
      selectedTickers.forEach(t => {
        if (!merged[t]) merged[t] = {}
      })
      // Remove tickers that were deselected
      Object.keys(merged).forEach(t => {
        if (!selectedTickers.includes(t)) delete merged[t]
      })
      return merged
    })
    setActiveTicker(selectedTickers[0])
    setPhase('checklist')
  }

  function updateResponse(ticker, questionId, value) {
    setResponses(prev => {
      const updated = {
        ...prev,
        [ticker]: {
          ...(prev[ticker] || {}),
          [questionId]: value
        }
      }
      scheduleAutoSave(updated)
      return updated
    })
  }

  function scheduleAutoSave(updatedResponses) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/weekly-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekKey: currentWeekKey,
            startDate: prepStartDate,
            endDate: prepEndDate,
            selectedTickers,
            responses: updatedResponses,
            status: computeStatus(updatedResponses),
          })
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 2000)
      } catch (err) {
        console.error('Auto-save failed:', err)
        setSaveStatus('error')
      }
    }, 1500)
  }

  async function handleMarkComplete() {
    try {
      await fetch('/api/weekly-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekKey: currentWeekKey,
          startDate: prepStartDate,
          endDate: prepEndDate,
          selectedTickers,
          responses,
          status: 'completed',
        })
      })
      await loadPreps()
      setPhase('landing')
    } catch (err) {
      console.error('Failed to mark complete:', err)
    }
  }

  function handleViewPastPrep(prep) {
    setViewingPrep(prep)
    setPhase('history')
  }

  function handleBackToLanding() {
    setViewingPrep(null)
    loadPreps()
    setPhase('landing')
  }

  // ── Strategy Qualifier handlers ──

  function handleOpenQualifier(strategyId) {
    const strategy = STRATEGY_QUALIFIERS.find(s => s.id === strategyId)
    if (!strategy || strategy.questions.length === 0) return
    setQualifierStrategyId(strategyId)
    setQualifierCurrentQuestionId(strategy.questions[0].id)
    setQualifierAnswers({})
    setQualifierModalOpen(true)
  }

  function handleQualifierAnswer(answer) {
    const strategy = STRATEGY_QUALIFIERS.find(s => s.id === qualifierStrategyId)
    const currentQuestion = strategy.questions.find(q => q.id === qualifierCurrentQuestionId)
    const newAnswers = { ...qualifierAnswers, [currentQuestion.id]: answer }
    setQualifierAnswers(newAnswers)
    const nextTarget = answer ? currentQuestion.yes : currentQuestion.no
    if (nextTarget === 'QUALIFIED' || nextTarget === 'NOT_QUALIFIED') {
      const result = {
        strategyId: qualifierStrategyId,
        strategyName: strategy.name,
        qualified: nextTarget === 'QUALIFIED',
        answers: newAnswers,
        completedAt: new Date().toISOString(),
      }
      saveQualifierResult(result)
      setQualifierModalOpen(false)
    } else {
      setQualifierCurrentQuestionId(nextTarget)
    }
  }

  function saveQualifierResult(result) {
    setResponses(prev => {
      const tickerData = prev[activeTicker] || {}
      const existingQualifiers = tickerData.strategyQualifier || {}
      const updated = {
        ...prev,
        [activeTicker]: {
          ...tickerData,
          strategyQualifier: {
            ...existingQualifiers,
            [result.strategyId]: result,
          }
        }
      }
      scheduleAutoSave(updated)
      return updated
    })
  }

  function handleCloseQualifier() {
    setQualifierModalOpen(false)
    setQualifierStrategyId(null)
    setQualifierCurrentQuestionId(null)
    setQualifierAnswers({})
  }

  function handleResetQualifier(strategyId) {
    setResponses(prev => {
      const tickerData = prev[activeTicker] || {}
      const existingQualifiers = { ...(tickerData.strategyQualifier || {}) }
      delete existingQualifiers[strategyId]
      const updated = {
        ...prev,
        [activeTicker]: {
          ...tickerData,
          strategyQualifier: existingQualifiers,
        }
      }
      scheduleAutoSave(updated)
      return updated
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div>Loading trading prep...</div>
      </div>
    )
  }

  // ── LANDING PHASE ──
  if (phase === 'landing') {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, color: '#1f2937' }}>Trading Prep</h1>
          <button
            onClick={handleStartNewPrep}
            style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            + New Prep
          </button>
        </div>

        {/* All Preps */}
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: 16, color: '#1f2937', fontSize: 18, fontWeight: 700 }}>All Preps</h3>
          {pastPreps.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#374151' }}>Period</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#374151' }}>Tickers</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#374151' }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#374151' }}></th>
                </tr>
              </thead>
              <tbody>
                {pastPreps.map((prep, idx) => (
                  <tr key={prep.weekKey} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: 12, fontWeight: 500 }}>{getWeekRange(prep.startDate || prep.weekKey, prep.endDate)}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{(prep.selectedTickers || []).length}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <span style={{ color: prep.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {prep.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {prep.status !== 'completed' && (
                        <button
                          onClick={() => handleContinuePrep(prep)}
                          style={{ padding: '6px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                        >
                          Continue
                        </button>
                      )}
                      <button
                        onClick={() => handleViewPastPrep(prep)}
                        style={{ padding: '6px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeletePrep(prep.weekKey)}
                        style={{ padding: '6px 16px', background: 'transparent', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>No preps yet. Click "+ New Prep" to get started.</div>
          )}
        </div>
      </div>
    )
  }

  // ── TICKER SELECTION PHASE ──
  if (phase === 'select-tickers') {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ marginBottom: 20, color: '#1f2937' }}>Select Tickers to Prep</h1>
        {/* Date picker section */}
        <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Prep Period
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Start Date</label>
              <input
                type="date"
                value={prepStartDate}
                onChange={e => setPrepStartDate(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                  fontSize: 14, fontFamily: 'inherit', color: '#1f2937',
                }}
              />
            </div>
            <div style={{ color: '#9ca3af', fontWeight: 600, marginTop: 20 }}>to</div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>End Date</label>
              <input
                type="date"
                value={prepEndDate}
                onChange={e => setPrepEndDate(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                  fontSize: 14, fontFamily: 'inherit', color: '#1f2937',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handleSelectAll}
            style={{ padding: '8px 16px', background: selectedTickers.length === PREP_TICKERS.length ? '#3b82f6' : 'transparent', color: selectedTickers.length === PREP_TICKERS.length ? 'white' : '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {selectedTickers.length === PREP_TICKERS.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {PREP_TICKERS.map(ticker => {
            const isSelected = selectedTickers.includes(ticker)
            return (
              <div
                key={ticker}
                onClick={() => handleToggleTicker(ticker)}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  background: isSelected ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 15,
                  color: isSelected ? '#1d4ed8' : '#374151',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                {ticker}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setPhase('landing')}
            style={{ padding: '10px 24px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            Back
          </button>
          <button
            onClick={handleBeginPrep}
            disabled={selectedTickers.length === 0}
            style={{
              padding: '10px 24px',
              background: selectedTickers.length > 0 ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: selectedTickers.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 14,
            }}
          >
            Begin Prep ({selectedTickers.length} tickers)
          </button>
        </div>
      </div>
    )
  }

  // ── CHECKLIST PHASE ──
  if (phase === 'checklist') {
    const tickerResponses = responses[activeTicker] || {}
    const sections = [...new Set(PREP_QUESTIONS.map(q => q.section))]

    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Left panel - ticker list */}
        <div style={{ width: 220, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb', padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tickers</div>
          {selectedTickers.map(ticker => {
            const completed = computeCompletionForTicker(responses[ticker])
            const isActive = ticker === activeTicker
            return (
              <div
                key={ticker}
                onClick={() => setActiveTicker(ticker)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: 'pointer',
                  background: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? 'white' : '#374151',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <span>{ticker}</span>
                <span style={{
                  fontSize: 11,
                  background: isActive ? 'rgba(255,255,255,0.2)' : (completed === PREP_QUESTIONS.length ? '#dcfce7' : '#f3f4f6'),
                  color: isActive ? 'white' : (completed === PREP_QUESTIONS.length ? '#16a34a' : '#6b7280'),
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 500,
                }}>
                  {completed}/{PREP_QUESTIONS.length}
                </span>
              </div>
            )
          })}

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setPhase('select-tickers')}
              style={{ padding: '10px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              + Add Tickers
            </button>
            <button
              onClick={handleMarkComplete}
              style={{ padding: '10px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Mark Complete
            </button>
            <button
              onClick={handleBackToLanding}
              style={{ padding: '10px 12px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }}
            >
              Back to Overview
            </button>
          </div>
        </div>

        {/* Right panel - questions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: 22 }}>{activeTicker}</h2>
              <span style={{ color: '#6b7280', fontSize: 14 }}>
                {computeCompletionForTicker(tickerResponses)} of {PREP_QUESTIONS.length} answered
              </span>
            </div>
            {saveStatus && (
              <span style={{
                fontSize: 13,
                color: saveStatus === 'saving' ? '#6b7280' : saveStatus === 'saved' ? '#10b981' : '#ef4444',
                fontWeight: 500,
              }}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save failed'}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, marginBottom: 28 }}>
            <div style={{
              height: '100%',
              background: '#3b82f6',
              borderRadius: 3,
              width: `${(computeCompletionForTicker(tickerResponses) / PREP_QUESTIONS.length) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>

          {sections.map(section => (
            <div key={section} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
              }}>
                {section}
              </div>

              {PREP_QUESTIONS.filter(q => q.section === section).map(question => (
                <div key={question.id} style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    {question.text}
                  </label>

                  {question.type === 'text' && (
                    <textarea
                      rows={2}
                      value={tickerResponses[question.id] || ''}
                      onChange={e => updateResponse(activeTicker, question.id, e.target.value)}
                      placeholder="Enter your analysis..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}

                  {question.type === 'boolean' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Yes', 'No'].map(opt => {
                        const val = opt === 'Yes'
                        const isSelected = tickerResponses[question.id] === val
                        return (
                          <button
                            key={opt}
                            onClick={() => updateResponse(activeTicker, question.id, val)}
                            style={{
                              padding: '8px 20px',
                              borderRadius: 6,
                              border: isSelected ? 'none' : '1px solid #d1d5db',
                              background: isSelected ? (val ? '#10b981' : '#ef4444') : 'white',
                              color: isSelected ? 'white' : '#374151',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {question.type === 'select' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {question.options.map(opt => {
                        const isSelected = tickerResponses[question.id] === opt
                        return (
                          <button
                            key={opt}
                            onClick={() => updateResponse(activeTicker, question.id, opt)}
                            style={{
                              padding: '8px 20px',
                              borderRadius: 6,
                              border: isSelected ? 'none' : '1px solid #d1d5db',
                              background: isSelected ? '#3b82f6' : 'white',
                              color: isSelected ? 'white' : '#374151',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* ── STRATEGY QUALIFIER SECTION ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: 0.5,
              marginBottom: 16, paddingBottom: 8,
              borderBottom: '1px solid #e5e7eb',
            }}>
              Strategy Qualifier
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STRATEGY_QUALIFIERS.map(strategy => {
                const result = tickerResponses.strategyQualifier?.[strategy.id]
                const hasResult = !!result
                return (
                  <div key={strategy.id} style={{
                    padding: 16, borderRadius: 10,
                    border: hasResult
                      ? (result.qualified ? '2px solid #10b981' : '2px solid #ef4444')
                      : '1px solid #e5e7eb',
                    background: hasResult
                      ? (result.qualified ? '#f0fdf4' : '#fef2f2')
                      : 'white',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      {strategy.name}
                    </div>
                    {hasResult ? (
                      <div>
                        <div style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                          fontSize: 12, fontWeight: 700,
                          background: result.qualified ? '#dcfce7' : '#fee2e2',
                          color: result.qualified ? '#16a34a' : '#dc2626',
                          marginBottom: 8,
                        }}>
                          {result.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => handleOpenQualifier(strategy.id)}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                            Re-run
                          </button>
                          <button onClick={() => handleResetQualifier(strategy.id)}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#6b7280' }}>
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => handleOpenQualifier(strategy.id)}
                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                        Run Qualifier
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── STRATEGY QUALIFIER MODAL ── */}
        {qualifierModalOpen && (() => {
          const strategy = STRATEGY_QUALIFIERS.find(s => s.id === qualifierStrategyId)
          const currentQuestion = strategy?.questions.find(q => q.id === qualifierCurrentQuestionId)
          const questionIndex = strategy?.questions.findIndex(q => q.id === qualifierCurrentQuestionId)
          const totalQuestions = strategy?.questions.length || 0
          if (!strategy || !currentQuestion) return null
          return (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: 'white', borderRadius: 16, padding: 32,
                maxWidth: 520, width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {strategy.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                      Question {questionIndex + 1} of {totalQuestions}
                    </div>
                  </div>
                  <button onClick={handleCloseQualifier}
                    style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', padding: '4px 8px' }}>
                    &#x2715;
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                  {strategy.questions.map((q, idx) => (
                    <div key={q.id} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: idx < questionIndex ? '#3b82f6' : idx === questionIndex ? '#93c5fd' : '#e5e7eb',
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 32, lineHeight: 1.5 }}>
                  {currentQuestion.text}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => handleQualifierAnswer(true)}
                    style={{ flex: 1, padding: '14px 24px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                    Yes
                  </button>
                  <button onClick={() => handleQualifierAnswer(false)}
                    style={{ flex: 1, padding: '14px 24px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                    No
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // ── HISTORY PHASE (READ-ONLY) ──
  if (phase === 'history' && viewingPrep) {
    const historyTickers = viewingPrep.selectedTickers || []
    const historyResponses = viewingPrep.responses || {}
    const activeHistoryTicker = activeTicker && historyTickers.includes(activeTicker) ? activeTicker : historyTickers[0]
    const tickerResponses = historyResponses[activeHistoryTicker] || {}
    const sections = [...new Set(PREP_QUESTIONS.map(q => q.section))]

    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Left panel */}
        <div style={{ width: 220, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb', padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {getWeekRange(viewingPrep.startDate || viewingPrep.weekKey, viewingPrep.endDate)}
          </div>
          <div style={{ fontSize: 12, color: viewingPrep.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600, marginBottom: 16 }}>
            {viewingPrep.status === 'completed' ? 'Completed' : 'In Progress'}
          </div>

          {historyTickers.map(ticker => {
            const completed = computeCompletionForTicker(historyResponses[ticker])
            const isActive = ticker === activeHistoryTicker
            return (
              <div
                key={ticker}
                onClick={() => setActiveTicker(ticker)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: 'pointer',
                  background: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? 'white' : '#374151',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{ticker}</span>
                <span style={{
                  fontSize: 11,
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  color: isActive ? 'white' : '#6b7280',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 500,
                }}>
                  {completed}/{PREP_QUESTIONS.length}
                </span>
              </div>
            )
          })}

          <button
            onClick={handleBackToLanding}
            style={{ marginTop: 20, padding: '10px 12px', width: '100%', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }}
          >
            Back to Overview
          </button>
        </div>

        {/* Right panel - read-only */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: 22, marginBottom: 24 }}>{activeHistoryTicker}</h2>

          {sections.map(section => (
            <div key={section} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
              }}>
                {section}
              </div>

              {PREP_QUESTIONS.filter(q => q.section === section).map(question => {
                const val = tickerResponses[question.id]
                return (
                  <div key={question.id} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      {question.text}
                    </div>
                    <div style={{ fontSize: 14, color: '#1f2937', background: '#f9fafb', padding: '10px 12px', borderRadius: 8, minHeight: 20 }}>
                      {question.type === 'boolean'
                        ? (val === true ? <span style={{ color: '#10b981', fontWeight: 600 }}>Yes</span>
                           : val === false ? <span style={{ color: '#ef4444', fontWeight: 600 }}>No</span>
                           : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                        : question.type === 'select'
                        ? (val ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                        : (val && val.trim() ? val : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* ── STRATEGY QUALIFIER RESULTS (READ-ONLY) ── */}
          {tickerResponses.strategyQualifier && Object.keys(tickerResponses.strategyQualifier).length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginBottom: 16, paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
              }}>
                Strategy Qualifier Results
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.values(tickerResponses.strategyQualifier).map(result => (
                  <div key={result.strategyId} style={{
                    padding: 16, borderRadius: 10,
                    border: result.qualified ? '2px solid #10b981' : '2px solid #ef4444',
                    background: result.qualified ? '#f0fdf4' : '#fef2f2',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      {result.strategyName}
                    </div>
                    <div style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      background: result.qualified ? '#dcfce7' : '#fee2e2',
                      color: result.qualified ? '#16a34a' : '#dc2626',
                    }}>
                      {result.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {STRATEGY_QUALIFIERS.find(s => s.id === result.strategyId)?.questions
                        .filter(q => result.answers[q.id] !== undefined)
                        .map(q => (
                          <div key={q.id} style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            {q.text} &mdash;{' '}
                            <span style={{ fontWeight: 600, color: result.answers[q.id] ? '#10b981' : '#ef4444' }}>
                              {result.answers[q.id] ? 'Yes' : 'No'}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
