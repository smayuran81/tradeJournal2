import { useState, useEffect, useRef } from 'react'
import prepConfig from '../data/trading-prep-config.json'

// Load config from JSON
const PREP_TICKERS = prepConfig.prepTickers
const PREP_SECTIONS = prepConfig.sections
const STRATEGY_QUALIFIERS = prepConfig.strategyQualifiers

// Get all questions flattened for completion calculation
const ALL_QUESTIONS = PREP_SECTIONS.flatMap(s => s.questions)

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
    else if (q.type === 'ema-group' && val && Object.keys(val).length > 0) {
      // Count as answered if at least one EMA has data
      const hasData = q.emas.some(ema => val[ema]?.position || val[ema]?.direction)
      if (hasData) answered++
    }
    else if (q.type === 'trend-group' && val && Object.keys(val).length > 0) {
      // Count as answered if at least one timeframe has a trend
      const hasData = q.timeframes.some(tf => val[tf])
      if (hasData) answered++
    }
    else if (q.type === 'candle-analysis' && val) {
      // Count as answered if any field has data
      if (val.candleCount || val.overlapping !== undefined || val.extendedKeltner !== undefined) answered++
    }
  })
  return answered
}

function computeStatus(responses) {
  const tickers = Object.keys(responses)
  if (tickers.length === 0) return 'in-progress'
  const allComplete = tickers.every(t => computeCompletionForTicker(responses[t]) === PREP_QUESTIONS.length)
  return allComplete ? 'completed' : 'in-progress'
}

// Calculate weekly bias based on OHLC
function calculateWeeklyBias(open, close) {
  if (!open || !close) return null
  const o = parseFloat(open)
  const c = parseFloat(close)
  if (isNaN(o) || isNaN(c)) return null
  const threshold = Math.abs(o) * 0.001 // 0.1% threshold for neutral
  if (c > o + threshold) return 'Bullish'
  if (c < o - threshold) return 'Bearish'
  return 'Neutral'
}

// Calculate monthly comparison
function calculateMonthlyComparison(currentClose, monthlyOHLC) {
  if (!currentClose || !monthlyOHLC) return null
  const current = parseFloat(currentClose)
  const { open, close, high, low } = monthlyOHLC
  if (isNaN(current)) return null

  return {
    passedOpen: open ? { passed: true, direction: current > parseFloat(open) ? 'above' : 'below' } : null,
    passedClose: close ? { passed: true, direction: current > parseFloat(close) ? 'above' : 'below' } : null,
    passedHigh: high ? current > parseFloat(high) : null,
    passedLow: low ? current < parseFloat(low) : null
  }
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

                  {question.type === 'candle-analysis' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Candles above 10 EMA */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '12px 16px', borderRadius: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#374151', minWidth: 200 }}>How many candles above 10 EMA?</span>
                        <input
                          type="number"
                          min="0"
                          value={tickerResponses[question.id]?.candleCount || ''}
                          onChange={e => {
                            const currentData = tickerResponses[question.id] || {}
                            updateResponse(activeTicker, question.id, { ...currentData, candleCount: e.target.value })
                          }}
                          placeholder="0"
                          style={{
                            width: 80, padding: '8px 12px', borderRadius: 6,
                            border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit',
                            textAlign: 'center',
                          }}
                        />
                      </div>

                      {/* Overlapping candles */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '12px 16px', borderRadius: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#374151', minWidth: 200 }}>Are they overlapping candles?</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['Yes', 'No'].map(opt => {
                            const isYes = opt === 'Yes'
                            const isSelected = tickerResponses[question.id]?.overlapping === isYes
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  const currentData = tickerResponses[question.id] || {}
                                  updateResponse(activeTicker, question.id, { ...currentData, overlapping: isYes })
                                }}
                                style={{
                                  padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                  border: isSelected ? 'none' : '1px solid #d1d5db',
                                  background: isSelected ? (isYes ? '#f59e0b' : '#6b7280') : 'white',
                                  color: isSelected ? 'white' : '#374151',
                                  cursor: 'pointer',
                                }}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Extended beyond Keltner */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '12px 16px', borderRadius: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#374151', minWidth: 200 }}>Extended beyond Keltner channel?</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['Yes', 'No'].map(opt => {
                            const isYes = opt === 'Yes'
                            const isSelected = tickerResponses[question.id]?.extendedKeltner === isYes
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  const currentData = tickerResponses[question.id] || {}
                                  updateResponse(activeTicker, question.id, { ...currentData, extendedKeltner: isYes })
                                }}
                                style={{
                                  padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                  border: isSelected ? 'none' : '1px solid #d1d5db',
                                  background: isSelected ? (isYes ? '#ef4444' : '#10b981') : 'white',
                                  color: isSelected ? 'white' : '#374151',
                                  cursor: 'pointer',
                                }}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Analysis hint */}
                      {tickerResponses[question.id] && (tickerResponses[question.id].candleCount || tickerResponses[question.id].overlapping !== undefined || tickerResponses[question.id].extendedKeltner !== undefined) && (() => {
                        const data = tickerResponses[question.id]
                        const count = parseInt(data.candleCount) || 0
                        const isHealthy = count >= 3 && count <= 8 && !data.overlapping && !data.extendedKeltner
                        const isOverextended = data.extendedKeltner === true || count > 10

                        return (
                          <div style={{
                            marginTop: 4, padding: '8px 14px', borderRadius: 8, fontSize: 13,
                            background: isHealthy ? '#dcfce7' : isOverextended ? '#fee2e2' : '#fef3c7',
                            color: isHealthy ? '#16a34a' : isOverextended ? '#dc2626' : '#d97706',
                          }}>
                            <span style={{ fontWeight: 600 }}>
                              {isHealthy ? '✓ Healthy trend structure' : isOverextended ? '⚠ Overextended - caution' : '• Consolidating or mixed signals'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {question.type === 'trend-group' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {question.timeframes.map(tf => {
                        const tfValue = tickerResponses[question.id]?.[tf]
                        return (
                          <div key={tf} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '10px 16px', borderRadius: 8 }}>
                            <div style={{ width: 80, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                              {tf}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {question.options.map(opt => {
                                const isSelected = tfValue === opt
                                const bgColor = opt === 'Bullish' ? '#10b981' : opt === 'Bearish' ? '#ef4444' : '#f59e0b'
                                return (
                                  <button
                                    key={opt}
                                    onClick={() => {
                                      const currentData = tickerResponses[question.id] || {}
                                      const updated = { ...currentData, [tf]: opt }
                                      updateResponse(activeTicker, question.id, updated)
                                    }}
                                    style={{
                                      padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                      border: isSelected ? 'none' : '1px solid #d1d5db',
                                      background: isSelected ? bgColor : 'white',
                                      color: isSelected ? 'white' : '#374151',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {/* Trend Alignment Summary */}
                      {tickerResponses[question.id] && Object.keys(tickerResponses[question.id]).length > 0 && (() => {
                        const trendData = tickerResponses[question.id]
                        const allBullish = question.timeframes.every(tf => trendData[tf] === 'Bullish')
                        const allBearish = question.timeframes.every(tf => trendData[tf] === 'Bearish')
                        const bullishCount = question.timeframes.filter(tf => trendData[tf] === 'Bullish').length
                        const bearishCount = question.timeframes.filter(tf => trendData[tf] === 'Bearish').length

                        return (
                          <div style={{ marginTop: 4, padding: '8px 14px', background: allBullish ? '#dcfce7' : allBearish ? '#fee2e2' : '#e0f2fe', borderRadius: 8, fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: allBullish ? '#16a34a' : allBearish ? '#dc2626' : '#0369a1' }}>
                              {allBullish ? '✓ All timeframes Bullish' : allBearish ? '✓ All timeframes Bearish' : `${bullishCount} Bullish, ${bearishCount} Bearish`}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {question.type === 'ema-group' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {question.emas.map(ema => {
                        const emaData = tickerResponses[question.id]?.[ema] || {}
                        return (
                          <div key={ema} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f9fafb', padding: '12px 16px', borderRadius: 8 }}>
                            <div style={{ width: 70, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                              EMA {ema}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', marginRight: 4 }}>Price:</span>
                              {['Above', 'Below'].map(pos => {
                                const isSelected = emaData.position === pos
                                return (
                                  <button
                                    key={pos}
                                    onClick={() => {
                                      const currentData = tickerResponses[question.id] || {}
                                      const updated = { ...currentData, [ema]: { ...currentData[ema], position: pos } }
                                      updateResponse(activeTicker, question.id, updated)
                                    }}
                                    style={{
                                      padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                      border: isSelected ? 'none' : '1px solid #d1d5db',
                                      background: isSelected ? (pos === 'Above' ? '#10b981' : '#ef4444') : 'white',
                                      color: isSelected ? 'white' : '#374151',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {pos}
                                  </button>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', marginRight: 4 }}>Direction:</span>
                              {['Pointing Up', 'Flat', 'Pointing Down'].map(dir => {
                                const isSelected = emaData.direction === dir
                                const bgColor = dir === 'Pointing Up' ? '#10b981' : dir === 'Pointing Down' ? '#ef4444' : '#6b7280'
                                return (
                                  <button
                                    key={dir}
                                    onClick={() => {
                                      const currentData = tickerResponses[question.id] || {}
                                      const updated = { ...currentData, [ema]: { ...currentData[ema], direction: dir } }
                                      updateResponse(activeTicker, question.id, updated)
                                    }}
                                    style={{
                                      padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                      border: isSelected ? 'none' : '1px solid #d1d5db',
                                      background: isSelected ? bgColor : 'white',
                                      color: isSelected ? 'white' : '#374151',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {dir === 'Pointing Up' ? '↑ Up' : dir === 'Pointing Down' ? '↓ Down' : '→ Flat'}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {/* EMA Summary */}
                      {tickerResponses[question.id] && Object.keys(tickerResponses[question.id]).length > 0 && (() => {
                        const emaData = tickerResponses[question.id]
                        const allAbove = question.emas.every(e => emaData[e]?.position === 'Above')
                        const allBelow = question.emas.every(e => emaData[e]?.position === 'Below')
                        const allUp = question.emas.every(e => emaData[e]?.direction === 'Pointing Up')
                        const allDown = question.emas.every(e => emaData[e]?.direction === 'Pointing Down')
                        const upCount = question.emas.filter(e => emaData[e]?.direction === 'Pointing Up').length
                        const aboveCount = question.emas.filter(e => emaData[e]?.position === 'Above').length

                        return (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: '#e0f2fe', borderRadius: 8, fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>Summary: </span>
                            <span style={{ color: '#0c4a6e' }}>
                              Price {allAbove ? 'above all EMAs' : allBelow ? 'below all EMAs' : `above ${aboveCount}/${question.emas.length} EMAs`}
                              {' • '}
                              {allUp ? 'All pointing up' : allDown ? 'All pointing down' : `${upCount}/${question.emas.length} pointing up`}
                              {allAbove && allUp && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 700 }}>✓ Bullish alignment</span>}
                              {allBelow && allDown && <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 700 }}>✓ Bearish alignment</span>}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* ── WEEKLY PRICE ACTION SECTION ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: 0.5,
              marginBottom: 16, paddingBottom: 8,
              borderBottom: '1px solid #e5e7eb',
            }}>
              Weekly Price Action
            </div>

            {/* Previous Week OHLC */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Previous Week OHLC
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['open', 'high', 'low', 'close'].map(field => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4, textTransform: 'capitalize' }}>
                      {field}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tickerResponses.weeklyOHLC?.[field] || ''}
                      onChange={e => {
                        const newOHLC = { ...(tickerResponses.weeklyOHLC || {}), [field]: e.target.value }
                        updateResponse(activeTicker, 'weeklyOHLC', newOHLC)
                      }}
                      placeholder={`Enter ${field}`}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Auto-calculated Weekly Bias */}
              {tickerResponses.weeklyOHLC?.open && tickerResponses.weeklyOHLC?.close && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 13, color: '#6b7280', marginRight: 8 }}>Calculated Bias:</span>
                  {(() => {
                    const bias = calculateWeeklyBias(tickerResponses.weeklyOHLC.open, tickerResponses.weeklyOHLC.close)
                    const biasColors = { Bullish: '#10b981', Bearish: '#ef4444', Neutral: '#6b7280' }
                    const biasBg = { Bullish: '#dcfce7', Bearish: '#fee2e2', Neutral: '#f3f4f6' }
                    return bias ? (
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        background: biasBg[bias], color: biasColors[bias],
                      }}>
                        {bias}
                      </span>
                    ) : null
                  })()}
                </div>
              )}
            </div>

            {/* Weekly Candlestick Patterns (Multi-select) */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Weekly Candlestick Patterns
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WEEKLY_PATTERNS.map(pattern => {
                  const selected = (tickerResponses.weeklyPatterns || []).includes(pattern)
                  return (
                    <button
                      key={pattern}
                      onClick={() => {
                        const current = tickerResponses.weeklyPatterns || []
                        const updated = selected
                          ? current.filter(p => p !== pattern)
                          : [...current, pattern]
                        updateResponse(activeTicker, 'weeklyPatterns', updated)
                      }}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                        border: selected ? 'none' : '1px solid #d1d5db',
                        background: selected ? '#3b82f6' : 'white',
                        color: selected ? 'white' : '#374151',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {pattern}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Flag Patterns (Single-select) */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Flag/Pennant Pattern
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FLAG_PATTERNS.map(pattern => {
                  const selected = tickerResponses.flagPattern === pattern
                  return (
                    <button
                      key={pattern}
                      onClick={() => updateResponse(activeTicker, 'flagPattern', pattern)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: selected ? 'none' : '1px solid #d1d5db',
                        background: selected ? '#3b82f6' : 'white',
                        color: selected ? 'white' : '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {pattern}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Support/Resistance Zones */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Support/Resistance Zones
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'weeklySupport', label: 'Hitting Weekly Support?' },
                  { key: 'weeklyResistance', label: 'Hitting Weekly Resistance?' },
                  { key: 'monthlySupport', label: 'Hitting Monthly Support?' },
                  { key: 'monthlyResistance', label: 'Hitting Monthly Resistance?' },
                ].map(({ key, label }) => {
                  const value = tickerResponses.srZones?.[key]
                  return (
                    <div key={key} style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>{label}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['Yes', 'No'].map(opt => {
                          const isYes = opt === 'Yes'
                          const isSelected = value === isYes
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                const newSR = { ...(tickerResponses.srZones || {}), [key]: isYes }
                                updateResponse(activeTicker, 'srZones', newSR)
                              }}
                              style={{
                                padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                border: isSelected ? 'none' : '1px solid #d1d5db',
                                background: isSelected ? (isYes ? '#10b981' : '#ef4444') : 'white',
                                color: isSelected ? 'white' : '#374151',
                                cursor: 'pointer',
                              }}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Previous Month OHLC */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Previous Month OHLC
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['open', 'high', 'low', 'close'].map(field => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4, textTransform: 'capitalize' }}>
                      {field}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tickerResponses.monthlyOHLC?.[field] || ''}
                      onChange={e => {
                        const newOHLC = { ...(tickerResponses.monthlyOHLC || {}), [field]: e.target.value }
                        updateResponse(activeTicker, 'monthlyOHLC', newOHLC)
                      }}
                      placeholder={`Enter ${field}`}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Monthly Comparison Display */}
              {tickerResponses.weeklyOHLC?.close && tickerResponses.monthlyOHLC && (
                <div style={{ marginTop: 16, background: '#f9fafb', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                    Monthly Level Comparison (vs Weekly Close)
                  </div>
                  {(() => {
                    const comparison = calculateMonthlyComparison(tickerResponses.weeklyOHLC.close, tickerResponses.monthlyOHLC)
                    if (!comparison) return null
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {comparison.passedOpen && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Monthly Open: <span style={{ fontWeight: 600, color: comparison.passedOpen.direction === 'above' ? '#10b981' : '#ef4444' }}>
                              {comparison.passedOpen.direction === 'above' ? 'Above' : 'Below'}
                            </span>
                          </div>
                        )}
                        {comparison.passedClose && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Monthly Close: <span style={{ fontWeight: 600, color: comparison.passedClose.direction === 'above' ? '#10b981' : '#ef4444' }}>
                              {comparison.passedClose.direction === 'above' ? 'Above' : 'Below'}
                            </span>
                          </div>
                        )}
                        {comparison.passedHigh !== null && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Above Monthly High: <span style={{ fontWeight: 600, color: comparison.passedHigh ? '#10b981' : '#6b7280' }}>
                              {comparison.passedHigh ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {comparison.passedLow !== null && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Below Monthly Low: <span style={{ fontWeight: 600, color: comparison.passedLow ? '#ef4444' : '#6b7280' }}>
                              {comparison.passedLow ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

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
                    {question.type === 'candle-analysis' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {val && (val.candleCount || val.overlapping !== undefined || val.extendedKeltner !== undefined) ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                              <span style={{ color: '#6b7280', width: 180 }}>Candles above 10 EMA:</span>
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>{val.candleCount || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                              <span style={{ color: '#6b7280', width: 180 }}>Overlapping candles:</span>
                              <span style={{ fontWeight: 600, color: val.overlapping ? '#f59e0b' : '#6b7280' }}>
                                {val.overlapping === true ? 'Yes' : val.overlapping === false ? 'No' : '-'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                              <span style={{ color: '#6b7280', width: 180 }}>Extended beyond Keltner:</span>
                              <span style={{ fontWeight: 600, color: val.extendedKeltner ? '#ef4444' : '#10b981' }}>
                                {val.extendedKeltner === true ? 'Yes' : val.extendedKeltner === false ? 'No' : '-'}
                              </span>
                            </div>
                          </>
                        ) : <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}><span style={{ color: '#9ca3af' }}>Not answered</span></div>}
                      </div>
                    ) : question.type === 'trend-group' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {val && Object.keys(val).length > 0 ? question.timeframes.map(tf => {
                          const tfValue = val[tf]
                          const bgColor = tfValue === 'Bullish' ? '#dcfce7' : tfValue === 'Bearish' ? '#fee2e2' : tfValue === 'Choppy' ? '#fef3c7' : '#f3f4f6'
                          const textColor = tfValue === 'Bullish' ? '#16a34a' : tfValue === 'Bearish' ? '#dc2626' : tfValue === 'Choppy' ? '#d97706' : '#9ca3af'
                          return (
                            <div key={tf} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                              <span style={{ fontWeight: 600, color: '#374151', width: 70 }}>{tf}</span>
                              <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: bgColor, color: textColor }}>
                                {tfValue || 'Not set'}
                              </span>
                            </div>
                          )
                        }) : <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}><span style={{ color: '#9ca3af' }}>Not answered</span></div>}
                      </div>
                    ) : question.type === 'ema-group' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {val && Object.keys(val).length > 0 ? question.emas.map(ema => {
                          const emaData = val[ema] || {}
                          return (
                            <div key={ema} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                              <span style={{ fontWeight: 600, color: '#374151', width: 60 }}>EMA {ema}</span>
                              {emaData.position && (
                                <span style={{
                                  padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                  background: emaData.position === 'Above' ? '#dcfce7' : '#fee2e2',
                                  color: emaData.position === 'Above' ? '#16a34a' : '#dc2626',
                                }}>
                                  {emaData.position}
                                </span>
                              )}
                              {emaData.direction && (
                                <span style={{
                                  padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                  background: emaData.direction === 'Pointing Up' ? '#dcfce7' : emaData.direction === 'Pointing Down' ? '#fee2e2' : '#f3f4f6',
                                  color: emaData.direction === 'Pointing Up' ? '#16a34a' : emaData.direction === 'Pointing Down' ? '#dc2626' : '#6b7280',
                                }}>
                                  {emaData.direction === 'Pointing Up' ? '↑ Up' : emaData.direction === 'Pointing Down' ? '↓ Down' : '→ Flat'}
                                </span>
                              )}
                              {!emaData.position && !emaData.direction && <span style={{ color: '#9ca3af', fontSize: 12 }}>Not set</span>}
                            </div>
                          )
                        }) : <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}><span style={{ color: '#9ca3af' }}>Not answered</span></div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: '#1f2937', background: '#f9fafb', padding: '10px 12px', borderRadius: 8, minHeight: 20 }}>
                        {question.type === 'boolean'
                          ? (val === true ? <span style={{ color: '#10b981', fontWeight: 600 }}>Yes</span>
                             : val === false ? <span style={{ color: '#ef4444', fontWeight: 600 }}>No</span>
                             : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                          : question.type === 'select'
                          ? (val ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                          : (val && typeof val === 'string' && val.trim() ? val : <span style={{ color: '#9ca3af' }}>Not answered</span>)
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* ── WEEKLY PRICE ACTION (READ-ONLY) ── */}
          {(tickerResponses.weeklyOHLC || tickerResponses.weeklyPatterns?.length || tickerResponses.flagPattern || tickerResponses.srZones || tickerResponses.monthlyOHLC) && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginBottom: 16, paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
              }}>
                Weekly Price Action
              </div>

              {/* Weekly OHLC */}
              {tickerResponses.weeklyOHLC && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Previous Week OHLC</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {['open', 'high', 'low', 'close'].map(field => (
                      <div key={field} style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{field}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{tickerResponses.weeklyOHLC[field] || '-'}</div>
                      </div>
                    ))}
                  </div>
                  {tickerResponses.weeklyOHLC.open && tickerResponses.weeklyOHLC.close && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: '#6b7280', marginRight: 8 }}>Calculated Bias:</span>
                      {(() => {
                        const bias = calculateWeeklyBias(tickerResponses.weeklyOHLC.open, tickerResponses.weeklyOHLC.close)
                        const biasColors = { Bullish: '#10b981', Bearish: '#ef4444', Neutral: '#6b7280' }
                        const biasBg = { Bullish: '#dcfce7', Bearish: '#fee2e2', Neutral: '#f3f4f6' }
                        return bias ? (
                          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: biasBg[bias], color: biasColors[bias] }}>
                            {bias}
                          </span>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Weekly Patterns */}
              {tickerResponses.weeklyPatterns?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Weekly Patterns</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tickerResponses.weeklyPatterns.map(p => (
                      <span key={p} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#dbeafe', color: '#1d4ed8' }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Flag Pattern */}
              {tickerResponses.flagPattern && tickerResponses.flagPattern !== 'None' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Flag/Pennant Pattern</div>
                  <span style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151' }}>{tickerResponses.flagPattern}</span>
                </div>
              )}

              {/* S/R Zones */}
              {tickerResponses.srZones && Object.keys(tickerResponses.srZones).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Support/Resistance Zones</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'weeklySupport', label: 'Weekly Support' },
                      { key: 'weeklyResistance', label: 'Weekly Resistance' },
                      { key: 'monthlySupport', label: 'Monthly Support' },
                      { key: 'monthlyResistance', label: 'Monthly Resistance' },
                    ].filter(({ key }) => tickerResponses.srZones[key] !== undefined).map(({ key, label }) => (
                      <div key={key} style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                        <span style={{ fontWeight: 600, color: tickerResponses.srZones[key] ? '#10b981' : '#ef4444' }}>
                          {tickerResponses.srZones[key] ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly OHLC */}
              {tickerResponses.monthlyOHLC && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Previous Month OHLC</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {['open', 'high', 'low', 'close'].map(field => (
                      <div key={field} style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{field}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{tickerResponses.monthlyOHLC[field] || '-'}</div>
                      </div>
                    ))}
                  </div>
                  {tickerResponses.weeklyOHLC?.close && (
                    <div style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Monthly Level Comparison</div>
                      {(() => {
                        const comparison = calculateMonthlyComparison(tickerResponses.weeklyOHLC.close, tickerResponses.monthlyOHLC)
                        if (!comparison) return null
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {comparison.passedOpen && (
                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Monthly Open: <span style={{ fontWeight: 600, color: comparison.passedOpen.direction === 'above' ? '#10b981' : '#ef4444' }}>
                                  {comparison.passedOpen.direction === 'above' ? 'Above' : 'Below'}
                                </span>
                              </div>
                            )}
                            {comparison.passedClose && (
                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Monthly Close: <span style={{ fontWeight: 600, color: comparison.passedClose.direction === 'above' ? '#10b981' : '#ef4444' }}>
                                  {comparison.passedClose.direction === 'above' ? 'Above' : 'Below'}
                                </span>
                              </div>
                            )}
                            {comparison.passedHigh !== null && (
                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Above Monthly High: <span style={{ fontWeight: 600, color: comparison.passedHigh ? '#10b981' : '#6b7280' }}>
                                  {comparison.passedHigh ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                            {comparison.passedLow !== null && (
                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Below Monthly Low: <span style={{ fontWeight: 600, color: comparison.passedLow ? '#ef4444' : '#6b7280' }}>
                                  {comparison.passedLow ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
