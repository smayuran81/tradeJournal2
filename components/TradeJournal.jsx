import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { repository } from '../services/repository'
import packageJson from '../package.json'
import { MAJOR_PAIRS } from '../data/pairs'

const AgGridReact = dynamic(() => import('ag-grid-react').then(m => m?.AgGridReact || m?.default), { ssr: false, loading: () => <div>Loading grid...</div> })
import ReviewPanel from './ReviewPanel'
import ImageEditor from './ImageEditor'
import TradeAnalysis from './TradeAnalysis'
const WysiwygEditor = dynamic(async () => {
  const m = await import('./WysiwygEditor')
  return m?.default || m
}, { ssr: false })

// TradeJournal stores its own list under localStorage key `trade-journal`
export default function TradeJournal() {
  const [trades, setTrades] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [tradingStrategies, setTradingStrategies] = useState([])
  const [strategyRuleCards, setStrategyRuleCards] = useState([])
  const fileInputRef = useRef()

  useEffect(() => {
    loadTrades()
    loadTradingStrategies()
  }, [])

  async function loadTrades() {
    try {
      const tradesFromDb = await repository.getTrades()
      console.log('Loaded trades from DB:', tradesFromDb)
      setTrades(tradesFromDb)
    } catch (error) {
      console.error('Failed to load trades:', error)
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('trade-journal')
        const parsed = raw ? JSON.parse(raw) : []
        setTrades(parsed)
      } catch (e) { setTrades([]) }
    }
  }

  async function loadTradingStrategies() {
    try {
      const response = await fetch('/api/trading-strategies')
      const strategies = await response.json()
      setTradingStrategies(strategies)
    } catch (error) {
      console.error('Failed to load trading strategies:', error)
    }
  }

  async function loadStrategyRuleCards(strategyName) {
    if (!strategyName) {
      setStrategyRuleCards([])
      return
    }
    try {
      const strategiesResponse = await fetch('/api/strategies')
      const strategies = await strategiesResponse.json()
      const strategy = strategies.find(s => s.name === strategyName)
      if (!strategy || !strategy.sections) {
        setStrategyRuleCards([])
        return
      }
      const cards = []
      strategy.sections.forEach(section => {
        if (section.subsections) {
          section.subsections.forEach(subsection => {
            if (subsection.checkList && subsection.checkList.length > 0) {
              cards.push({
                _id: subsection.id,
                title: subsection.name,
                checklist: subsection.checkList
              })
            }
          })
        }
      })
      console.log('Loaded checklist cards:', cards)
      setStrategyRuleCards(cards)
    } catch (error) {
      console.error('Failed to load strategy checklists:', error)
      setStrategyRuleCards([])
    }
  }

  // Removed localStorage sync - using MongoDB now

  // helper: determine pip unit (common default heuristics)
  function pipUnitFor(pair = '', entryPrice) {
    if (!entryPrice) return 0.0001
    const p = (pair || '').toUpperCase()
    const ep = Number(entryPrice) || 0
    if (p.includes('JPY')) return 0.01
    // heuristic: very large prices often use 2-decimal pips (e.g., indices), treat >=100 as 0.01
    if (ep >= 100) return 0.01
    return 0.0001
  }

  // compute pips between two prices using determined pip unit
  function computePips(pair, entry, price) {
    const e = Number(entry)
    const p = Number(price)
    if (!e || !p) return ''
    const unit = pipUnitFor(pair, e)
    const raw = (p - e) / unit
    // round to 1 decimal for readability
    return Math.round(raw * 10) / 10
  }

  // Calculate journal completeness
  function calculateCompleteness(trade) {
    const fields = [
      trade.reasonForEntry, trade.riskRewardRatio, trade.stopLossReason, trade.takeProfitReason,
      trade.actualEntryPrice, trade.rrAchieved, trade.pipsGainedLost, trade.whatWentWell, 
      trade.whatWentWrong, trade.moodBeforeTrade, trade.thingToImprove
    ]
    const completed = fields.filter(f => f && f.toString().trim()).length
    return Math.round((completed / fields.length) * 100)
  }

  // grid rows come directly from trades, with computed columns
  const rowData = useMemo(() => trades.map(t => {
    const entry = t.entryPrice ? Number(t.entryPrice) : null
    const exit = t.exitPrice ? Number(t.exitPrice) : null
    const sl = t.stopLoss ? Number(t.stopLoss) : null
    const tp = t.takeProfit ? Number(t.takeProfit) : null
    
    let result = t.result || 'Open'
    // Only auto-compute if no result is set and we have both entry and exit
    if (!t.result && exit && entry) {
      const profit = exit - entry
      result = profit > 0 ? 'Win' : (profit < 0 ? 'Loss' : 'Breakeven')
    }
    
    // Calculate RR
    let pipsRR = ''
    let profitLoss = 0
    if (entry && exit) {
      const pips = computePips(t.pair, entry, exit)
      if (result === 'Breakeven') {
        pipsRR = '0'
      } else if (t.rrAchieved) {
        pipsRR = t.rrAchieved
      } else {
        pipsRR = ''
      }
      
      // Calculate P&L from exits or simple calculation
      if (t.exits && t.exits.length > 0) {
        profitLoss = t.exits.reduce((sum, exit) => sum + (Number(exit.profitLoss) || 0), 0)
      } else {
        // Simple P&L calculation based on entry/exit and lots
        const lots = Number(t.lots) || 0.1
        const pipValue = t.pair && t.pair.includes('JPY') ? 1 : 10 // Simplified pip value
        profitLoss = pips * pipValue * lots
      }
    }
    console.log('Trade result mapping:', { id: t.id, dbResult: t.result, computedResult: result })
    
    const tradeDate = t.date ? new Date(t.date).toLocaleDateString() : ''
    
    return {
      id: t.id,
      tradeDate,
      pair: t.pair,
      direction: t.direction || '',
      timeframe: t.timeframe || '',
      setup: t.strategy || '',
      entryPrice: t.entryPrice || '',
      stopLoss: t.stopLoss || '',
      takeProfit: t.takeProfit || '',
      exitPrice: t.exitPrice || '',
      result,
      pipsRR,
      profitLoss: profitLoss.toFixed(2),
      lots: t.lots || '',
      raw: t
    }
  }), [trades])

  const defaultColDef = useMemo(() => ({ 
    sortable: true, 
    filter: true, 
    resizable: true, 
    minWidth: 80,
    editable: false
  }), [])

  const columnDefs = useMemo(() => [
    { field: 'tradeDate', headerName: 'Date', minWidth: 90, flex: 1, editable: false },
    { field: 'pair', headerName: 'Pair', minWidth: 80, flex: 1, editable: true },
    { 
      field: 'direction', 
      headerName: 'Trade Direction', 
      minWidth: 85, 
      flex: 1, 
      editable: true, 
      cellEditor: 'agSelectCellEditor', 
      cellEditorParams: { values: ['Long', 'Short'] },
      cellRenderer: params => {
        const value = params.value || ''
        const symbol = value === 'Long' ? '↗' : value === 'Short' ? '↘' : ''
        return `${symbol} ${value}`
      },
      cellStyle: params => {
        const value = params.value
        return {
          color: value === 'Long' ? '#00C48C' : value === 'Short' ? '#F95F62' : '#1E1F26',
          fontWeight: '600'
        }
      }
    },
    { field: 'timeframe', headerName: 'Timeframe', minWidth: 90, flex: 1, editable: true },
    { field: 'setup', headerName: 'Setup', minWidth: 100, flex: 1.2, editable: true },
    { field: 'entryPrice', headerName: 'Entry Price', minWidth: 100, flex: 1.1, editable: true, valueParser: params => Number(params.newValue) || params.oldValue },
    { field: 'stopLoss', headerName: 'Stop Loss', minWidth: 60, flex: 0.8, editable: true, valueParser: params => Number(params.newValue) || params.oldValue, headerTooltip: 'Stop loss price level' },
    { field: 'takeProfit', headerName: 'Take Profit', minWidth: 60, flex: 0.8, editable: true, valueParser: params => Number(params.newValue) || params.oldValue, headerTooltip: 'Take profit price level' },
    { field: 'exitPrice', headerName: 'Exit Price', minWidth: 100, flex: 1.1, editable: true, valueParser: params => Number(params.newValue) || params.oldValue },
    { 
      field: 'result', 
      headerName: 'Trade Result', 
      minWidth: 80, 
      flex: 1, 
      editable: true, 
      cellEditor: 'agSelectCellEditor', 
      cellEditorParams: { values: ['Open', 'Win', 'Loss', 'Breakeven'] },
      valueFormatter: params => {
        const value = params.value || ''
        const icon = value === 'Win' ? '▲' : value === 'Loss' ? '▼' : value === 'Breakeven' ? '●' : '○'
        return `${icon} ${value}`
      },
      cellClass: params => {
        const value = params.value
        return value === 'Win' ? 'result-win' : value === 'Loss' ? 'result-loss' : value === 'Breakeven' ? 'result-breakeven' : 'result-open'
      }
    },
    { field: 'pipsRR', headerName: 'RR', minWidth: 60, flex: 0.8, editable: false, valueFormatter: params => params.value ? `${params.value}R` : '', cellStyle: params => ({ color: params.value && Number(params.value) < 0 ? '#F95F62' : '#1E1F26', fontWeight: '600' }) },
    { field: 'profitLoss', headerName: 'P&L ($)', minWidth: 80, flex: 0.8, editable: false, cellStyle: params => ({ color: params.value > 0 ? '#00C48C' : params.value < 0 ? '#F95F62' : '#1E1F26', fontWeight: '600' }) },
    { field: 'lots', headerName: 'Lots', minWidth: 60, flex: 0.6, editable: true }
  ], [])

  const onSelectionChanged = useCallback((params) => {
    const sel = params.api.getSelectedRows()[0] || null
    const newSelected = sel ? sel.raw : null
    
    // Check if trade has meaningful analysis data
    const hasAnalysisData = newSelected && (
      newSelected.reasonForEntry || newSelected.whatWentWell || newSelected.whatWentWrong ||
      newSelected.moodBeforeTrade || newSelected.thingToImprove || newSelected.rrAchieved ||
      newSelected.notes || newSelected.strategy || newSelected.actualEntryPrice ||
      (newSelected.images && newSelected.images.length > 0)
    )
    
    setSelected(newSelected)
    
    // Only open sidebar if there's meaningful data to show
    setLeftWidth(prev => {
      if (hasAnalysisData && prev === 100) {
        return 60
      } else if (!hasAnalysisData && prev < 100) {
        return 100
      }
      return prev
    })
  }, [])

  const getRowClass = useCallback((params) => {
    return 'trading-row'
  }, [])

  const onCellValueChanged = useCallback(async (params) => {
    const { data, colDef, newValue, oldValue } = params
    if (newValue === oldValue) return
    
    try {
      console.log('Cell changed:', colDef.field, 'from', oldValue, 'to', newValue)
      console.log('Trade ID:', data.raw?.id)
      console.log('Full trade object:', data.raw)
      
      // Create update object with only changed field
      const updates = {}
      if (colDef.field === 'pair') updates.pair = newValue
      if (colDef.field === 'direction') updates.direction = newValue
      if (colDef.field === 'timeframe') updates.timeframe = newValue
      if (colDef.field === 'setup') updates.strategy = newValue
      if (colDef.field === 'entryPrice') updates.entryPrice = newValue.toString()
      if (colDef.field === 'stopLoss') updates.stopLoss = newValue.toString()
      if (colDef.field === 'takeProfit') updates.takeProfit = newValue.toString()
      if (colDef.field === 'exitPrice') updates.exitPrice = newValue.toString()
      if (colDef.field === 'result') updates.result = newValue
      
      console.log('Sending updates:', updates)
      
      // Save to database
      await repository.updateTrade(data.raw.id, updates)
      
      // Update local state
      setTrades(prev => prev.map(t => t.id === data.raw.id ? { ...t, ...updates } : t))
      
      console.log('Trade updated successfully')
    } catch (error) {
      console.error('Failed to update trade - Full error:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      // Revert the change
      params.node.setDataValue(colDef.field, oldValue)
      alert(`Failed to update trade: ${error.message}`)
    }
  }, [])

  // Create new trade entry (modal-driven)
  const [creating, setCreating] = useState({ 
    pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', images: [], 
    entryTime: '', exitTime: '', timeframe: '', direction: '', positionSize: '', broker: '', lots: '', exits: [],
    strategy: '', trigger: '', trendDirection: '', htfBias: '', supportResistance: '', volatility: '',
    reasonForEntry: '', riskRewardRatio: '', stopLossReason: '', takeProfitReason: '', alignedWithPlan: '',
    criteriaCheck1: false, criteriaCheck2: false, criteriaCheck3: false, criteriaCheck4: false, criteriaCheck5: false,
    strategyChecklist: {},
    actualEntryPrice: '', actualStopLoss: '', actualTakeProfit: '', slippage: '', followedPlan: 'Yes', entryTiming: 'On Time', fomoEntry: 'No',
    rrAchieved: '', pipsGainedLost: '', profitLossAmount: '', timeInTrade: '',
    whatWentWell: '', whatWentWrong: '', exitAccordingToPlan: 'Yes', earlyExitEmotions: 'No', movedStopTooSoon: 'No', heldTooLong: 'No', marketBehaviorAlignment: 'Yes', wouldTakeAgain: 'Yes', emotionalFactors: [],
    moodBeforeTrade: '', confidenceLevel: '5', distractionLevel: 'Low', emotionalTriggers: '',
    thingToImprove: '', followedRules: 'Yes', planUpdateRequired: 'No', mistakePatterns: ''
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [modalPos, setModalPos] = useState({ x: 120, y: 80 })
  const [dragging, setDragging] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const dragOffset = useRef({ x: 0, y: 0 })

  async function createTrade() {
    // Validation
    if (!creating.pair) {
      alert('Please select a currency pair')
      return
    }
    if (!creating.entryPrice) {
      alert('Entry price is required')
      return
    }
    if (!creating.exitPrice) {
      alert('Exit price is required')
      return
    }
    if (!creating.stopLoss) {
      alert('Stop loss is required')
      return
    }
    if (!creating.takeProfit) {
      alert('Take profit is required')
      return
    }
    
    const dateIso = creating.date ? new Date(creating.date).toISOString() : new Date().toISOString()
    // determine result if not explicitly set
    let computedResult = creating.result || 'Open'
    try {
      const e = Number(creating.entryPrice)
      const ex = Number(creating.exitPrice)
      if (!creating.result && e && ex) {
        const profit = ex - e
        computedResult = profit > 0 ? 'Win' : (profit < 0 ? 'Loss' : 'Breakeven')
      }
    } catch (err) {}

    const t = {
      id: editingTrade ? editingTrade.id : Date.now().toString(),
      pair: creating.pair || 'UNKN',
      entryPrice: creating.entryPrice || '',
      exitPrice: creating.exitPrice || '',
      stopLoss: creating.stopLoss || '',
      takeProfit: creating.takeProfit || '',
      notes: creating.notes || '',
      entryTime: creating.entryTime || '',
      exitTime: creating.exitTime || '',
      timeframe: creating.timeframe || '',
      direction: creating.direction || '',
      positionSize: creating.positionSize || '',
      broker: creating.broker || '',
      lots: creating.lots || '',
      exits: creating.exits || [],
      strategy: creating.strategy || '',
      trigger: creating.trigger || '',
      trendDirection: creating.trendDirection || '',
      htfBias: creating.htfBias || '',
      supportResistance: creating.supportResistance || '',
      volatility: creating.volatility || '',
      reasonForEntry: creating.reasonForEntry || '',
      riskRewardRatio: creating.riskRewardRatio || '',
      stopLossReason: creating.stopLossReason || '',
      takeProfitReason: creating.takeProfitReason || '',
      alignedWithPlan: creating.alignedWithPlan || '',
      criteriaCheck1: creating.criteriaCheck1|| false,
      criteriaCheck2: creating.criteriaCheck2 || false,
      criteriaCheck3: creating.criteriaCheck3 || false,
      criteriaCheck4: creating.criteriaCheck4 || false,
      criteriaCheck5: creating.criteriaCheck5 || false,
      actualEntryPrice: creating.actualEntryPrice || '',
      actualStopLoss: creating.actualStopLoss || '',
      actualTakeProfit: creating.actualTakeProfit || '',
      slippage: creating.slippage || '',
      followedPlan: creating.followedPlan || 'Yes',
      entryTiming: creating.entryTiming || 'On Time',
      fomoEntry: creating.fomoEntry || 'No',
      rrAchieved: creating.rrAchieved || '',
      pipsGainedLost: creating.pipsGainedLost || '',
      profitLossAmount: creating.profitLossAmount || '',
      timeInTrade: creating.timeInTrade || '',
      whatWentWell: creating.whatWentWell || '',
      whatWentWrong: creating.whatWentWrong || '',
      exitAccordingToPlan: creating.exitAccordingToPlan || 'Yes',
      earlyExitEmotions: creating.earlyExitEmotions || 'No',
      movedStopTooSoon: creating.movedStopTooSoon || 'No',
      heldTooLong: creating.heldTooLong || 'No',
      marketBehaviorAlignment: creating.marketBehaviorAlignment || 'Yes',
      wouldTakeAgain: creating.wouldTakeAgain || 'Yes',
      emotionalFactors: creating.emotionalFactors || [],
      moodBeforeTrade: creating.moodBeforeTrade || '',
      confidenceLevel: creating.confidenceLevel || '5',
      distractionLevel: creating.distractionLevel || 'Low',
      emotionalTriggers: creating.emotionalTriggers || '',
      thingToImprove: creating.thingToImprove || '',
      followedRules: creating.followedRules || 'Yes',
      planUpdateRequired: creating.planUpdateRequired || 'No',
      mistakePatterns: creating.mistakePatterns || '',
      strategyChecklist: creating.strategyChecklist || {},
      status: 'open',
      result: computedResult,
      date: dateIso
    }
    
    // Save to MongoDB via repository
    try {
      if (editingTrade) {
        console.log('Updating trade with comprehensive data:', t)
        await repository.updateTrade(editingTrade.id, t)
      } else {
        console.log('Creating new trade with comprehensive data:', t)
        await repository.saveTrade(t)
      }
      // Reload trades from database to get the latest data
      await loadTrades()
      setCreating({ pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', date: '', result: 'Open', entryTime: '', exitTime: '', timeframe: '', direction: '', positionSize: '', broker: '', strategy: '', trigger: '', trendDirection: '', htfBias: '', supportResistance: '', volatility: '', reasonForEntry: '', riskRewardRatio: '', stopLossReason: '', takeProfitReason: '', alignedWithPlan: '', criteriaCheck1: false, criteriaCheck2: false, criteriaCheck3: false, criteriaCheck4: false, criteriaCheck5: false, strategyChecklist: {}, actualEntryPrice: '', actualStopLoss: '', actualTakeProfit: '', slippage: '', followedPlan: 'Yes', entryTiming: 'On Time', fomoEntry: 'No', rrAchieved: '', pipsGainedLost: '', profitLossAmount: '', timeInTrade: '', whatWentWell: '', whatWentWrong: '', exitAccordingToPlan: 'Yes', earlyExitEmotions: 'No', movedStopTooSoon: 'No', heldTooLong: 'No', marketBehaviorAlignment: 'Yes', wouldTakeAgain: 'Yes', emotionalFactors: [], moodBeforeTrade: '', confidenceLevel: '5', distractionLevel: 'Low', emotionalTriggers: '', thingToImprove: '', followedRules: 'Yes', planUpdateRequired: 'No', mistakePatterns: '' })
      setEditingTrade(null)
      setSelected(t)
      setModalOpen(false)
      
      // Re-select the row in the grid after modal closes
      setTimeout(() => {
        if (gridRef.current && gridRef.current.api) {
          gridRef.current.api.forEachNode(node => {
            if (node.data.raw.id === t.id) {
              node.setSelected(true)
            }
          })
        }
      }, 100)
    } catch (error) {
      console.error('Failed to save trade:', error)
      alert('Failed to save trade. Please try again.')
    }
  }

  // Drag handlers for modal
  function startDrag(e) {
    setDragging(true)
    const rectX = modalPos.x
    const rectY = modalPos.y
    dragOffset.current = { x: e.clientX - rectX, y: e.clientY - rectY }
    e.preventDefault()
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging) return
      setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    function onUp() { setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, modalPos])

  async function handleAddImages(files) {
    if (!selected) return
    setUploadingImages(true)
    try {
      const uploadPromises = files.map(async (file) => {
        const reader = new FileReader()
        return new Promise((resolve) => {
          reader.onload = async () => {
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: reader.result,
                filename: `trade-${selected.id}-${Date.now()}-${file.name}`
              })
            })
            const result = await response.json()
            if (!result.success) {
              console.error('Upload failed:', result.error)
              alert(`Upload failed: ${result.error}`)
            }
            resolve(result.success ? result.url : null)
          }
          reader.readAsDataURL(file)
        })
      })
      
      const imageUrls = (await Promise.all(uploadPromises)).filter(Boolean)
      const updatedImages = [...(selected.images || []), ...imageUrls]
      
      // Update database
      await repository.updateTrade(selected.id, { images: updatedImages })
      
      // Update local state
      setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, images: updatedImages } : t))
      setSelected(s => ({ ...(s || {}), images: updatedImages }))
    } catch (error) {
      console.error('Failed to upload images:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploadingImages(false)
    }
  }

  // modal image handlers (for images added during creation)
  async function onModalFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const reads = files.map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
    }))
    const data = await Promise.all(reads)
    setCreating(c => ({ ...c, images: [...(c.images || []), ...data] }))
    e.target.value = ''
  }

  function removeModalImage(idx) {
    setCreating(c => ({ ...c, images: (c.images || []).filter((_, i) => i !== idx) }))
  }


  async function removeImage(idx) {
    if (!selected) return
    const updatedImages = (selected.images || []).filter((_, i) => i !== idx)
    
    // Update database
    await repository.updateTrade(selected.id, { images: updatedImages })
    
    // Update local state
    setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, images: updatedImages } : t))
    setSelected(s => ({ ...(s || {}), images: updatedImages }))
    
    // Adjust current image index if needed
    if (currentImageIndex >= updatedImages.length && updatedImages.length > 0) {
      setCurrentImageIndex(updatedImages.length - 1)
    } else if (updatedImages.length === 0) {
      setCurrentImageIndex(0)
    }
  }

  async function saveReview(payload) {
    if (!selected) return
    try {
      const updates = { 
        review: payload, 
        status: 'closed', 
        updatedAt: new Date()
      }
      console.log('TradeJournal: Saving review for trade ID:', selected.id)
      console.log('TradeJournal: Review payload:', payload)
      console.log('TradeJournal: Updates object:', updates)
      
      await repository.updateTrade(selected.id, updates)
      
      console.log('TradeJournal: Review saved successfully')
      
      // Update local state immediately
      const updatedTrade = {...selected, ...updates}
      setTrades(prev => prev.map(t => t.id === selected.id ? updatedTrade : t))
      setSelected(updatedTrade)
    } catch (error) {
      console.error('TradeJournal: Failed to save review - Full error:', error)
      console.error('TradeJournal: Error message:', error.message)
      console.error('TradeJournal: Error stack:', error.stack)
      alert(`Failed to save review: ${error.message}`)
    }
  }

  async function deleteTrade() {
    if (!selected) return
    
    const confirmed = window.confirm(`Are you sure you want to delete the trade for ${selected.pair}?\n\nThis action cannot be undone.`)
    if (!confirmed) return
    
    try {
      console.log('Deleting trade:', selected.id)
      await repository.deleteTrade(selected.id)
      // Remove from local state
      setTrades(prev => prev.filter(t => t.id !== selected.id))
      setSelected(null)
      console.log('Trade deleted successfully')
    } catch (error) {
      console.error('Failed to delete trade:', error)
      alert('Failed to delete trade. Please try again.')
    }
  }

  // small helper to wire file input
  function onFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length) handleAddImages(files)
    e.target.value = ''
  }

  const [leftWidth, setLeftWidth] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageOverlay, setImageOverlay] = useState(false)
  const [editingImage, setEditingImage] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobilePanel, setShowMobilePanel] = useState('trades')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const gridRef = useRef()

  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.max(20, Math.min(80, newWidth)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setLeftWidth(100)
      } else {
        setLeftWidth(80)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function saveEditedImage(newImageUrl) {
    if (!selected) return
    const updatedImages = [...(selected.images || [])]
    updatedImages[currentImageIndex] = newImageUrl
    
    // Update database
    await repository.updateTrade(selected.id, { images: updatedImages })
    
    // Update local state
    setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, images: updatedImages } : t))
    setSelected(s => ({ ...(s || {}), images: updatedImages }))
    
    setEditingImage(null)
  }

  return (
    <div ref={containerRef} style={{display:'flex',height:'100%',position:'relative',margin:0,padding:0,flexDirection:isMobile ? 'column' : 'row'}}>
      {isMobile && (
        <div style={{display:'flex',gap:8,padding:8,background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
          <button 
            onClick={() => setShowMobilePanel('trades')}
            style={{padding:'6px 12px',background:showMobilePanel === 'trades' ? '#3182ce' : 'transparent',color:showMobilePanel === 'trades' ? '#fff' : '#000',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}
          >
            Trades
          </button>
          <button 
            onClick={() => setShowMobilePanel('review')}
            style={{padding:'6px 12px',background:showMobilePanel === 'review' ? '#3182ce' : 'transparent',color:showMobilePanel === 'review' ? '#fff' : '#000',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}
          >
            Review & Images
          </button>
        </div>
      )}
      <div style={{width:isMobile ? '100%' : selected ? `${leftWidth}%` : '100%',display:isMobile && showMobilePanel !== 'trades' ? 'none' : 'flex',flexDirection:'column',gap:16,margin:0,padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,background:'#FBFBFD',padding:20,borderRadius:8,border:'1px solid #E5E7EC'}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:32,height:32,background:'linear-gradient(90deg, #365CFD 0%, #9173FF 100%)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:700}}>📊</div>
              <div>
                <div style={{fontWeight:700,fontSize:18,color:'#1E1F26'}}>Trading Journal</div>
                <div style={{fontSize:12,color:'#6B7280'}}>Professional Trade Management</div>
              </div>
            </div>
            <div>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{padding:'8px 12px',borderRadius:6,border:'1px solid #E5E7EC',background:'#FFFFFF',fontSize:14,color:'#1E1F26'}}>
                <option value="">All dates</option>
                {Array.from(new Set(trades.map(t => t.date ? new Date(t.date).toISOString().slice(0,10) : ''))).filter(Boolean).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              style={{padding:'8px 12px',background:darkMode ? '#1E293B' : '#F1F5F9',color:darkMode ? '#F8FAFC' : '#1E293B',border:'1px solid #E2E8F0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500}}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setModalOpen(true)} style={{padding:'10px 20px',background:'#00C48C',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:14,fontWeight:600}}>+ New Trade</button>
            {selected && (
              <button onClick={deleteTrade} style={{padding:'10px 20px',background:'#FF4D4F',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:14,fontWeight:600}}>Delete Trade</button>
            )}
          </div>
        </div>



        <div style={{flex:1,minHeight:0,background:'#FFFFFF',borderRadius:8,border:'1px solid #E5E7EC',overflow:'hidden'}}>
          <div className="grid-wrapper ag-theme-alpine" style={{height:'100%',width:'100%'}}>
            <AgGridReact
              ref={gridRef}
              rowData={selectedDate ? rowData.filter(r => r.tradeDate === selectedDate) : rowData}
              defaultColDef={defaultColDef}
              columnDefs={columnDefs}
              rowSelection="single"
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              suppressMenuHide={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              ariaLabel="Trading Journal Grid"
              onRowDoubleClicked={params => {
                const trade = params.data.raw
                setCreating({
                  pair: trade.pair || '',
                  entryPrice: trade.entryPrice || '',
                  exitPrice: trade.exitPrice || '',
                  stopLoss: trade.stopLoss || '',
                  takeProfit: trade.takeProfit || '',
                  notes: trade.notes || '',
                  date: trade.date ? new Date(trade.date).toISOString().slice(0,10) : '',
                  result: trade.result || 'Open',
                  entryTime: trade.entryTime || '',
                  exitTime: trade.exitTime || '',
                  timeframe: trade.timeframe || '',
                  direction: trade.direction || '',
                  positionSize: trade.positionSize || '',
                  broker: trade.broker || '',
                  lots: trade.lots || '',
                  exits: trade.exits || [],
                  strategy: trade.strategy || '',
                  trigger: trade.trigger || '',
                  trendDirection: trade.trendDirection || '',
                  htfBias: trade.htfBias || '',
                  supportResistance: trade.supportResistance || '',
                  volatility: trade.volatility || '',
                  reasonForEntry: trade.reasonForEntry || '',
                  riskRewardRatio: trade.riskRewardRatio || '',
                  stopLossReason: trade.stopLossReason || '',
                  takeProfitReason: trade.takeProfitReason || '',
                  alignedWithPlan: trade.alignedWithPlan || '',
                  criteriaCheck1: trade.criteriaCheck1 || false,
                  criteriaCheck2: trade.criteriaCheck2 || false,
                  criteriaCheck3: trade.criteriaCheck3 || false,
                  criteriaCheck4: trade.criteriaCheck4 || false,
                  criteriaCheck5: trade.criteriaCheck5 || false,
                  actualEntryPrice: trade.actualEntryPrice || '',
                  actualStopLoss: trade.actualStopLoss || '',
                  actualTakeProfit: trade.actualTakeProfit || '',
                  slippage: trade.slippage || '',
                  followedPlan: trade.followedPlan || 'Yes',
                  entryTiming: trade.entryTiming || 'On Time',
                  fomoEntry: trade.fomoEntry || 'No',
                  rrAchieved: trade.rrAchieved || '',
                  pipsGainedLost: trade.pipsGainedLost || '',
                  profitLossAmount: trade.profitLossAmount || '',
                  timeInTrade: trade.timeInTrade || '',
                  whatWentWell: trade.whatWentWell || '',
                  whatWentWrong: trade.whatWentWrong || '',
                  exitAccordingToPlan: trade.exitAccordingToPlan || 'Yes',
                  earlyExitEmotions: trade.earlyExitEmotions || 'No',
                  movedStopTooSoon: trade.movedStopTooSoon || 'No',
                  heldTooLong: trade.heldTooLong || 'No',
                  marketBehaviorAlignment: trade.marketBehaviorAlignment || 'Yes',
                  wouldTakeAgain: trade.wouldTakeAgain || 'Yes',
                  emotionalFactors: trade.emotionalFactors || [],
                  moodBeforeTrade: trade.moodBeforeTrade || '',
                  confidenceLevel: trade.confidenceLevel || '5',
                  distractionLevel: trade.distractionLevel || 'Low',
                  emotionalTriggers: trade.emotionalTriggers || '',
                  thingToImprove: trade.thingToImprove || '',
                  followedRules: trade.followedRules || 'Yes',
                  planUpdateRequired: trade.planUpdateRequired || 'No',
                  mistakePatterns: trade.mistakePatterns || '',
                  strategyChecklist: trade.strategyChecklist || {}
                })
                setEditingTrade(trade)
                if (trade.strategy) {
                  loadStrategyRuleCards(trade.strategy)
                }
                setModalOpen(true)
              }}
              getRowClass={getRowClass}
              animateRows={false}
              suppressReactUi={true}
              stopEditingWhenCellsLoseFocus={true}
            />
          </div>
        </div>

        <div style={{background:'#FFFFFF',borderRadius:8,padding:20,border:'1px solid #E5E7EC',marginBottom:20}}>
          {selected ? (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:32,height:32,background:'#365CFD',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14,fontWeight:700}}>📈</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:18,color:'#1E1F26'}}>{selected.pair}</div>
                    <div style={{fontSize:12,color:'#6B7280'}}>{selected.direction || 'Unknown'} • {selected.timeframe || 'No timeframe'}</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,fontWeight:600,color:calculateCompleteness(selected) < 50 ? '#FF4D4F' : calculateCompleteness(selected) < 80 ? '#FFB020' : '#00C48C'}}>Journal: {calculateCompleteness(selected)}%</div>
                  <div style={{fontSize:11,color:'#A1A7B3'}}>Double-click to edit</div>
                </div>
              </div>
              
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,padding:12,background:'#F5F6FA',borderRadius:6}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'#6B7280',marginBottom:2}}>Entry</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1E1F26'}}>{selected.entryPrice || 'N/A'}</div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'#6B7280',marginBottom:2}}>Exit</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1E1F26'}}>{selected.exitPrice || 'N/A'}</div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'#6B7280',marginBottom:2}}>Result</div>
                  <div style={{fontSize:14,fontWeight:700,color:selected.result === 'Win' ? '#00C48C' : selected.result === 'Loss' ? '#FF4D4F' : '#A1A7B3'}}>{selected.result || 'Open'}</div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'#6B7280',marginBottom:2}}>RR Achieved</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1E1F26'}}>{selected.rrAchieved || 'N/A'}</div>
                </div>
              </div>
              
              {calculateCompleteness(selected) < 70 && (
                <div style={{padding:12,background:'#FFF7E6',borderRadius:6,border:'1px solid #FFB020'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#D46B08',marginBottom:4}}>⚠️ Incomplete Journal Entry</div>
                  <div style={{fontSize:11,color:'#D46B08'}}>Add analysis data to improve your trading insights</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{padding:20,color:'#A1A7B3',textAlign:'center',fontStyle:'italic'}}>Select a trade to view details</div>
          )}
        </div>
      </div>

      {/* Drag Handle - Hidden on mobile and when no trade selected */}
      {!isMobile && selected && (
        <div 
          onMouseDown={handleMouseDown}
          style={{
            width: 8,
            cursor: 'col-resize',
            backgroundColor: isDragging ? '#2b6ef6' : '#e2e8f0',
            transition: 'background-color 0.2s',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 3,
            height: 30,
            backgroundColor: isDragging ? '#ffffff' : '#94a3b8',
            borderRadius: 2
          }} />
        </div>
      )}

      {selected && (selected.reasonForEntry || selected.whatWentWell || selected.whatWentWrong || selected.moodBeforeTrade || selected.thingToImprove || selected.rrAchieved || selected.notes || selected.strategy || selected.actualEntryPrice || (selected.images && selected.images.length > 0)) && (
        <div style={{width:isMobile ? '100%' : `${100-leftWidth}%`,display:isMobile && showMobilePanel !== 'review' ? 'none' : 'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 8px 0 8px'}}>
          <div style={{fontWeight:700}}>Analysis & Images</div>
          <button 
            onClick={() => setSelected(null)}
            style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#666',padding:'4px'}}
          >
            ✕
          </button>
        </div>
        <div style={{flex:1,overflow:'auto',padding:8}}>
          <div style={{marginBottom:12}}>
            {selected && (
              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Trade Analysis</div>
                <TradeAnalysis trade={selected} />
              </div>
            )}
          </div>
        </div>
        
        {/* Image Section at Bottom */}
        <div style={{borderTop:'1px solid #e2e8f0',padding:8,minHeight:200}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontWeight:700}}>Images</div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesChange} style={{display:'none'}} />
              <button 
                onClick={() => fileInputRef.current && fileInputRef.current.click()} 
                disabled={uploadingImages}
                style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:uploadingImages ? 'not-allowed' : 'pointer',opacity:uploadingImages ? 0.6 : 1,display:'flex',alignItems:'center',gap:6}}
              >
                {uploadingImages && (
                  <div style={{width:16,height:16,border:'2px solid #ccc',borderTop:'2px solid #3182ce',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
                )}
                {uploadingImages ? 'Uploading...' : 'Add Images'}
              </button>
            </div>
          </div>

          {selected && (selected.images || []).length > 0 ? (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <button 
                  onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                  disabled={currentImageIndex === 0}
                  style={{padding:'4px 8px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:currentImageIndex === 0 ? 'not-allowed' : 'pointer',opacity:currentImageIndex === 0 ? 0.5 : 1}}
                >
                  ←
                </button>
                <span style={{fontSize:14,color:'var(--muted)'}}>
                  {currentImageIndex + 1} of {(selected.images || []).length}
                </span>
                <button 
                  onClick={() => setCurrentImageIndex(i => Math.min((selected.images || []).length - 1, i + 1))}
                  disabled={currentImageIndex >= (selected.images || []).length - 1}
                  style={{padding:'4px 8px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:currentImageIndex >= (selected.images || []).length - 1 ? 'not-allowed' : 'pointer',opacity:currentImageIndex >= (selected.images || []).length - 1 ? 0.5 : 1}}
                >
                  →
                </button>
                <button onClick={() => setEditingImage((selected.images || [])[currentImageIndex])} style={{padding:'4px 8px',background:'#10b981',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer',marginLeft:8}}>Edit</button>
                <button onClick={() => removeImage(currentImageIndex)} style={{padding:'4px 8px',background:'#dc2626',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Delete</button>
              </div>
              <div style={{textAlign:'center'}}>
                <img 
                  src={(selected.images || [])[currentImageIndex]} 
                  alt={`img-${currentImageIndex}`} 
                  onClick={() => setImageOverlay(true)}
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src)
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'block'
                  }}
                  style={{maxWidth:'100%',maxHeight:300,objectFit:'contain',borderRadius:8,cursor:'pointer',border:'2px solid #e2e8f0'}} 
                />
                <div style={{display:'none',padding:20,color:'#dc2626',textAlign:'center',border:'2px dashed #dc2626',borderRadius:8}}>
                  ❌ Image failed to load<br/>
                  <small>URL: {(selected.images || [])[currentImageIndex]}</small>
                </div>
              </div>
            </div>
          ) : (
            <div style={{color:'var(--muted)',textAlign:'center',padding:20}}>
              {selected ? 'No images for this trade.' : 'No trade selected.'}
            </div>
          )}
        </div>
        </div>
      )}

      {/* Image Overlay */}
      {imageOverlay && selected && (selected.images || []).length > 0 && (
        <div>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:100}} onClick={() => setImageOverlay(false)} />
          <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:101}}>
            <div style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
              <img 
                src={(selected.images || [])[currentImageIndex]} 
                alt={`img-${currentImageIndex}`} 
                style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} 
              />
              <button 
                onClick={() => setImageOverlay(false)}
                style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16}}
              >
                ✕
              </button>
              {(selected.images || []).length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => Math.max(0, i - 1)) }}
                    disabled={currentImageIndex === 0}
                    style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:40,height:40,cursor:currentImageIndex === 0 ? 'not-allowed' : 'pointer',opacity:currentImageIndex === 0 ? 0.5 : 1,fontSize:18}}
                  >
                    ←
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => Math.min((selected.images || []).length - 1, i + 1)) }}
                    disabled={currentImageIndex >= (selected.images || []).length - 1}
                    style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:40,height:40,cursor:currentImageIndex >= (selected.images || []).length - 1 ? 'not-allowed' : 'pointer',opacity:currentImageIndex >= (selected.images || []).length - 1 ? 0.5 : 1,fontSize:18}}
                  >
                    →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (() => {
        const theme = darkMode ? {
          bg: '#0F1115',
          headerBg: '#0F1115',
          tabsBg: '#0F1115',
          contentBg: '#0F1115',
          footerBg: '#0F1115',
          border: '#AEB5C2',
          text: '#D8DEE9',
          subText: '#AEB5C2',
          tabActive: '#4DA3FF',
          tabText: '#AEB5C2',
          accent: '#4DA3FF',
          shadow: '0 25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(174,181,194,0.2)'
        } : {
          bg: 'linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%)',
          headerBg: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          tabsBg: '#F8FAFC',
          contentBg: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
          footerBg: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          border: '#E2E8F0',
          text: '#1E293B',
          subText: '#64748B',
          tabActive: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          tabText: '#64748B',
          accent: 'linear-gradient(45deg, #3B82F6, #1D4ED8)',
          shadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
        }
        
        return (
        <div>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:9998}} onClick={() => setModalOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            style={{position:'fixed',inset:20,background:theme.bg,borderRadius:16,boxShadow:theme.shadow,zIndex:9999,border:`1px solid ${theme.border}`,display:'flex',flexDirection:'column'}}
          >
            {/* Header */}
            <div onMouseDown={startDrag} style={{cursor:'move',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${theme.border}`,background:theme.headerBg,borderRadius:'16px 16px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:32,height:32,background:theme.accent,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:700,boxShadow:darkMode ? '0 4px 12px rgba(66,153,225,0.3)' : '0 4px 12px rgba(59,130,246,0.3)'}}>📊</div>
                <div>
                  <div style={{fontWeight:700,fontSize:18,color:theme.text,marginBottom:2}}>{editingTrade ? 'Edit Trade Entry' : 'New Trade Entry'}</div>
                  <div style={{fontSize:12,color:theme.subText}}>Professional Trading Journal</div>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{padding:'8px',background:darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',border:'none',borderRadius:'8px',cursor:'pointer',color:theme.subText,fontSize:18,transition:'all 0.2s'}}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',borderBottom:`1px solid ${theme.border}`,background:theme.tabsBg,overflowX:'auto',padding:'0 8px'}}>
              <button 
                onClick={() => setActiveTab(0)}
                style={{padding:'12px 16px',background:activeTab === 0 ? theme.tabActive : 'transparent',border:'none',borderBottom:activeTab === 0 ? `3px solid ${darkMode ? '#4299E1' : '#3B82F6'}` : '3px solid transparent',cursor:'pointer',fontWeight:activeTab === 0 ? 600 : 500,color:activeTab === 0 ? '#FFFFFF' : theme.tabText,fontSize:13,whiteSpace:'nowrap',borderRadius:'8px 8px 0 0',margin:'4px 2px 0',transition:'all 0.2s'}}
              >
                1. Trade Details
              </button>
              <button 
                onClick={() => setActiveTab(1)}
                style={{padding:'8px 12px',background:activeTab === 1 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 1 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 1 ? 600 : 400,color:activeTab === 1 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                2. Strategy
              </button>
              {creating.strategy && strategyRuleCards.length > 0 && (
                <button 
                  onClick={() => setActiveTab(10)}
                  style={{padding:'8px 12px',background:activeTab === 10 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 10 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 10 ? 600 : 400,color:activeTab === 10 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
                >
                  Strategy Checklist
                </button>
              )}
              <button 
                onClick={() => setActiveTab(2)}
                style={{padding:'8px 12px',background:activeTab === 2 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 2 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 2 ? 600 : 400,color:activeTab === 2 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                3. Prices & Levels
              </button>
              <button 
                onClick={() => setActiveTab(3)}
                style={{padding:'8px 12px',background:activeTab === 3 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 3 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 3 ? 600 : 400,color:activeTab === 3 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                4. Exit Management
              </button>
              <button 
                onClick={() => setActiveTab(4)}
                style={{padding:'8px 12px',background:activeTab === 4 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 4 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 4 ? 600 : 400,color:activeTab === 4 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                5. Notes & Analysis
              </button>
              <button 
                onClick={() => setActiveTab(5)}
                style={{padding:'8px 12px',background:activeTab === 5 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 5 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 5 ? 600 : 400,color:activeTab === 5 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                6. Execution
              </button>
              <button 
                onClick={() => setActiveTab(6)}
                style={{padding:'8px 12px',background:activeTab === 6 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 6 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 6 ? 600 : 400,color:activeTab === 6 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                7. Outcome
              </button>
              <button 
                onClick={() => setActiveTab(7)}
                style={{padding:'8px 12px',background:activeTab === 7 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 7 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 7 ? 600 : 400,color:activeTab === 7 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                8. Post-Analysis
              </button>
              <button 
                onClick={() => setActiveTab(8)}
                style={{padding:'8px 12px',background:activeTab === 8 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 8 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 8 ? 600 : 400,color:activeTab === 8 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                9. Psychology
              </button>
              <button 
                onClick={() => setActiveTab(9)}
                style={{padding:'8px 12px',background:activeTab === 9 ? 'white' : 'transparent',border:'none',borderBottom:activeTab === 9 ? '2px solid #3b82f6' : '2px solid transparent',cursor:'pointer',fontWeight:activeTab === 9 ? 600 : 400,color:activeTab === 9 ? '#3b82f6' : '#64748b',fontSize:12,whiteSpace:'nowrap'}}
              >
                10. Lessons
              </button>
            </div>

            {/* Tab Content */}
            <div style={{flex:1,padding:24,overflow:'auto',background:theme.contentBg}} onClick={e => e.stopPropagation()}>
              {activeTab === 0 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Currency Pair *</label>
                      <select value={creating.pair} onChange={e => setCreating(c => ({ ...c, pair: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Currency Pair</option>
                        {MAJOR_PAIRS.map(pair => (
                          <option key={pair} value={pair}>{pair}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Timeframe</label>
                      <select value={creating.timeframe} onChange={e => setCreating(c => ({ ...c, timeframe: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Timeframe</option>
                        <option value="M1">M1 (1 Minute)</option>
                        <option value="M5">M5 (5 Minutes)</option>
                        <option value="M15">M15 (15 Minutes)</option>
                        <option value="M30">M30 (30 Minutes)</option>
                        <option value="H1">H1 (1 Hour)</option>
                        <option value="H4">H4 (4 Hours)</option>
                        <option value="D1">D1 (Daily)</option>
                        <option value="W1">W1 (Weekly)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Direction</label>
                      <select value={creating.direction} onChange={e => setCreating(c => ({ ...c, direction: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Direction</option>
                        <option value="Long">Long (Buy)</option>
                        <option value="Short">Short (Sell)</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Position Size</label>
                      <select value={creating.positionSize} onChange={e => setCreating(c => ({ ...c, positionSize: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Position Size</option>
                        <option value="0.01">0.01 (Micro Lot)</option>
                        <option value="0.1">0.1 (Mini Lot)</option>
                        <option value="1">1.0 (Standard Lot)</option>
                        <option value="Custom">Custom Size</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Lots</label>
                      <input type="number" step="0.01" placeholder="e.g., 0.1, 1.0" value={creating.lots} onChange={e => setCreating(c => ({ ...c, lots: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Broker (Optional)</label>
                      <input type="text" placeholder="e.g., IC Markets, OANDA, etc." value={creating.broker} onChange={e => setCreating(c => ({ ...c, broker: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Entry Date & Time</label>
                      <input type="datetime-local" value={creating.entryTime} onChange={e => setCreating(c => ({ ...c, entryTime: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Exit Date & Time</label>
                      <input type="datetime-local" value={creating.exitTime} onChange={e => setCreating(c => ({ ...c, exitTime: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>


                </div>
              )}

              {activeTab === 1 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Trading Strategy</label>
                      <select value={creating.strategy} onChange={e => { console.log('Strategy selected:', e.target.value); setCreating(c => ({ ...c, strategy: e.target.value })); loadStrategyRuleCards(e.target.value) }} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Strategy</option>
                        {tradingStrategies.map(strategy => (
                          <option key={strategy._id} value={strategy.name}>{strategy.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Entry Trigger</label>
                      <select value={creating.trigger} onChange={e => setCreating(c => ({ ...c, trigger: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Trigger</option>
                        <option value="Close above 10 EMA">Close above 10 EMA</option>
                        <option value="Close below 10 EMA">Close below 10 EMA</option>
                        <option value="Bullish Engulfing">Bullish Engulfing</option>
                        <option value="Bearish Engulfing">Bearish Engulfing</option>
                        <option value="Hammer/Doji">Hammer/Doji</option>
                        <option value="Break and Retest">Break and Retest</option>
                        <option value="Support Bounce">Support Bounce</option>
                        <option value="Resistance Break">Resistance Break</option>
                        <option value="Trendline Break">Trendline Break</option>
                        <option value="Volume Spike">Volume Spike</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Trend Direction</label>
                      <select value={creating.trendDirection} onChange={e => setCreating(c => ({ ...c, trendDirection: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select Trend</option>
                        <option value="Strong Uptrend">Strong Uptrend</option>
                        <option value="Weak Uptrend">Weak Uptrend</option>
                        <option value="Strong Downtrend">Strong Downtrend</option>
                        <option value="Weak Downtrend">Weak Downtrend</option>
                        <option value="Sideways/Choppy">Sideways/Choppy</option>
                        <option value="Consolidation">Consolidation</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>HTF Bias</label>
                      <select value={creating.htfBias} onChange={e => setCreating(c => ({ ...c, htfBias: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select HTF Bias</option>
                        <option value="Bullish">Bullish</option>
                        <option value="Bearish">Bearish</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Mixed Signals">Mixed Signals</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Key Support/Resistance Levels</label>
                    <input type="text" placeholder="e.g., 1.2350 support, 1.2450 resistance" value={creating.supportResistance} onChange={e => setCreating(c => ({ ...c, supportResistance: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Volatility Conditions</label>
                    <select value={creating.volatility} onChange={e => setCreating(c => ({ ...c, volatility: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                      <option value="">Select Volatility</option>
                      <option value="Low Volatility">Low Volatility</option>
                      <option value="Normal Volatility">Normal Volatility</option>
                      <option value="High Volatility">High Volatility</option>
                      <option value="Extreme Volatility">Extreme Volatility</option>
                      <option value="News Event">News Event</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Reason for Entry</label>
                    <textarea 
                      placeholder="Why did you think this was a good trade? What made you enter?"
                      value={creating.reasonForEntry} 
                      onChange={e => setCreating(c => ({ ...c, reasonForEntry: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:80,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div style={{background:'#f8fafc',padding:16,borderRadius:8,border:'1px solid #e2e8f0'}}>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:12}}>Entry Criteria Checklist</label>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={creating.criteriaCheck1} 
                          onChange={e => setCreating(c => ({ ...c, criteriaCheck1: e.target.checked }))}
                          style={{width:16,height:16}}
                        />
                        <span>Trend confirmation (HTF alignment)</span>
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={creating.criteriaCheck2} 
                          onChange={e => setCreating(c => ({ ...c, criteriaCheck2: e.target.checked }))}
                          style={{width:16,height:16}}
                        />
                        <span>Entry signal confirmed</span>
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={creating.criteriaCheck3} 
                          onChange={e => setCreating(c => ({ ...c, criteriaCheck3: e.target.checked }))}
                          style={{width:16,height:16}}
                        />
                        <span>Risk management rules followed</span>
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={creating.criteriaCheck4} 
                          onChange={e => setCreating(c => ({ ...c, criteriaCheck4: e.target.checked }))}
                          style={{width:16,height:16}}
                        />
                        <span>Market conditions favorable</span>
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={creating.criteriaCheck5} 
                          onChange={e => setCreating(c => ({ ...c, criteriaCheck5: e.target.checked }))}
                          style={{width:16,height:16}}
                        />
                        <span>Position size appropriate</span>
                      </label>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Risk-Reward Ratio</label>
                      <input type="text" placeholder="e.g., 1:2, 1:3" value={creating.riskRewardRatio} onChange={e => setCreating(c => ({ ...c, riskRewardRatio: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Aligned with Trading Plan?</label>
                      <select value={creating.alignedWithPlan} onChange={e => setCreating(c => ({ ...c, alignedWithPlan: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="">Select</option>
                        <option value="Yes">Yes - Fully aligned</option>
                        <option value="Partially">Partially aligned</option>
                        <option value="No">No - Deviation from plan</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Stop-Loss Level & Reason</label>
                    <textarea 
                      placeholder="Why did you place SL at this level? Technical/fundamental reason?"
                      value={creating.stopLossReason} 
                      onChange={e => setCreating(c => ({ ...c, stopLossReason: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Take-Profit Level & Reason</label>
                    <textarea 
                      placeholder="Why did you set TP at this level? Target reasoning?"
                      value={creating.takeProfitReason} 
                      onChange={e => setCreating(c => ({ ...c, takeProfitReason: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Entry Price *</label>
                      <input type="number" step="any" placeholder="1.2345" value={creating.entryPrice} onChange={e => setCreating(c => ({ ...c, entryPrice: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Exit Price *</label>
                      <input type="number" step="any" placeholder="1.2400" value={creating.exitPrice} onChange={e => setCreating(c => ({ ...c, exitPrice: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Stop Loss *</label>
                      <input type="number" step="any" placeholder="1.2300" value={creating.stopLoss} onChange={e => setCreating(c => ({ ...c, stopLoss: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Take Profit *</label>
                      <input type="number" step="any" placeholder="1.2500" value={creating.takeProfit} onChange={e => setCreating(c => ({ ...c, takeProfit: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Trade Date</label>
                      <input type="date" value={creating.date || new Date().toISOString().slice(0,10)} onChange={e => setCreating(c => ({ ...c, date: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Result</label>
                      <select value={creating.result || 'Open'} onChange={e => setCreating(c => ({ ...c, result: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Open">Open</option>
                        <option value="Win">Win</option>
                        <option value="Loss">Loss</option>
                        <option value="Breakeven">Breakeven</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 4 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#f0f9ff',padding:16,borderRadius:8,border:'1px solid #0ea5e9'}}>
                    <div style={{fontWeight:600,color:'#0c4a6e',marginBottom:8}}>Exit Management</div>
                    <div style={{fontSize:13,color:'#0c4a6e'}}>Track multiple exit points and calculate total P&L</div>
                  </div>

                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>Exit Points</label>
                      <button 
                        type="button"
                        onClick={() => setCreating(c => ({ ...c, exits: [...(c.exits || []), { price: '', lots: '', profitLoss: '' }] }))}
                        style={{padding:'6px 12px',background:'#3b82f6',color:'white',border:'none',borderRadius:4,fontSize:12,cursor:'pointer'}}
                      >
                        + Add Exit
                      </button>
                    </div>
                    
                    {(creating.exits || []).length > 0 && (
                      <div style={{border:'1px solid #d1d5db',borderRadius:8,overflow:'hidden'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 60px',gap:0,background:'#f9fafb',padding:12,borderBottom:'1px solid #d1d5db',fontSize:13,fontWeight:600,color:'#374151'}}>
                          <div>Exit Price</div>
                          <div>Lots Closed</div>
                          <div>P&L ($)</div>
                          <div></div>
                        </div>
                        {(creating.exits || []).map((exit, idx) => (
                          <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 60px',gap:12,padding:12,borderBottom:idx < (creating.exits || []).length - 1 ? '1px solid #e5e7eb' : 'none'}}>
                            <input 
                              type="number" 
                              step="any" 
                              placeholder="Exit price" 
                              value={exit.price} 
                              onChange={e => {
                                const newExits = [...(creating.exits || [])]
                                newExits[idx] = { ...newExits[idx], price: e.target.value }
                                setCreating(c => ({ ...c, exits: newExits }))
                              }}
                              style={{padding:'8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                            />
                            <input 
                              type="number" 
                              step="0.01" 
                              placeholder="Lots" 
                              value={exit.lots} 
                              onChange={e => {
                                const newExits = [...(creating.exits || [])]
                                newExits[idx] = { ...newExits[idx], lots: e.target.value }
                                setCreating(c => ({ ...c, exits: newExits }))
                              }}
                              style={{padding:'8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                            />
                            <input 
                              type="number" 
                              step="any" 
                              placeholder="P&L" 
                              value={exit.profitLoss} 
                              onChange={e => {
                                const newExits = [...(creating.exits || [])]
                                newExits[idx] = { ...newExits[idx], profitLoss: e.target.value }
                                setCreating(c => ({ ...c, exits: newExits }))
                              }}
                              style={{padding:'8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const newExits = (creating.exits || []).filter((_, i) => i !== idx)
                                setCreating(c => ({ ...c, exits: newExits }))
                              }}
                              style={{padding:'6px',background:'#dc2626',color:'white',border:'none',borderRadius:4,cursor:'pointer',fontSize:12}}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div style={{padding:12,background:'#f9fafb',borderTop:'1px solid #d1d5db'}}>
                          <div style={{fontWeight:600,color:'#374151'}}>Total P&L: ${(creating.exits || []).reduce((sum, exit) => sum + (Number(exit.profitLoss) || 0), 0).toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Trade Result</label>
                    <select value={creating.result || 'Open'} onChange={e => setCreating(c => ({ ...c, result: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                      <option value="Open">Open</option>
                      <option value="Win">Win</option>
                      <option value="Loss">Loss</option>
                      <option value="Breakeven">Breakeven</option>
                    </select>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>Trade Notes & Analysis</label>
                    <WysiwygEditor value={creating.notes || ''} onChange={html => setCreating(c => ({ ...c, notes: html }))} />
                  </div>
                </div>
              )}

              {activeTab === 5 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#fef3c7',padding:16,borderRadius:8,border:'1px solid #f59e0b'}}>
                    <div style={{fontWeight:600,color:'#92400e',marginBottom:8}}>Trade Execution - What Actually Happened</div>
                    <div style={{fontSize:13,color:'#92400e'}}>Capture the reality vs your plan</div>
                  </div>
                  
                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Actual Entry Price</label>
                      <input type="number" step="any" placeholder="Actual entry price" value={creating.actualEntryPrice} onChange={e => setCreating(c => ({ ...c, actualEntryPrice: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Slippage</label>
                      <input type="text" placeholder="e.g., +2 pips, -1 pip" value={creating.slippage} onChange={e => setCreating(c => ({ ...c, slippage: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Actual Stop-Loss</label>
                      <input type="number" step="any" placeholder="Actual SL level" value={creating.actualStopLoss} onChange={e => setCreating(c => ({ ...c, actualStopLoss: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Actual Take-Profit</label>
                      <input type="number" step="any" placeholder="Actual TP level" value={creating.actualTakeProfit} onChange={e => setCreating(c => ({ ...c, actualTakeProfit: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Did you follow your plan?</label>
                      <select value={creating.followedPlan} onChange={e => setCreating(c => ({ ...c, followedPlan: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Yes">Yes - Followed exactly</option>
                        <option value="Partially">Partially followed</option>
                        <option value="No">No - Deviated from plan</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Entry Timing</label>
                      <select value={creating.entryTiming} onChange={e => setCreating(c => ({ ...c, entryTiming: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="On Time">On Time</option>
                        <option value="Early Entry">Early Entry</option>
                        <option value="Late Entry">Late Entry</option>
                        <option value="Missed Entry">Missed Entry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>FOMO Entry?</label>
                    <select value={creating.fomoEntry} onChange={e => setCreating(c => ({ ...c, fomoEntry: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                      <option value="No">No - Planned entry</option>
                      <option value="Yes">Yes - Fear of missing out</option>
                      <option value="Revenge">Revenge trading</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 6 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#dcfce7',padding:16,borderRadius:8,border:'1px solid #16a34a'}}>
                    <div style={{fontWeight:600,color:'#15803d',marginBottom:8}}>Outcome Metrics</div>
                    <div style={{fontSize:13,color:'#15803d'}}>Quantify the results</div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>RR Achieved</label>
                      <input type="text" placeholder="e.g., 1:2.5, 1:0.8" value={creating.rrAchieved} onChange={e => setCreating(c => ({ ...c, rrAchieved: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Pips Gained/Lost</label>
                      <input type="text" placeholder="e.g., +25, -15" value={creating.pipsGainedLost} onChange={e => setCreating(c => ({ ...c, pipsGainedLost: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Profit/Loss Amount</label>
                      <input type="text" placeholder="e.g., +$250, -$100" value={creating.profitLossAmount} onChange={e => setCreating(c => ({ ...c, profitLossAmount: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Time in Trade</label>
                      <input type="text" placeholder="e.g., 2h 30m, 1 day" value={creating.timeInTrade} onChange={e => setCreating(c => ({ ...c, timeInTrade: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14}} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 7 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#fef3c7',padding:16,borderRadius:8,border:'1px solid #f59e0b'}}>
                    <div style={{fontWeight:600,color:'#92400e',marginBottom:8}}>Post-Trade Analysis</div>
                    <div style={{fontSize:13,color:'#92400e'}}>This is where improvement happens</div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>What went well?</label>
                    <textarea 
                      placeholder="What aspects of this trade were executed correctly?"
                      value={creating.whatWentWell} 
                      onChange={e => setCreating(c => ({ ...c, whatWentWell: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>What went wrong?</label>
                    <textarea 
                      placeholder="What mistakes were made or could be improved?"
                      value={creating.whatWentWrong} 
                      onChange={e => setCreating(c => ({ ...c, whatWentWrong: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Exit according to plan?</label>
                      <select value={creating.exitAccordingToPlan} onChange={e => setCreating(c => ({ ...c, exitAccordingToPlan: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Yes">Yes - As planned</option>
                        <option value="No">No - Deviated</option>
                        <option value="Partial">Partial exit</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Early exit due to emotions?</label>
                      <select value={creating.earlyExitEmotions} onChange={e => setCreating(c => ({ ...c, earlyExitEmotions: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="No">No</option>
                        <option value="Yes">Yes - Fear/Panic</option>
                        <option value="Greed">Yes - Greed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Moved stop too soon?</label>
                      <select value={creating.movedStopTooSoon} onChange={e => setCreating(c => ({ ...c, movedStopTooSoon: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Held too long?</label>
                      <select value={creating.heldTooLong} onChange={e => setCreating(c => ({ ...c, heldTooLong: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Market behavior align with expectation?</label>
                      <select value={creating.marketBehaviorAlignment} onChange={e => setCreating(c => ({ ...c, marketBehaviorAlignment: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Yes">Yes - As expected</option>
                        <option value="No">No - Unexpected</option>
                        <option value="Partially">Partially</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Would you take this trade again?</label>
                      <select value={creating.wouldTakeAgain} onChange={e => setCreating(c => ({ ...c, wouldTakeAgain: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Yes">Yes - Good setup</option>
                        <option value="No">No - Poor setup</option>
                        <option value="Maybe">Maybe - Depends</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Emotional factors present</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
                      {['Fear', 'FOMO', 'Revenge', 'Hesitation', 'Overconfidence', 'Impatience'].map(emotion => (
                        <label key={emotion} style={{display:'flex',alignItems:'center',gap:6,fontSize:14,cursor:'pointer'}}>
                          <input 
                            type="checkbox" 
                            checked={(creating.emotionalFactors || []).includes(emotion)}
                            onChange={e => {
                              const factors = creating.emotionalFactors || []
                              if (e.target.checked) {
                                setCreating(c => ({ ...c, emotionalFactors: [...factors, emotion] }))
                              } else {
                                setCreating(c => ({ ...c, emotionalFactors: factors.filter(f => f !== emotion) }))
                              }
                            }}
                            style={{width:16,height:16}}
                          />
                          <span>{emotion}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 8 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#e0e7ff',padding:16,borderRadius:8,border:'1px solid #6366f1'}}>
                    <div style={{fontWeight:600,color:'#4338ca',marginBottom:8}}>Psychological State</div>
                    <div style={{fontSize:13,color:'#4338ca'}}>Document your mental condition</div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Mood before placing the trade</label>
                    <textarea 
                      placeholder="How were you feeling before entering this trade?"
                      value={creating.moodBeforeTrade} 
                      onChange={e => setCreating(c => ({ ...c, moodBeforeTrade: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Confidence Level (1-10)</label>
                      <select value={creating.confidenceLevel} onChange={e => setCreating(c => ({ ...c, confidenceLevel: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <option key={num} value={num}>{num} - {num <= 3 ? 'Low' : num <= 7 ? 'Medium' : 'High'}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Distraction Level</label>
                      <select value={creating.distractionLevel} onChange={e => setCreating(c => ({ ...c, distractionLevel: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Low">Low - Fully focused</option>
                        <option value="Medium">Medium - Some distractions</option>
                        <option value="High">High - Very distracted</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Emotional triggers</label>
                    <textarea 
                      placeholder="e.g., losing streak, big win earlier, personal stress, etc."
                      value={creating.emotionalTriggers} 
                      onChange={e => setCreating(c => ({ ...c, emotionalTriggers: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>
                </div>
              )}

              {activeTab === 10 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#dbeafe',padding:16,borderRadius:8,border:'1px solid #3b82f6'}}>
                    <div style={{fontWeight:600,color:'#1e40af',marginBottom:8}}>Strategy Checklist - {creating.strategy}</div>
                    <div style={{fontSize:13,color:'#1e40af'}}>Verify all criteria from your strategy playbook</div>
                  </div>

                  {strategyRuleCards.map(card => (
                    <div key={card._id} style={{background:'#f8fafc',padding:16,borderRadius:8,border:'1px solid #e2e8f0'}}>
                      <div style={{fontWeight:600,fontSize:14,color:'#1e293b',marginBottom:12}}>{card.title}</div>
                      {card.checklist && card.checklist.length > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:10}}>
                          {card.checklist.map(item => (
                            <label key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:8,background:'white',borderRadius:6,cursor:'pointer',border:'1px solid #e5e7eb'}}>
                              <div style={{display:'flex',gap:8,flex:1}}>
                                <span style={{fontSize:14,color:'#374151'}}>{item.text}</span>
                              </div>
                              <div style={{display:'flex',gap:8}}>
                                <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
                                  <input 
                                    type="radio" 
                                    name={`${card._id}-${item.id}`}
                                    checked={creating.strategyChecklist[`${card._id}-${item.id}`] === 'yes'}
                                    onChange={() => setCreating(c => ({ ...c, strategyChecklist: { ...c.strategyChecklist, [`${card._id}-${item.id}`]: 'yes' } }))}
                                    style={{width:16,height:16}}
                                  />
                                  <span style={{fontSize:13,color:'#059669',fontWeight:500}}>Yes</span>
                                </label>
                                <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
                                  <input 
                                    type="radio" 
                                    name={`${card._id}-${item.id}`}
                                    checked={creating.strategyChecklist[`${card._id}-${item.id}`] === 'no'}
                                    onChange={() => setCreating(c => ({ ...c, strategyChecklist: { ...c.strategyChecklist, [`${card._id}-${item.id}`]: 'no' } }))}
                                    style={{width:16,height:16}}
                                  />
                                  <span style={{fontSize:13,color:'#dc2626',fontWeight:500}}>No</span>
                                </label>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {strategyRuleCards.length === 0 && (
                    <div style={{padding:20,textAlign:'center',color:'#64748b',fontStyle:'italic'}}>
                      No checklist items found for this strategy. Add rule cards in the Strategy Playbook.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 9 && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{background:'#fef2f2',padding:16,borderRadius:8,border:'1px solid #ef4444'}}>
                    <div style={{fontWeight:600,color:'#dc2626',marginBottom:8}}>Lessons Learned</div>
                    <div style={{fontSize:13,color:'#dc2626'}}>Every trade should end with clear learning</div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>One thing to improve</label>
                    <textarea 
                      placeholder="What is the main thing you need to work on based on this trade?"
                      value={creating.thingToImprove} 
                      onChange={e => setCreating(c => ({ ...c, thingToImprove: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:80,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>

                  <div style={{display:'flex',gap:12}}>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Did I follow my plan or break rules?</label>
                      <select value={creating.followedRules} onChange={e => setCreating(c => ({ ...c, followedRules: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="Yes">Yes - Followed all rules</option>
                        <option value="Mostly">Mostly - Minor deviations</option>
                        <option value="No">No - Broke key rules</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Update required to trading plan?</label>
                      <select value={creating.planUpdateRequired} onChange={e => setCreating(c => ({ ...c, planUpdateRequired: e.target.value }))} style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,background:'white'}}>
                        <option value="No">No - Plan is good</option>
                        <option value="Yes">Yes - Need updates</option>
                        <option value="Maybe">Maybe - Consider changes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Patterns in mistakes</label>
                    <textarea 
                      placeholder="e.g., entering too early, chasing breakouts, moving stops too soon"
                      value={creating.mistakePatterns} 
                      onChange={e => setCreating(c => ({ ...c, mistakePatterns: e.target.value }))}
                      style={{padding:'10px 12px',borderRadius:'8px',border:'1px solid #d1d5db',width:'100%',fontSize:14,minHeight:60,resize:'vertical',fontFamily:'inherit'}}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{padding:'20px 24px',borderTop:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:theme.footerBg,borderRadius:'0 0 16px 16px'}}>
              <div style={{fontSize:12,color:theme.subText}}>* Required fields</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => { setCreating({ pair: '', entryPrice: '', exitPrice: '', notes: '', stopLoss:'', takeProfit:'', date:'', result:'Open', entryTime:'', exitTime:'', timeframe:'', direction:'', positionSize:'', broker:'', strategy:'', trigger:'', trendDirection:'', htfBias:'', supportResistance:'', volatility:'', reasonForEntry:'', riskRewardRatio:'', stopLossReason:'', takeProfitReason:'', alignedWithPlan:'', criteriaCheck1:false, criteriaCheck2:false, criteriaCheck3:false, criteriaCheck4:false, criteriaCheck5:false, strategyChecklist:{}, actualEntryPrice:'', actualStopLoss:'', actualTakeProfit:'', slippage:'', followedPlan:'Yes', entryTiming:'On Time', fomoEntry:'No', rrAchieved:'', pipsGainedLost:'', profitLossAmount:'', timeInTrade:'', whatWentWell:'', whatWentWrong:'', exitAccordingToPlan:'Yes', earlyExitEmotions:'No', movedStopTooSoon:'No', heldTooLong:'No', marketBehaviorAlignment:'Yes', wouldTakeAgain:'Yes', emotionalFactors:[], moodBeforeTrade:'', confidenceLevel:'5', distractionLevel:'Low', emotionalTriggers:'', thingToImprove:'', followedRules:'Yes', planUpdateRequired:'No', mistakePatterns:'' }); setEditingTrade(null); setModalOpen(false); setActiveTab(0); setStrategyRuleCards([]) }} style={{padding:'10px 20px',background:'transparent',border:'1px solid #d1d5db',borderRadius:'8px',cursor:'pointer',fontSize:14,fontWeight:500}}>Cancel</button>
                <button 
                  onClick={createTrade} 
                  disabled={!creating.pair || !creating.entryPrice || !creating.exitPrice || !creating.stopLoss || !creating.takeProfit}
                  style={{padding:'10px 20px',background:(!creating.pair || !creating.entryPrice || !creating.exitPrice || !creating.stopLoss || !creating.takeProfit) ? '#9ca3af' : 'linear-gradient(45deg, #3b82f6, #1d4ed8)',color:'#fff',border:'none',borderRadius:'8px',cursor:(!creating.pair || !creating.entryPrice || !creating.exitPrice || !creating.stopLoss || !creating.takeProfit) ? 'not-allowed' : 'pointer',fontSize:14,fontWeight:600,boxShadow:'0 2px 4px rgba(59,130,246,0.2)'}}
                >
                  {editingTrade ? 'Update Trade' : 'Create Trade'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor 
          imageUrl={editingImage}
          onSave={saveEditedImage}
          onClose={() => setEditingImage(null)}
        />
      )}
    </div>
  )
}
