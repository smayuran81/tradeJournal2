import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const AgGridReact = dynamic(() => import('ag-grid-react').then(m => m?.AgGridReact || m?.default), { ssr: false, loading: () => <div>Loading grid...</div> })
import ReviewPanel from './ReviewPanel'
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
    try {
      const raw = localStorage.getItem('trade-journal')
      const parsed = raw ? JSON.parse(raw) : []
      setTrades(parsed)
    } catch (e) { setTrades([]) }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('trade-journal', JSON.stringify(trades))
    } catch (e) {}
  }, [trades])

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

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, minWidth: 80 }), [])

  const columnDefs = useMemo(() => [
    { field: 'pair', headerName: 'Pair', minWidth: 140, flex: 1 },
    { field: 'entry', headerName: 'Entry', maxWidth: 120 },
    { field: 'exit', headerName: 'Exit', maxWidth: 120 },
    { field: 'stopLossPips', headerName: 'SL (pips)', maxWidth: 120 },
    { field: 'takeProfitPips', headerName: 'TP (pips)', maxWidth: 120 },
    { field: 'result', headerName: 'Result', maxWidth: 100 },
    { field: 'lossAmount', headerName: 'Loss Amt', maxWidth: 120 },
    { field: 'images', headerName: 'Imgs', maxWidth: 90 },
    { field: 'tradeDate', headerName: 'Trade Date', maxWidth: 120 },
    { field: 'date', headerName: 'Created At', maxWidth: 160 }
  ], [])

  const onSelectionChanged = useCallback((params) => {
    const sel = params.api.getSelectedRows()[0] || null
    setSelected(sel ? sel.raw : null)
  }, [])

  // Create new trade entry (modal-driven)
  const [creating, setCreating] = useState({ pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', images: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPos, setModalPos] = useState({ x: 120, y: 80 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  function createTrade() {
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
    setTrades(prev => [t, ...prev])
    setCreating({ pair: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', notes: '', images: [], date: '', result: 'Open' })
    setSelected(t)
    setModalOpen(false)
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
    const reads = files.map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
    }))
    const data = await Promise.all(reads)
    setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, images: [...(t.images||[]), ...data] } : t))
    // refresh selected reference
    setSelected(s => ({ ...(s || {}), images: [...(s?.images||[]), ...(data||[])] }))
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


  function removeImage(idx) {
    if (!selected) return
    setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, images: (t.images||[]).filter((_, i) => i !== idx) } : t))
    setSelected(s => ({ ...(s||{}), images: (s.images||[]).filter((_, i) => i !== idx) }))
  }

  function saveReview(payload) {
    if (!selected) return
    setTrades(prev => prev.map(t => t.id === selected.id ? { ...t, review: payload, images: payload.images || t.images || [], status: 'closed', meta: { updatedAt: Date.now() } } : t))
    // update selected copy
    setSelected(s => ({ ...(s||{}), review: payload, images: payload.images || s.images || [] }))
  }

  // small helper to wire file input
  function onFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length) handleAddImages(files)
    e.target.value = ''
  }

  return (
    <div style={{display:'flex',gap:12,height:'100%'}}>
      <div style={{width:'50%',display:'flex',flexDirection:'column',gap:8}}>
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
          <div>
            <button onClick={() => setModalOpen(true)} style={{padding:'6px 12px',background:'#3182ce',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Create New Trade</button>
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
              animateRows={true}
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

      <div style={{flex:1,overflow:'auto'}}>
        <div style={{padding:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700,marginBottom:8}}>Images</div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesChange} style={{display:'none'}} />
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{padding:'6px 12px',background:'transparent',border:'1px solid #ccc',borderRadius:'4px',cursor:'pointer'}}>Add Images</button>
            </div>
          </div>

          {selected ? (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
              {(selected.images || []).length === 0 && <div style={{color:'var(--muted)'}}>No images for this trade.</div>}
              {(selected.images || []).map((src, idx) => (
                <div key={idx} style={{position:'relative'}}>
                  <img src={src} alt={`img-${idx}`} style={{width:320,height:200,objectFit:'cover',borderRadius:8}} />
                  <button onClick={() => removeImage(idx)} style={{position:'absolute',top:6,right:6}}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{color:'var(--muted)'}}>No trade selected.</div>
          )}

          <div style={{marginTop:12}}>
            {selected && (
              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Review</div>
                <ReviewPanel review={selected.review || {}} onSave={saveReview} />
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  )
}
