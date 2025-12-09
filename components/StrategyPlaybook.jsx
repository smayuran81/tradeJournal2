import { useState, useEffect } from 'react'

const formatText = (text) => {
  if (!text) return text
  
  // Convert markdown-style links [text](url) to clickable links
  let formatted = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4DA3FF;text-decoration:underline">$1</a>')
  
  // Convert numbered lists (lines starting with 1., 2., etc.)
  formatted = formatted.replace(/^(\d+\.\s+.+)$/gm, '<div style="margin-left:12px">$1</div>')
  
  return formatted
}

export default function StrategyPlaybook() {
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [selectedSection, setSelectedSection] = useState('setup')
  const [expandedCard, setExpandedCard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCardModal, setNewCardModal] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [newStrategyModal, setNewStrategyModal] = useState(false)
  const [newStrategyName, setNewStrategyName] = useState('')
  const [editingStrategy, setEditingStrategy] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
  const [strategyToDelete, setStrategyToDelete] = useState(null)
  const [newSectionModal, setNewSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [targetStrategyId, setTargetStrategyId] = useState(null)
  const [setupModal, setSetupModal] = useState(false)
  const [setupContent, setSetupContent] = useState('')
  const [setupImage, setSetupImage] = useState(null)
  const [linkModal, setLinkModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [textareaRef, setTextareaRef] = useState(null)
  const [draggingCard, setDraggingCard] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  
  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/strategies')
      const data = await response.json()
      console.log('Fetched strategies:', data)
      setStrategies(data.map(strategy => ({ ...strategy, id: strategy._id })))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching strategies:', error)
      setLoading(false)
    }
  }

  const updateSubsection = async (subsectionId, field, value) => {
    try {
      console.log('Updating subsection:', subsectionId, field, value)
      const updatedStrategy = { ...selectedStrategy }
      const rulesSection = updatedStrategy.sections.find(s => s.id === 'rules')
      if (rulesSection && rulesSection.subsections) {
        const subsection = rulesSection.subsections.find(s => s.id === subsectionId)
        if (subsection) {
          subsection[field] = value
          
          const { _id, ...strategyWithoutId } = updatedStrategy
          const response = await fetch('/api/strategies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
          })
          const result = await response.json()
          console.log('Update result:', result)
          
          // Only refresh if not updating position (to avoid flicker during drag)
          if (field !== 'position') {
            await fetchStrategies()
          }
          
          setSelectedStrategy(updatedStrategy)
          setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
        }
      }
    } catch (error) {
      console.error('Error updating subsection:', error)
    }
  }

  const deleteCard = async (cardId) => {
    const updatedStrategy = { ...selectedStrategy }
    const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
    if (currentSection && currentSection.subsections) {
      currentSection.subsections = currentSection.subsections.filter(s => s.id !== cardId)
      
      const { _id, ...strategyWithoutId } = updatedStrategy
      await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
      })
      
      setSelectedStrategy(updatedStrategy)
      setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
    }
  }

  const addNewStrategy = async (strategyName) => {
    const newStrategy = {
      name: strategyName,
      description: 'New strategy description',
      category: 'Custom',
      winRate: '0%',
      riskReward: '1:1',
      sections: [
        { id: 'setup', name: 'Setup Description' },
        { 
          id: 'rules', 
          name: 'Rules',
          subsections: []
        }
      ]
    }
    
    const response = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStrategy)
    })
    const savedStrategy = await response.json()
    const strategyWithId = { ...savedStrategy, id: savedStrategy._id }
    setStrategies(prev => [...prev, strategyWithId])
    setSelectedStrategy(strategyWithId)
  }

  const deleteStrategy = async (strategyId) => {
    await fetch(`/api/strategies?id=${strategyId}`, { method: 'DELETE' })
    setStrategies(prev => prev.filter(s => s.id !== strategyId))
    if (selectedStrategy?.id === strategyId) {
      setSelectedStrategy(null)
    }
  }

  const renameStrategy = async (strategyId, newName) => {
    const strategy = strategies.find(s => s.id === strategyId)
    if (strategy) {
      const updatedStrategy = { ...strategy, name: newName }
      const { _id, ...strategyWithoutId } = updatedStrategy
      await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strategyId, ...strategyWithoutId })
      })
      setStrategies(prev => prev.map(s => s.id === strategyId ? updatedStrategy : s))
      if (selectedStrategy?.id === strategyId) {
        setSelectedStrategy(updatedStrategy)
      }
    }
  }

  const renameSection = async (sectionId, newName) => {
    if (selectedStrategy) {
      const updatedStrategy = { ...selectedStrategy }
      const section = updatedStrategy.sections.find(s => s.id === sectionId)
      if (section) {
        section.name = newName
        const { _id, ...strategyWithoutId } = updatedStrategy
        await fetch('/api/strategies', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
        })
        setSelectedStrategy(updatedStrategy)
        setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
      }
    }
  }

  const updateSetupDescription = async (content, image) => {
    if (selectedStrategy) {
      const updatedStrategy = { ...selectedStrategy }
      updatedStrategy.setupDescription = content
      updatedStrategy.setupImage = image
      
      const { _id, ...strategyWithoutId } = updatedStrategy
      await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
      })
      
      setSelectedStrategy(updatedStrategy)
      setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
    }
  }

  const handleImageUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setSetupImage(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const addNewSection = async (strategyId, sectionName) => {
    const strategy = strategies.find(s => s.id === strategyId)
    if (strategy) {
      const newSection = {
        id: `section-${Date.now()}`,
        name: sectionName
      }
      const updatedStrategy = { ...strategy }
      updatedStrategy.sections.push(newSection)
      
      const { _id, ...strategyWithoutId } = updatedStrategy
      await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strategyId, ...strategyWithoutId })
      })
      
      setStrategies(prev => prev.map(s => s.id === strategyId ? updatedStrategy : s))
      if (selectedStrategy?.id === strategyId) {
        setSelectedStrategy(updatedStrategy)
      }
    }
  }

  const addChecklistItem = async (subsectionId, text) => {
    console.log('Adding checklist item:', subsectionId, text, 'selectedSection:', selectedSection)
    const updatedStrategy = { ...selectedStrategy }
    const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
    const subsection = currentSection?.subsections?.find(s => s.id === subsectionId)
    console.log('Found section:', currentSection, 'subsection:', subsection)
    if (subsection) {
      if (!subsection.checkList) subsection.checkList = []
      subsection.checkList.push({ id: Date.now(), text, checked: false })
      
      const { _id, ...strategyWithoutId } = updatedStrategy
      const response = await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
      })
      const result = await response.json()
      console.log('Checklist add result:', result)
      
      setSelectedStrategy(updatedStrategy)
      await fetchStrategies()
    } else {
      console.log('Could not find subsection')
    }
  }

  const removeChecklistItem = async (subsectionId, itemId) => {
    const updatedStrategy = { ...selectedStrategy }
    const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
    const subsection = currentSection?.subsections?.find(s => s.id === subsectionId)
    if (subsection && subsection.checkList) {
      subsection.checkList = subsection.checkList.filter(item => item.id !== itemId)
      
      const { _id, ...strategyWithoutId } = updatedStrategy
      await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
      })
      
      setSelectedStrategy(updatedStrategy)
      setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
    }
  }

  const addNewCard = async (cardName) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#A78BFA']
    const newCard = {
      id: `custom-${Date.now()}`,
      name: cardName || 'New Card',
      color: colors[Math.floor(Math.random() * colors.length)],
      text: '',
      image: null,
      checkList: []
    }
    
    console.log('Adding new card:', newCard)
    const updatedStrategy = { ...selectedStrategy }
    const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
    if (currentSection) {
      if (!currentSection.subsections) currentSection.subsections = []
      currentSection.subsections.push(newCard)
      
      console.log('Updated strategy:', updatedStrategy)
      const { _id, ...strategyWithoutId } = updatedStrategy
      const response = await fetch('/api/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
      })
      const result = await response.json()
      console.log('Update response:', result)
      
      setSelectedStrategy(updatedStrategy)
      setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s))
    }
  }

  return (
    <div style={{display:'flex',height:'100vh',background:'#0F1115'}}>
      {/* Sidebar */}
      <div style={{width:300,background:'#1A1F2E',borderRight:'1px solid #2A3441',padding:20}}>
        <div style={{marginBottom:30}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9'}}>Strategy Playbook</div>
            <button
              onClick={() => {
                setNewStrategyName('')
                setNewStrategyModal(true)
              }}
              style={{
                background:'#4DA3FF',
                border:'none',
                color:'white',
                padding:'6px 10px',
                borderRadius:4,
                cursor:'pointer',
                fontSize:12
              }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          {loading ? (
            <div style={{color:'#AEB5C2',fontSize:14}}>Loading strategies...</div>
          ) : strategies.length === 0 ? (
            <div style={{color:'#AEB5C2',fontSize:14}}>No strategies found</div>
          ) : (
            strategies.map((strategy, index) => (
            <div key={strategy.id || strategy._id}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div 
                  onClick={() => {setSelectedStrategy(strategy); setSelectedSection('setup')}}
                  onDoubleClick={() => {
                    setEditingStrategy(strategy.id)
                    setEditValue(strategy.name)
                  }}
                  style={{
                    flex:1,
                    padding:12,
                    borderRadius:8,
                    cursor:'pointer',
                    background: selectedStrategy?.id === strategy.id ? '#2A3441' : 'transparent',
                    transition:'background-color 0.2s'
                  }}
                >
                  {editingStrategy === strategy.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (editValue.trim()) {
                          renameStrategy(strategy.id, editValue.trim())
                        }
                        setEditingStrategy(null)
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          if (editValue.trim()) {
                            renameStrategy(strategy.id, editValue.trim())
                          }
                          setEditingStrategy(null)
                        }
                      }}
                      style={{
                        background:'transparent',
                        border:'1px solid #4DA3FF',
                        color:'#D8DEE9',
                        fontSize:14,
                        fontWeight:600,
                        padding:'2px 4px',
                        borderRadius:4,
                        width:'100%'
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div style={{fontWeight:600,fontSize:14,color:'#D8DEE9'}}>{strategy.name}</div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setStrategyToDelete(strategy)
                    setDeleteConfirmModal(true)
                  }}
                  style={{
                    background:'transparent',
                    border:'none',
                    color:'#6B7280',
                    padding:'4px 6px',
                    borderRadius:3,
                    cursor:'pointer',
                    fontSize:12,
                    marginLeft:8,
                    opacity:0.5,
                    transition:'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.5'}
                >
                  ×
                </button>
              </div>
              
              {selectedStrategy?.id === strategy.id && strategy.sections && (
                <div style={{marginLeft:16,marginTop:8}}>
                  {strategy.sections.map(section => (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      onDoubleClick={() => {
                        setEditingSection(section.id)
                        setEditValue(section.name)
                      }}
                      style={{
                        padding:'8px 12px',
                        borderRadius:6,
                        cursor:'pointer',
                        background: selectedSection === section.id ? '#4DA3FF' : 'transparent',
                        marginBottom:4,
                        transition:'background-color 0.2s'
                      }}
                    >
                      {editingSection === section.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            if (editValue.trim()) {
                              renameSection(section.id, editValue.trim())
                            }
                            setEditingSection(null)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              if (editValue.trim()) {
                                renameSection(section.id, editValue.trim())
                              }
                              setEditingSection(null)
                            }
                          }}
                          style={{
                            background:'transparent',
                            border:'1px solid #4DA3FF',
                            color:'#FFFFFF',
                            fontSize:13,
                            padding:'2px 4px',
                            borderRadius:4,
                            width:'100%'
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div style={{
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between'
                        }}>
                          <div style={{
                            color: selectedSection === section.id ? '#FFFFFF' : '#AEB5C2',
                            fontSize:13
                          }}>
                            {section.name}
                          </div>
                          {section.id !== 'setup' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete section "${section.name}"?`)) {
                                  const updatedStrategy = { ...selectedStrategy }
                                  updatedStrategy.sections = updatedStrategy.sections.filter(s => s.id !== section.id)
                                  const { _id, ...strategyWithoutId } = updatedStrategy
                                  fetch('/api/strategies', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: selectedStrategy._id, ...strategyWithoutId })
                                  }).then(() => {
                                    setSelectedStrategy(updatedStrategy)
                                    if (selectedSection === section.id) setSelectedSection('setup')
                                    fetchStrategies()
                                  })
                                }
                              }}
                              style={{
                                background:'transparent',
                                border:'none',
                                color:'#DC2626',
                                cursor:'pointer',
                                fontSize:14,
                                padding:0
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setTargetStrategyId(strategy.id)
                      setNewSectionName('')
                      setNewSectionModal(true)
                    }}
                    style={{
                      background:'transparent',
                      border:'1px dashed #4DA3FF',
                      color:'#4DA3FF',
                      padding:'6px 12px',
                      borderRadius:6,
                      cursor:'pointer',
                      fontSize:12,
                      width:'100%',
                      marginTop:4
                    }}
                  >
                    + Add Section
                  </button>
                </div>
              )}
              
              {/* Separator */}
              {index < strategies.length - 1 && (
                <div style={{
                  height:1,
                  background:'#2A3441',
                  margin:'16px 0'
                }} />
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{flex:1,padding:20,overflow:'auto'}}>
        {selectedStrategy ? (
          <div>
            {selectedSection === 'setup' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:700,color:'#D8DEE9'}}>Setup Description</div>
                  <button
                    onClick={() => {
                      setSetupContent(selectedStrategy.setupDescription || '')
                      setSetupImage(selectedStrategy.setupImage || null)
                      setSetupModal(true)
                    }}
                    style={{
                      background:'#4DA3FF',
                      border:'none',
                      color:'white',
                      padding:'8px 16px',
                      borderRadius:6,
                      cursor:'pointer',
                      fontSize:14
                    }}
                  >
                    Edit Setup
                  </button>
                </div>
                
                {/* Strategy Poster */}
                <div style={{
                  background:'linear-gradient(135deg, #1A1F2E 0%, #2A3441 100%)',
                  borderRadius:16,
                  padding:32,
                  border:'1px solid #4DA3FF',
                  boxShadow:'0 8px 32px rgba(77, 163, 255, 0.1)',
                  position:'relative',
                  overflow:'hidden'
                }}>
                  {/* Background Pattern */}
                  <div style={{
                    position:'absolute',
                    top:0,
                    right:0,
                    width:200,
                    height:200,
                    background:'radial-gradient(circle, rgba(77, 163, 255, 0.1) 0%, transparent 70%)',
                    borderRadius:'50%',
                    transform:'translate(50%, -50%)'
                  }} />
                  
                  <div style={{position:'relative',zIndex:1}}>
                    <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
                      {/* Image Section */}
                      {selectedStrategy.setupImage && (
                        <div style={{flex:'0 0 200px'}}>
                          <img 
                            src={selectedStrategy.setupImage}
                            alt="Strategy Setup"
                            style={{
                              width:'100%',
                              height:150,
                              objectFit:'cover',
                              borderRadius:12,
                              border:'2px solid #4DA3FF'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Content Section */}
                      <div style={{flex:1}}>
                        <div style={{
                          fontSize:24,
                          fontWeight:700,
                          color:'#D8DEE9',
                          marginBottom:16,
                          textShadow:'0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                          {selectedStrategy.name}
                        </div>
                        
                        <div style={{
                          color:'#AEB5C2',
                          lineHeight:1.6,
                          fontSize:16
                        }}>
                          {selectedStrategy.setupDescription ? (
                            <div dangerouslySetInnerHTML={{ __html: selectedStrategy.setupDescription }} />
                          ) : (
                            <div style={{fontStyle:'italic',opacity:0.7}}>
                              Click "Edit Setup" to add a description for this strategy...
                            </div>
                          )}
                        </div>
                        
                        {/* Strategy Stats */}
                        <div style={{display:'flex',gap:16,marginTop:20}}>
                          <div style={{
                            background:'rgba(77, 163, 255, 0.1)',
                            padding:'8px 12px',
                            borderRadius:8,
                            border:'1px solid rgba(77, 163, 255, 0.3)'
                          }}>
                            <div style={{fontSize:12,color:'#AEB5C2'}}>Win Rate</div>
                            <div style={{fontSize:16,fontWeight:600,color:'#4DA3FF'}}>{selectedStrategy.winRate || 'N/A'}</div>
                          </div>
                          <div style={{
                            background:'rgba(77, 163, 255, 0.1)',
                            padding:'8px 12px',
                            borderRadius:8,
                            border:'1px solid rgba(77, 163, 255, 0.3)'
                          }}>
                            <div style={{fontSize:12,color:'#AEB5C2'}}>Risk:Reward</div>
                            <div style={{fontSize:16,fontWeight:600,color:'#4DA3FF'}}>{selectedStrategy.riskReward || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSection !== 'setup' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:700,color:'#D8DEE9',textAlign:'center',flex:1}}>📌 {selectedStrategy.sections.find(s => s.id === selectedSection)?.name || 'Board'}</div>
                  <button
                    onClick={() => {
                      setNewCardName('')
                      setNewCardModal(true)
                    }}
                    style={{
                      background:'#4DA3FF',
                      border:'none',
                      color:'white',
                      padding:'8px 16px',
                      borderRadius:6,
                      cursor:'pointer',
                      fontSize:14
                    }}
                  >
                    + Add Card
                  </button>
                </div>
                <div 
                  style={{position:'relative',height:'calc(100vh - 200px)',overflow:'hidden'}}
                  onMouseMove={(e) => {
                    if (draggingCard) {
                      setHasDragged(true)
                      const rect = e.currentTarget.getBoundingClientRect()
                      const updatedStrategy = { ...selectedStrategy }
                      const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
                      const subsection = currentSection?.subsections?.find(s => s.id === draggingCard)
                      if (subsection) {
                        subsection.position = {
                          x: e.clientX - rect.left - dragOffset.x,
                          y: e.clientY - rect.top - dragOffset.y
                        }
                        setSelectedStrategy(updatedStrategy)
                      }
                    }
                  }}
                  onMouseUp={() => {
                    if (draggingCard) {
                      const currentSection = selectedStrategy.sections.find(s => s.id === selectedSection)
                      const subsection = currentSection?.subsections?.find(s => s.id === draggingCard)
                      if (subsection?.position) {
                        updateSubsection(draggingCard, 'position', subsection.position)
                      }
                      setDraggingCard(null)
                    }
                  }}
                >
                  {selectedStrategy.sections.find(s => s.id === selectedSection)?.subsections?.map((section, index) => {
                    const defaultLeft = 50 + (index % 4) * 210
                    const defaultTop = 20 + Math.floor(index / 4) * 190
                    const left = section.position?.x ?? defaultLeft
                    const top = section.position?.y ?? defaultTop
                    
                    return (
                    <div 
                      key={section.id}
                      onClick={(e) => {
                        if (e.target.tagName !== 'BUTTON' && !draggingCard && !hasDragged) {
                          setExpandedCard(expandedCard === section.id ? null : section.id)
                          setEditMode(false)
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          setEditingCard(section.id)
                          setEditMode(true)
                          e.stopPropagation()
                        }
                      }}
                      style={{
                        position:'absolute',
                        left,
                        top,
                        width: 180,
                        height: 160,
                        background:'#FFFEF7',
                        borderRadius:2,
                        padding:12,
                        transform:`rotate(${((index % 3) - 1) * 3}deg)`,
                        boxShadow:'0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                        border:'1px solid #E8E5D3',
                        cursor: draggingCard === section.id ? 'grabbing' : 'grab',
                        transition: draggingCard === section.id ? 'none' : 'all 0.3s ease',
                        zIndex: draggingCard === section.id ? 200 : (expandedCard === section.id ? 100 : 1)
                      }}
                      onMouseDown={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          setDragOffset({
                            x: e.nativeEvent.offsetX,
                            y: e.nativeEvent.offsetY
                          })
                          setDraggingCard(section.id)
                          setHasDragged(false)
                          e.preventDefault()
                        }
                      }}
                    >
                      {/* Pin */}
                      <div style={{
                        position:'absolute',
                        top:-8,
                        left:'50%',
                        transform:'translateX(-50%)',
                        width:12,
                        height:12,
                        background:'#DC2626',
                        borderRadius:'50%',
                        boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
                      }} />
                      
                      {/* Delete Cross */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteCard(section.id)
                        }}
                        style={{
                          position:'absolute',
                          top:-6,
                          left:-6,
                          width:16,
                          height:16,
                          background:'#DC2626',
                          border:'none',
                          borderRadius:'50%',
                          color:'white',
                          cursor:'pointer',
                          fontSize:10,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      >
                        ×
                      </button>
                      
                      {/* Header */}
                      <div style={{marginBottom:8,paddingTop:4}}>
                        <div style={{
                          color:section.color,
                          fontWeight:700,
                          fontSize:11,
                          textTransform:'uppercase',
                          letterSpacing:'0.5px',
                          textAlign:'center'
                        }}>
                          {(section.name || '').toString().split(' ')[0]}
                        </div>
                      </div>
                      
                      {/* Preview Content */}
                      <div style={{height:'calc(100% - 35px)',overflow:'hidden'}}>
                        {section.image && (
                          <img 
                            src={section.image} 
                            alt="Note" 
                            style={{
                              width:'100%',
                              height:50,
                              objectFit:'cover',
                              borderRadius:2,
                              marginBottom:4
                            }}
                          />
                        )}
                        
                        <div 
                          style={{
                            color:'#374151',
                            fontSize:10,
                            fontFamily:'"Comic Sans MS", cursive',
                            lineHeight:1.2,
                            overflow:'hidden',
                            textOverflow:'ellipsis',
                            display:'-webkit-box',
                            WebkitLineClamp:section.image ? 3 : 5,
                            WebkitBoxOrient:'vertical'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: formatText(section.text) || `Click to add notes...`
                          }}
                        />
                      </div>
                    </div>
                    )
                  })}
                  
                  {/* Expanded Card Modal */}
                  {expandedCard && (
                    <div style={{
                      position:'fixed',
                      top:0,
                      left:0,
                      right:0,
                      bottom:0,
                      background:'rgba(0,0,0,0.7)',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      zIndex:1000
                    }}>
                      {selectedStrategy.sections.find(s => s.id === selectedSection)?.subsections?.map(section => {
                        if (expandedCard !== section.id) return null
                        
                        return (
                          <div key={section.id} style={{
                            width:500,
                            maxHeight:'80vh',
                            background:'#FFFEF7',
                            borderRadius:8,
                            padding:24,
                            boxShadow:'0 20px 40px rgba(0,0,0,0.3)',
                            border:'2px solid #E8E5D3',
                            overflow:'auto',
                            display:'flex',
                            flexDirection:'column'
                          }}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                              <div style={{
                                color:section.color,
                                fontWeight:700,
                                fontSize:18,
                                textTransform:'uppercase'
                              }}>
                                {section.name}
                              </div>
                              <div style={{display:'flex',gap:8}}>
                                <button 
                                  onClick={() => setEditMode(!editMode)}
                                  style={{
                                    background:editMode ? '#4DA3FF' : 'transparent',
                                    border:'1px solid #4DA3FF',
                                    color:editMode ? 'white' : '#4DA3FF',
                                    padding:'4px 12px',
                                    borderRadius:4,
                                    cursor:'pointer',
                                    fontSize:12
                                  }}
                                >
                                  {editMode ? 'View' : 'Edit'}
                                </button>
                                <button 
                                  onClick={() => {setExpandedCard(null); setEditMode(false)}}
                                  style={{
                                    background:'none',
                                    border:'none',
                                    fontSize:20,
                                    cursor:'pointer',
                                    color:'#6B7280'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            
                            {/* Image at top */}
                            {section.image && (
                              <div style={{marginBottom:16}}>
                                <img 
                                  src={section.image} 
                                  alt="Note" 
                                  style={{
                                    width:'100%',
                                    maxHeight:250,
                                    objectFit:'cover',
                                    borderRadius:8
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Text content */}
                            <div style={{flex:1}}>
                              {editMode ? (
                                <div>
                                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                                    <button
                                      onClick={() => {
                                        setLinkText('')
                                        setLinkUrl('')
                                        setLinkModal(true)
                                      }}
                                      style={{
                                        background:'#4DA3FF',
                                        border:'none',
                                        color:'white',
                                        padding:'4px 12px',
                                        borderRadius:4,
                                        cursor:'pointer',
                                        fontSize:12
                                      }}
                                    >
                                      🔗 Add Link
                                    </button>
                                  </div>
                                  <textarea
                                    ref={(el) => setTextareaRef(el)}
                                    value={section.text || ''}
                                    onChange={(e) => {
                                      const updatedStrategy = { ...selectedStrategy }
                                      const currentSection = updatedStrategy.sections.find(s => s.id === selectedSection)
                                      const subsection = currentSection?.subsections?.find(s => s.id === section.id)
                                      if (subsection) {
                                        subsection.text = e.target.value
                                        setSelectedStrategy(updatedStrategy)
                                      }
                                    }}
                                    onBlur={(e) => updateSubsection(section.id, 'text', e.target.value)}
                                    placeholder={`Add detailed ${section.name.toLowerCase()} notes...`}
                                    style={{
                                      width:'100%',
                                      height:200,
                                      background:'transparent',
                                      border:'1px solid #E8E5D3',
                                      borderRadius:4,
                                      padding:12,
                                      color:'#374151',
                                      fontSize:14,
                                      fontFamily:'"Comic Sans MS", cursive',
                                      resize:'vertical'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  style={{
                                    color:'#374151',
                                    fontSize:14,
                                    fontFamily:'"Comic Sans MS", cursive',
                                    lineHeight:1.6,
                                    minHeight:200,
                                    padding:12,
                                    border:'1px solid #E8E5D3',
                                    borderRadius:4,
                                    whiteSpace:'pre-wrap'
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: formatText(section.text) || `No ${section.name.toLowerCase()} notes added yet.`
                                  }}
                                />
                              )}
                            </div>
                            
                            {/* Checklist Section */}
                            <div style={{marginTop:16}}>
                              <div style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:8}}>Checkpoints</div>
                              {section.checkList && section.checkList.length > 0 && (
                                <div style={{marginBottom:12}}>
                                  {section.checkList.map(item => (
                                    <div key={item.id} style={{display:'flex',alignItems:'center',marginBottom:6}}>
                                      <div style={{
                                        flex:1,
                                        padding:'6px 8px',
                                        background:'#F9FAFB',
                                        border:'1px solid #E5E7EB',
                                        borderRadius:4,
                                        fontSize:12,
                                        color:'#374151'
                                      }}>
                                        {item.text}
                                      </div>
                                      {editMode && (
                                        <button
                                          onClick={() => removeChecklistItem(section.id, item.id)}
                                          style={{
                                            background:'transparent',
                                            border:'none',
                                            color:'#DC2626',
                                            cursor:'pointer',
                                            fontSize:12,
                                            marginLeft:8
                                          }}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editMode && (
                                <input
                                  type="text"
                                  placeholder="Add checkpoint..."
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                      addChecklistItem(section.id, e.target.value.trim())
                                      e.target.value = ''
                                    }
                                  }}
                                  style={{
                                    width:'100%',
                                    padding:'6px 8px',
                                    background:'transparent',
                                    border:'1px dashed #D1D5DB',
                                    borderRadius:4,
                                    fontSize:12,
                                    color:'#6B7280'
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#AEB5C2'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>📚</div>
              <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>Select a Strategy</div>
              <div>Choose a strategy from the sidebar to view details</div>
            </div>
          </div>
        )}
      </div>

      {/* New Card Modal */}
      {newCardModal && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            width:400,
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>
              Add New Card
            </div>
            <input
              type="text"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="Enter card name..."
              style={{
                width:'100%',
                padding:12,
                background:'#0F1115',
                border:'1px solid #2A3441',
                borderRadius:6,
                color:'#D8DEE9',
                fontSize:14,
                marginBottom:20
              }}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newCardName.trim()) {
                  addNewCard(newCardName.trim())
                  setNewCardModal(false)
                }
              }}
            />
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setNewCardModal(false)}
                style={{
                  padding:'8px 16px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (newCardName.trim()) {
                    addNewCard(newCardName.trim())
                    setNewCardModal(false)
                  }
                }}
                disabled={!newCardName.trim()}
                style={{
                  padding:'8px 16px',
                  background: newCardName.trim() ? '#4DA3FF' : '#2A3441',
                  border:'none',
                  borderRadius:6,
                  color: newCardName.trim() ? 'white' : '#6B7280',
                  cursor: newCardName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Strategy Modal */}
      {newStrategyModal && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            width:400,
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>
              Add New Strategy
            </div>
            <input
              type="text"
              value={newStrategyName}
              onChange={(e) => setNewStrategyName(e.target.value)}
              placeholder="Enter strategy name..."
              style={{
                width:'100%',
                padding:12,
                background:'#0F1115',
                border:'1px solid #2A3441',
                borderRadius:6,
                color:'#D8DEE9',
                fontSize:14,
                marginBottom:20
              }}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newStrategyName.trim()) {
                  addNewStrategy(newStrategyName.trim())
                  setNewStrategyModal(false)
                }
              }}
            />
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setNewStrategyModal(false)}
                style={{
                  padding:'8px 16px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (newStrategyName.trim()) {
                    addNewStrategy(newStrategyName.trim())
                    setNewStrategyModal(false)
                  }
                }}
                disabled={!newStrategyName.trim()}
                style={{
                  padding:'8px 16px',
                  background: newStrategyName.trim() ? '#4DA3FF' : '#2A3441',
                  border:'none',
                  borderRadius:6,
                  color: newStrategyName.trim() ? 'white' : '#6B7280',
                  cursor: newStrategyName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Add Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Description Modal */}
      {setupModal && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            width:700,
            maxHeight:'80vh',
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24,
            overflow:'auto'
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>
              Edit Setup Description
            </div>
            
            {/* Image Upload */}
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:14,fontWeight:600,color:'#D8DEE9',marginBottom:8}}>Strategy Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleImageUpload(e.target.files[0])
                  }
                }}
                style={{
                  width:'100%',
                  padding:8,
                  background:'#0F1115',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#D8DEE9',
                  fontSize:14
                }}
              />
              {setupImage && (
                <div style={{marginTop:12,position:'relative',display:'inline-block'}}>
                  <img 
                    src={setupImage}
                    alt="Preview"
                    style={{
                      width:200,
                      height:120,
                      objectFit:'cover',
                      borderRadius:8,
                      border:'1px solid #2A3441'
                    }}
                  />
                  <button
                    onClick={() => setSetupImage(null)}
                    style={{
                      position:'absolute',
                      top:-8,
                      right:-8,
                      width:24,
                      height:24,
                      background:'#DC2626',
                      border:'none',
                      borderRadius:'50%',
                      color:'white',
                      cursor:'pointer',
                      fontSize:14,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            
            {/* Text Editor */}
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:14,fontWeight:600,color:'#D8DEE9',marginBottom:8}}>Description</label>
              <textarea
                value={setupContent}
                onChange={(e) => setSetupContent(e.target.value)}
                placeholder="Describe your trading strategy setup..."
                style={{
                  width:'100%',
                  height:200,
                  background:'#0F1115',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#D8DEE9',
                  fontSize:14,
                  padding:12,
                  resize:'vertical',
                  fontFamily:'inherit'
                }}
              />
            </div>
            
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setSetupModal(false)}
                style={{
                  padding:'10px 20px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  updateSetupDescription(setupContent, setupImage)
                  setSetupModal(false)
                }}
                style={{
                  padding:'10px 20px',
                  background:'#4DA3FF',
                  border:'none',
                  borderRadius:6,
                  color:'white',
                  cursor:'pointer',
                  fontWeight:600
                }}
              >
                Save Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Section Modal */}
      {newSectionModal && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            width:400,
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>
              Add New Section
            </div>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name..."
              style={{
                width:'100%',
                padding:12,
                background:'#0F1115',
                border:'1px solid #2A3441',
                borderRadius:6,
                color:'#D8DEE9',
                fontSize:14,
                marginBottom:20
              }}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newSectionName.trim()) {
                  addNewSection(targetStrategyId, newSectionName.trim())
                  setNewSectionModal(false)
                }
              }}
            />
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setNewSectionModal(false)}
                style={{
                  padding:'8px 16px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (newSectionName.trim()) {
                    addNewSection(targetStrategyId, newSectionName.trim())
                    setNewSectionModal(false)
                  }
                }}
                disabled={!newSectionName.trim()}
                style={{
                  padding:'8px 16px',
                  background: newSectionName.trim() ? '#4DA3FF' : '#2A3441',
                  border:'none',
                  borderRadius:6,
                  color: newSectionName.trim() ? 'white' : '#6B7280',
                  cursor: newSectionName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && strategyToDelete && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000
        }}>
          <div style={{
            width:450,
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#DC2626',marginBottom:16}}>
              ⚠️ Delete Strategy
            </div>
            <div style={{color:'#D8DEE9',marginBottom:20,lineHeight:1.5}}>
              Are you sure you want to delete <strong>"{strategyToDelete.name}"</strong>?
              <br /><br />
              <span style={{color:'#F59E0B'}}>This action cannot be undone.</span> All sections, cards, and data associated with this strategy will be permanently removed.
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => {
                  setDeleteConfirmModal(false)
                  setStrategyToDelete(null)
                }}
                style={{
                  padding:'10px 20px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer',
                  fontSize:14
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteStrategy(strategyToDelete.id)
                  setDeleteConfirmModal(false)
                  setStrategyToDelete(null)
                }}
                style={{
                  padding:'10px 20px',
                  background:'#DC2626',
                  border:'none',
                  borderRadius:6,
                  color:'white',
                  cursor:'pointer',
                  fontSize:14,
                  fontWeight:600
                }}
              >
                Delete Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Insert Modal */}
      {linkModal && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.7)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1001
        }}>
          <div style={{
            width:400,
            background:'#1A1F2E',
            border:'1px solid #2A3441',
            borderRadius:12,
            padding:24
          }}>
            <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>
              Insert Link
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,color:'#AEB5C2',marginBottom:6}}>Link Text</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g., Trading Guide"
                style={{
                  width:'100%',
                  padding:10,
                  background:'#0F1115',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#D8DEE9',
                  fontSize:14
                }}
                autoFocus
              />
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:12,color:'#AEB5C2',marginBottom:6}}>URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width:'100%',
                  padding:10,
                  background:'#0F1115',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#D8DEE9',
                  fontSize:14
                }}
              />
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setLinkModal(false)}
                style={{
                  padding:'8px 16px',
                  background:'transparent',
                  border:'1px solid #2A3441',
                  borderRadius:6,
                  color:'#AEB5C2',
                  cursor:'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (linkText.trim() && linkUrl.trim() && textareaRef) {
                    const linkMarkdown = `[${linkText}](${linkUrl})`
                    const updatedStrategy = { ...selectedStrategy }
                    const rulesSection = updatedStrategy.sections.find(s => s.id === 'rules')
                    const subsection = rulesSection?.subsections?.find(s => s.id === expandedCard)
                    if (subsection) {
                      const currentText = subsection.text || ''
                      const cursorPos = textareaRef.selectionStart
                      const newText = currentText.slice(0, cursorPos) + linkMarkdown + currentText.slice(cursorPos)
                      subsection.text = newText
                      setSelectedStrategy(updatedStrategy)
                      updateSubsection(expandedCard, 'text', newText)
                    }
                    setLinkModal(false)
                  }
                }}
                disabled={!linkText.trim() || !linkUrl.trim()}
                style={{
                  padding:'8px 16px',
                  background: (linkText.trim() && linkUrl.trim()) ? '#4DA3FF' : '#2A3441',
                  border:'none',
                  borderRadius:6,
                  color: (linkText.trim() && linkUrl.trim()) ? 'white' : '#6B7280',
                  cursor: (linkText.trim() && linkUrl.trim()) ? 'pointer' : 'not-allowed'
                }}
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}