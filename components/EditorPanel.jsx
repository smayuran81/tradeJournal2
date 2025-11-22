import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

export default function EditorPanel({ selected, note = '', images = [], onSaveText, onAddImages, onRemoveImage }) {
  const [value, setValue] = useState(note || '')

  // load the passed-in note whenever the selected ticker or note prop changes
  useEffect(() => {
    setValue(note || '')
  }, [selected?.pair, note])

  // debounce auto-save whenever value changes for the currently selected ticker
  useEffect(() => {
    if (!selected || typeof onSaveText !== 'function') return
    const t = setTimeout(() => onSaveText(value || ''), 800)
    return () => clearTimeout(t)
  }, [value, selected, onSaveText])

  if (!selected) {
    return (
      <div className="editor-empty">
        <h3>No ticker selected</h3>
        <p>Select a pair above to add your thoughts and notes.</p>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <strong>{selected.pair}</strong>
        <span className="price">{selected.bid} / {selected.ask}</span>
      </div>
      <div style={{marginBottom:12}}>
        <ReactQuill value={value} onChange={setValue} />
      </div>

      <div className="attachments">
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <label style={{fontWeight:600}}>Attachments</label>
          <input type="file" accept="image/*" multiple onChange={async (e) => {
            const files = Array.from(e.target.files || [])
            if (!files.length) return
            const reads = files.map(f => new Promise((res) => {
              const r = new FileReader()
              r.onload = () => res(r.result)
              r.readAsDataURL(f)
            }))
            const data = await Promise.all(reads)
            onAddImages && onAddImages(data)
            e.currentTarget.value = ''
          }} />
        </div>

        <div className="thumb-row" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {images && images.map((src, idx) => (
            <div key={idx} style={{position:'relative'}}>
              <img src={src} alt={`attach-${idx}`} style={{width:120,height:80,objectFit:'cover',borderRadius:4}} />
              <button onClick={() => onRemoveImage && onRemoveImage(idx)} style={{position:'absolute',top:4,right:4}}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
