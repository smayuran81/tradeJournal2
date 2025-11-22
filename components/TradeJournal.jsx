import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { repository } from '../services/repository'

const AgGridReact = dynamic(() => import('ag-grid-react').then(m => m?.AgGridReact || m?.default), { ssr: false, loading: () => <div>Loading grid...</div> })
import ReviewPanel from './ReviewPanel'
import ImageEditor from './ImageEditor'
const WysiwygEditor = dynamic(async () => {
  const m = await import('./WysiwygEditor')
  return m?.default || m
}, { ssr: false })

// TradeJournal stores its own list under localStorage key `trade-journal`
export default function TradeJournal() {
  const [trades, setTrades] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const fileInputRef = useRef()

  useEffect(() => {
    loadTrades()
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

  // grid rows come directly from trades, with computed columns
  const rowData = useMemo(() => trades.map(t => {
    const entry = t.entryPrice ? Number(t.entryPrice) : null
    const exit = t.exitPrice ? Number(t.exitPrice) : null
    const sl = t.stopLoss ? Number(t.stopLoss) : null
    const tp = t.takeProfit ? Number(t.takeProfit) : null
    const stopLossPips = (entry && sl) ? computePips(t.pair, entry, sl) : ''
    const takeProfitPips = (entry && tp) ? computePips(t.pair, entry, tp) : ''
    let result = t.result || 'Open'
    let lossAmount = ''
    if (!t.result && exit !== null && entry !== null) {
      const profit = exit - entry // assume long by default
      result = profit > 0 ? 'Win' : (profit < 0 ? 'Loss' : 'Breakeven')
      if (profit < 0) lossAmount = Math.abs(Math.round(profit * 100000) / 100000)
    } else if (t.result && exit !== null && entry !== null && t.result === 'Loss') {
      // if stored as loss, compute loss amount for display
      const profit = exit - entry
      if (profit < 0) lossAmount = Math.abs(Math.round(profit * 100000) / 100000)
    }
    const tradeDate = t.date ? new Date(t.date).toISOString().slice(0,10) : ''
    return {
      id: t.id,
      pair: t.pair,
      entry: t.entryPrice || '',
      exit: t.exitPrice || '',
      stopLossPips,
      takeProfitPips,
      result,
      lossAmount,
      status: t.status || '',
      date: t.date || '',
      tradeDate,
      images: (t.images || []).length,
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
    { field: 'pair', headerName: 'Pair', minWidth: 140, flex: 1, editable: true },
    { field: 'entry', headerName: 'Entry', maxWidth: 120, editable: true, valueParser: params => Number(params.newValue) || params.oldValue },
    { field: 'exit', headerName: 'Exit', maxWidth: 120, editable: true, valueParser: params => Number(params.newValue) || params.oldValue },
    { field: 'stopLossPips', headerName: 'SL (pips)', maxWidth: 120, editable: false },
    { field: 'takeProfitPips', headerName: 'TP (pips)', maxWidth: 120, editable: false },
    { field: 'result', headerName: 'Result', maxWidth: 100, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Open', 'Win', 'Loss', 'Breakeven'] } },
    { field: 'lossAmount', headerName: 'Loss Amt', maxWidth: 120, editable: false },
    { field: 'images', headerName: 'Imgs', maxWidth: 90, editable: false },
    { field: 'tradeDate', headerName: 'Trade Date', maxWidth: 120, editable: false },
    { field: 'date', headerName: 'Created At', maxWidth: 160, editable: false }
  ], [])

  const onSelectionChanged = useCallback((params) => {
    const sel = params.api.getSelectedRows()[0] || null
    setSelected(sel ? sel.raw : null)
  }, [])

  const getRowClass = useCallback((params) => {
    const result = params.data.result
    switch(result) {
      case 'Win': return 'trade-win'
      case 'Loss': return 'trade-loss'
      case 'Breakeven': return 'trade-breakeven'
      case 'Open': return 'trade-open'
      default: return ''
    }
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
      if (colDef.field === 'entry') updates.entryPrice = newValue.toString()
      if (colDef.field === 'exit') updates.exitPrice = newValue.toString()
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
  const [creating, setCreating] = useState({ pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', images: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPos, setModalPos] = useState({ x: 120, y: 80 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  async function createTrade() {
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
      id: Date.now().toString(),
      pair: creating.pair || 'UNKN',
      entryPrice: creating.entryPrice || '',
      exitPrice: creating.exitPrice || '',
      stopLoss: creating.stopLoss || '',
      takeProfit: creating.takeProfit || '',
      notes: creating.notes || '',
      images: creating.images || [],
      status: 'open',
      result: computedResult,
      date: dateIso
    }
    
    // Save to MongoDB via repository
    try {
      await repository.saveTrade(t)
      // Reload trades from database to get the latest data
      await loadTrades()
      setCreating({ pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', images: [], date: '', result: 'Open' })
      setSelected(t)
      setModalOpen(false)
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
      // Merge existing trade images with review images
      const existingImages = selected.images || []
      const reviewImages = payload.images || []
      const allImages = [...existingImages, ...reviewImages]
      
      const updates = { 
        review: payload, 
        images: allImages, 
        status: 'closed', 
        updatedAt: new Date()
      }
      console.log('Saving review:', payload)
      await repository.updateTrade(selected.id, updates)
      // Reload trades to get updated data
      await loadTrades()
      // Update selected to show new review
      setSelected({...selected, ...updates})
    } catch (error) {
      console.error('Failed to save review:', error)
      alert('Failed to save review. Please try again.')
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

  const [leftWidth, setLeftWidth] = useState(80)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageOverlay, setImageOverlay] = useState(false)
  const [editingImage, setEditingImage] = useState(null)

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
    <div ref={containerRef} style={{display:'flex',height:'100%',position:'relative'}}>
      <div style={{width:`${leftWidth}%`,display:'flex',flexDirection:'column',gap:8,paddingRight:6}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontWeight:700}}>Trades</div>
            <div>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc'}}>
                <option value="">All dates</option>
                {Array.from(new Set(trades.map(t => t.date ? new Date(t.date).toISOString().slice(0,10) : ''))).filter(Boolean).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setModalOpen(true)} style={{padding:'6px 12px',background:'#3182ce',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Create New Trade</button>
            {selected && (
              <button onClick={deleteTrade} style={{padding:'6px 12px',background:'#dc2626',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Delete Selected</button>
            )}
          </div>
        </div>

        <div style={{flex:1,minHeight:160}}>
          <div className="grid-wrapper ag-theme-alpine" style={{height:'100%',width:'100%'}}>
            <AgGridReact
              rowData={selectedDate ? rowData.filter(r => r.tradeDate === selectedDate) : rowData}
              defaultColDef={defaultColDef}
              columnDefs={columnDefs}
              rowSelection="single"
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              getRowClass={getRowClass}
              animateRows={false}
              suppressReactUi={true}
              stopEditingWhenCellsLoseFocus={true}
            />
          </div>
        </div>

        <div style={{minHeight:180}}>
          {selected ? (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontWeight:700}}>{selected.pair}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:8}}>Entry: {selected.entryPrice} • Exit: {selected.exitPrice}</div>
              <div style={{maxHeight:180,overflow:'auto'}}>
                <div style={{fontWeight:700,marginBottom:6}}>Notes</div>
                <div dangerouslySetInnerHTML={{__html: selected.notes || selected.review?.html || '<div style="color:var(--muted)">No notes</div>'}} />
              </div>
            </div>
          ) : (
            <div style={{padding:8,color:'var(--muted)'}}>Create or select a trade to view details and images.</div>
          )}
        </div>
      </div>

      {/* Drag Handle */}
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

      <div style={{width:`${100-leftWidth}%`,display:'flex',flexDirection:'column',paddingLeft:6}}>
        <div style={{flex:1,overflow:'auto',padding:8}}>
          <div style={{marginBottom:12}}>
            {selected && (
              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Review</div>
                <ReviewPanel review={selected.review || {}} onSave={saveReview} />
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
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}>Add Images</button>
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
                  style={{maxWidth:'100%',maxHeight:300,objectFit:'contain',borderRadius:8,cursor:'pointer',border:'2px solid #e2e8f0'}} 
                />
              </div>
            </div>
          ) : (
            <div style={{color:'var(--muted)',textAlign:'center',padding:20}}>
              {selected ? 'No images for this trade.' : 'No trade selected.'}
            </div>
          )}
        </div>
      </div>

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
      {modalOpen && (
        <div>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:50}} onClick={() => setModalOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            style={{position:'fixed',left:modalPos.x,top:modalPos.y,width:520,background:'var(--card)',padding:12,borderRadius:8,boxShadow:'var(--shadow-strong)',zIndex:60}}
          >
            <div onMouseDown={startDrag} style={{cursor:'move',padding:8,display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--muted-overlay)'}}>
              <div style={{fontWeight:700}}>Create New Trade</div>
              <div>
                <button onClick={() => setModalOpen(false)} style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}>✕</button>
              </div>
            </div>

            <div style={{padding:8,display:'flex',flexDirection:'column',gap:8}} onClick={e => e.stopPropagation()}>
              <input placeholder="Pair (e.g. BTC/USD)" value={creating.pair} onChange={e => setCreating(c => ({ ...c, pair: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc'}} />
              <div style={{display:'flex',gap:8}}>
                <input placeholder="Entry" value={creating.entryPrice} onChange={e => setCreating(c => ({ ...c, entryPrice: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',flex:1}} />
                <input placeholder="Exit" value={creating.exitPrice} onChange={e => setCreating(c => ({ ...c, exitPrice: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',flex:1}} />
              </div>

              <div style={{display:'flex',gap:8}}>
                <input placeholder="Initial Stop Loss" value={creating.stopLoss} onChange={e => setCreating(c => ({ ...c, stopLoss: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',flex:1}} />
                <input placeholder="Initial Take Profit" value={creating.takeProfit} onChange={e => setCreating(c => ({ ...c, takeProfit: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',flex:1}} />
              </div>

              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1}}>
                  <label style={{display:'block',fontSize:12,color:'var(--muted)'}}>Trade Date</label>
                  <input type="date" value={creating.date || new Date().toISOString().slice(0,10)} onChange={e => setCreating(c => ({ ...c, date: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',width:'100%'}} />
                </div>
                <div style={{width:160}}>
                  <label style={{display:'block',fontSize:12,color:'var(--muted)'}}>Result</label>
                  <select value={creating.result || 'Open'} onChange={e => setCreating(c => ({ ...c, result: e.target.value }))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #ccc',width:'100%'}}>
                    <option value="Open">Open</option>
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                    <option value="Breakeven">Breakeven</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{fontWeight:700,display:'block',marginBottom:6}}>Notes</label>
                <WysiwygEditor value={creating.notes || ''} onChange={html => setCreating(c => ({ ...c, notes: html }))} />
              </div>

              <div>
                <label style={{fontWeight:700,display:'block',marginBottom:6}}>Images</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input id="modal-files" type="file" accept="image/*" multiple onChange={onModalFilesChange} style={{display:'none'}} />
                  <button onClick={() => document.getElementById('modal-files') && document.getElementById('modal-files').click()} style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}>Add Images</button>
                  <div style={{color:'var(--muted)'}}>{(creating.images || []).length} selected</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                  {(creating.images || []).map((src, idx) => (
                    <div key={idx} style={{position:'relative'}}>
                      <img src={src} alt={`c-${idx}`} style={{width:120,height:80,objectFit:'cover',borderRadius:6}} />
                      <button onClick={() => removeModalImage(idx)} style={{position:'absolute',top:6,right:6}}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button onClick={() => { setCreating({ pair: '', entryPrice: '', exitPrice: '', notes: '', stopLoss:'', takeProfit:'', images:[], date:'', result:'Open' }); setModalOpen(false) }} style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}>Cancel</button>
                <button onClick={createTrade} style={{padding:'6px 12px',background:'#3182ce',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Create Trade</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
