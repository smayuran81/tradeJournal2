import React, { useRef, useEffect, useState } from 'react'

export default function WysiwygEditor({ value = '', onChange }) {
  const ref = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (ref.current && !isFocused && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, [value, isFocused])

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = value || ''
    }
  }, [])

  function exec(command, arg = null) {
    if (!ref.current) return
    document.execCommand(command, false, arg)
    // propagate change
    onChange && onChange(ref.current.innerHTML)
  }

  function handleInput() {
    onChange && onChange(ref.current.innerHTML)
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} className="btn btn-ghost">B</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} className="btn btn-ghost">I</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} className="btn btn-ghost">U</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className="btn btn-ghost">• List</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => {
          const url = window.prompt('URL')
          if (url) exec('createLink', url)
        }} className="btn btn-ghost">Link</button>
      </div>

      <div
        ref={ref}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        contentEditable
        style={{minHeight:120,border:'1px solid var(--muted-overlay)',padding:8,borderRadius:6,outline:'none',background:'var(--card)'}}
      />
    </div>
  )
}
