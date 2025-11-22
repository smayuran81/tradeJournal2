import { useState, useRef, useEffect } from 'react'

export default function ImageEditor({ imageUrl, onSave, onClose }) {
  const canvasRef = useRef()
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#ff0000')
  const [lineWidth, setLineWidth] = useState(3)
  const [image, setImage] = useState(null)
  const [startPos, setStartPos] = useState(null)
  const [tempCanvas, setTempCanvas] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = Math.min(800, img.width)
      canvas.height = (img.height * canvas.width) / img.width
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setImage(img)
      
      // Create temporary canvas for preview
      const temp = document.createElement('canvas')
      temp.width = canvas.width
      temp.height = canvas.height
      setTempCanvas(temp)
    }
    img.src = imageUrl
  }, [imageUrl])

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    const pos = getMousePos(e)
    setIsDrawing(true)
    setStartPos(pos)
    
    if (tool === 'pen') {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
    }
  }

  const draw = (e) => {
    if (!isDrawing) return
    const pos = getMousePos(e)
    
    if (tool === 'pen') {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'line' && startPos && tempCanvas) {
      // Clear and redraw canvas with temp line
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const tempCtx = tempCanvas.getContext('2d')
      
      // Copy current canvas to temp
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      tempCtx.drawImage(canvas, 0, 0)
      
      // Clear main canvas and redraw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (image) ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      
      // Draw temp content
      ctx.drawImage(tempCanvas, 0, 0)
      
      // Draw preview line
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }

  const stopDrawing = (e) => {
    if (!isDrawing) return
    
    if (tool === 'line' && startPos) {
      const pos = getMousePos(e)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      // Draw final line
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    
    setIsDrawing(false)
    setStartPos(null)
  }

  const addText = (e) => {
    if (tool !== 'text') return
    const pos = getMousePos(e)
    const text = prompt('Enter text:')
    if (text) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.font = `bold ${Math.max(16, lineWidth * 4)}px Arial`
      ctx.fillStyle = color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      
      // Add text with white outline for better visibility
      ctx.strokeText(text, pos.x, pos.y)
      ctx.fillText(text, pos.x, pos.y)
    }
  }

  const addArrow = (e) => {
    if (tool !== 'arrow') return
    const pos = getMousePos(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    const size = Math.max(20, lineWidth * 5)
    
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Draw arrow shaft
    ctx.beginPath()
    ctx.moveTo(pos.x - size, pos.y - size)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    
    // Draw arrowhead
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.lineTo(pos.x - size/3, pos.y - size/3)
    ctx.lineTo(pos.x - size/5, pos.y)
    ctx.lineTo(pos.x - size/3, pos.y + size/3)
    ctx.closePath()
    ctx.fill()
  }

  const clearCanvas = () => {
    if (!image) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  }

  const saveImage = async () => {
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          filename: `edited-${Date.now()}.png`
        })
      })
      const result = await response.json()
      if (result.success) {
        onSave(result.url)
      }
    } catch (error) {
      console.error('Failed to save edited image:', error)
      alert('Failed to save edited image')
    }
  }

  const handleCanvasClick = (e) => {
    if (!isDrawing) {
      if (tool === 'text') addText(e)
      if (tool === 'arrow') addArrow(e)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:8,padding:16,maxWidth:'90vw',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0}}>Edit Image</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          <button 
            onClick={() => setTool('pen')} 
            style={{padding:'8px 16px',background:tool === 'pen' ? '#3182ce' : '#f3f4f6',color:tool === 'pen' ? '#fff' : '#000',border:'none',borderRadius:6,cursor:'pointer',fontWeight:tool === 'pen' ? 'bold' : 'normal'}}
          >
            ✏️ Draw
          </button>
          <button 
            onClick={() => setTool('line')} 
            style={{padding:'8px 16px',background:tool === 'line' ? '#3182ce' : '#f3f4f6',color:tool === 'line' ? '#fff' : '#000',border:'none',borderRadius:6,cursor:'pointer',fontWeight:tool === 'line' ? 'bold' : 'normal'}}
          >
            📏 Line
          </button>
          <button 
            onClick={() => setTool('text')} 
            style={{padding:'8px 16px',background:tool === 'text' ? '#3182ce' : '#f3f4f6',color:tool === 'text' ? '#fff' : '#000',border:'none',borderRadius:6,cursor:'pointer',fontWeight:tool === 'text' ? 'bold' : 'normal'}}
          >
            📝 Text
          </button>
          <button 
            onClick={() => setTool('arrow')} 
            style={{padding:'8px 16px',background:tool === 'arrow' ? '#3182ce' : '#f3f4f6',color:tool === 'arrow' ? '#fff' : '#000',border:'none',borderRadius:6,cursor:'pointer',fontWeight:tool === 'arrow' ? 'bold' : 'normal'}}
          >
            ➡️ Arrow
          </button>
          
          <div style={{display:'flex',alignItems:'center',gap:4,background:'#f9fafb',padding:'4px 8px',borderRadius:6,border:'1px solid #e5e7eb'}}>
            <span style={{fontSize:12,fontWeight:'bold'}}>Color:</span>
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              style={{width:32,height:32,border:'none',borderRadius:4,cursor:'pointer'}}
            />
          </div>
          
          <div style={{display:'flex',alignItems:'center',gap:8,background:'#f9fafb',padding:'4px 12px',borderRadius:6,border:'1px solid #e5e7eb'}}>
            <span style={{fontSize:12,fontWeight:'bold'}}>Size:</span>
            <input 
              type="range" 
              min="1" 
              max="15" 
              value={lineWidth} 
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={{width:100}}
            />
            <span style={{fontSize:12,color:'#666',minWidth:'30px'}}>{lineWidth}px</span>
          </div>
          
          <div style={{display:'flex',gap:4}}>
            {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{width:24,height:24,backgroundColor:c,border:color === c ? '3px solid #333' : '1px solid #ccc',borderRadius:4,cursor:'pointer'}}
              />
            ))}
          </div>
          
          <button onClick={clearCanvas} style={{padding:'6px 12px',background:'#f59e0b',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>
            🔄 Reset
          </button>
        </div>
        
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onClick={handleCanvasClick}
          style={{border:'1px solid #ccc',borderRadius:4,cursor:tool === 'pen' ? 'crosshair' : 'pointer',display:'block',marginBottom:16}}
        />
        
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'8px 16px',background:'#6b7280',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>
            Cancel
          </button>
          <button onClick={saveImage} style={{padding:'8px 16px',background:'#10b981',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}