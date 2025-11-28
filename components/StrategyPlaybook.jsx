import { useState } from 'react'

export default function StrategyPlaybook() {
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [selectedSection, setSelectedSection] = useState('setup')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleContent, setRuleContent] = useState('')
  const [rulesData, setRulesData] = useState({})
  const [ruleSections, setRuleSections] = useState({})
  const [expandedCard, setExpandedCard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [newBoardModal, setNewBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  
  const strategies = [
    {
      id: 1,
      name: 'Daily Pull back',
      description: 'Trade pullbacks in daily trend',
      category: 'Pullback',
      winRate: '68%',
      riskReward: '1:3'
    },
    {
      id: 2,
      name: 'Support/Resistance Breakout',
      description: 'Trade breakouts from key levels',
      category: 'Breakout',
      winRate: '58%',
      riskReward: '1:3'
    },
    {
      id: 3,
      name: 'Price Action Reversal',
      description: 'Candlestick pattern reversals',
      category: 'Reversal',
      winRate: '72%',
      riskReward: '1:2'
    },
    {
      id: 4,
      name: 'Fibonacci Retracement',
      description: 'Trade retracements at key fib levels',
      category: 'Retracement',
      winRate: '61%',
      riskReward: '1:2.8'
    }
  ]

  const sections = [
    { id: 'setup', name: 'Setup Description' },
    { id: 'rules', name: 'Rules' }
  ]

  const [rulesSections, setRulesSections] = useState([
    { id: 'market-condition', name: 'Market Condition', color: '#FF6B6B' },
    { id: 'potential-setup', name: 'When Setup Looks Like Potential', color: '#4ECDC4' },
    { id: 'ongoing-development', name: 'Ongoing Development', color: '#45B7D1' },
    { id: 'real-candidate', name: 'Real Candidate', color: '#96CEB4' },
    { id: 'entry-condition', name: 'Entry Condition', color: '#FFEAA7' },
    { id: 'exit-condition', name: 'Exit Condition', color: '#DDA0DD' },
    { id: 'trade-management', name: 'Trade Management', color: '#98D8C8' }
  ])

  const handleEditRule = (ruleId, ruleName) => {
    setEditingRule({ id: ruleId, name: ruleName })
    setModalOpen(true)
  }

  const addSection = (ruleId) => {
    const key = `${selectedStrategy.id}-${ruleId}`
    setRuleSections(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { id: Date.now(), text: '', image: null }]
    }))
  }

  const updateSection = (ruleId, sectionId, field, value) => {
    const key = `${selectedStrategy.id}-${ruleId}`
    setRuleSections(prev => ({
      ...prev,
      [key]: prev[key]?.map(section => 
        section.id === sectionId ? { ...section, [field]: value } : section
      ) || []
    }))
  }

  const removeSection = (ruleId, sectionId) => {
    const key = `${selectedStrategy.id}-${ruleId}`
    setRuleSections(prev => ({
      ...prev,
      [key]: prev[key]?.filter(section => section.id !== sectionId) || []
    }))
  }

  const handleImageUpload = (ruleId, sectionId, file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      updateSection(ruleId, sectionId, 'image', e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const deleteBoard = (ruleId) => {
    setRulesSections(prev => prev.filter(rule => rule.id !== ruleId))
    const key = `${selectedStrategy.id}-${ruleId}`
    setRuleSections(prev => {
      const newSections = { ...prev }
      delete newSections[key]
      return newSections
    })
  }



  return (
    <div style={{display:'flex',height:'100vh',background:'#0F1115'}}>
      {/* Sidebar */}
      <div style={{width:300,background:'#1A1F2E',borderRight:'1px solid #2A3441',padding:20}}>
        <div style={{marginBottom:30}}>
          <div style={{fontSize:18,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>Strategy Playbook</div>
        </div>

        <div style={{marginBottom:20}}>
          {strategies.map(strategy => (
            <div key={strategy.id} style={{marginBottom:16}}>
              <div 
                onClick={() => {setSelectedStrategy(strategy); setSelectedSection('setup')}}
                style={{
                  padding:12,
                  borderRadius:8,
                  cursor:'pointer',
                  background: selectedStrategy?.id === strategy.id ? '#2A3441' : 'transparent',
                  transition:'background-color 0.2s'
                }}
              >
                <div style={{fontWeight:600,fontSize:14,color:'#D8DEE9'}}>{strategy.name}</div>
              </div>
              
              {selectedStrategy?.id === strategy.id && (
                <div style={{marginLeft:16,marginTop:8}}>
                  {sections.map(section => (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      style={{
                        padding:'8px 12px',
                        borderRadius:6,
                        cursor:'pointer',
                        background: selectedSection === section.id ? '#4DA3FF' : 'transparent',
                        marginBottom:4,
                        transition:'background-color 0.2s'
                      }}
                    >
                      <div style={{
                        color: selectedSection === section.id ? '#FFFFFF' : '#AEB5C2',
                        fontSize:13
                      }}>
                        {section.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{flex:1,padding:20,overflow:'auto'}}>
        {selectedStrategy ? (
          <div>
            {selectedSection === 'setup' && (
              <div>
                <div style={{fontSize:20,fontWeight:700,color:'#D8DEE9',marginBottom:20}}>Setup Description</div>
                <div style={{background:'#1A1F2E',padding:20,borderRadius:12,border:'1px solid #2A3441'}}>
                  <div style={{color:'#AEB5C2',lineHeight:1.6}}>
                    This strategy focuses on identifying and trading pullbacks within the context of a strong daily trend. 
                    The setup requires confirmation of the overall trend direction and waits for temporary retracements 
                    to provide better entry points with favorable risk-reward ratios.
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'rules' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:700,color:'#D8DEE9',textAlign:'center',flex:1}}>📌 Trading Rules Board</div>
                  <button
                    onClick={() => {
                      setNewBoardName('')
                      setNewBoardModal(true)
                    }}
                    style={{
                      background:'#4DA3FF',
                      border:'none',
                      color:'white',
                      padding:'8px 16px',
                      borderRadius:6,
                      cursor:'pointer',
                      fontSize:14,
                      display:'flex',
                      alignItems:'center',
                      gap:4
                    }}
                  >
                    + New Board
                  </button>
                </div>
                <div style={{position:'relative',height:'calc(100vh - 200px)',overflow:'hidden'}}>
                  {rulesSections.map((section, index) => {
                    const sections = ruleSections[`${selectedStrategy.id}-${section.id}`] || []
                    const allSections = sections.length > 0 ? sections : [{ id: 'default', text: '', image: null }]
                    
                    return allSections.map((item, itemIndex) => {
                      const totalCards = rulesSections.reduce((acc, s) => {
                        const secs = ruleSections[`${selectedStrategy.id}-${s.id}`] || []
                        return acc + Math.max(1, secs.length)
                      }, 0)
                      
                      let cardIndex = 0
                      for (let i = 0; i < index; i++) {
                        const secs = ruleSections[`${selectedStrategy.id}-${rulesSections[i].id}`] || []
                        cardIndex += Math.max(1, secs.length)
                      }
                      cardIndex += itemIndex
                      
                      const cols = 4
                      const col = cardIndex % cols
                      const row = Math.floor(cardIndex / cols)
                      const cardWidth = 180
                      const cardHeight = 160
                      const spacing = 30
                      
                      const rotation = (cardIndex % 3 - 1) * 3 + (Math.random() - 0.5) * 2
                      const xOffset = 50 + col * (cardWidth + spacing) + (Math.random() - 0.5) * 15
                      const yOffset = 20 + row * (cardHeight + spacing) + (Math.random() - 0.5) * 10
                      
                      return (
                        <div 
                          key={`${section.id}-${item.id}`}
                          onClick={(e) => {
                            if (e.target.tagName !== 'BUTTON') {
                              setExpandedCard(expandedCard === `${section.id}-${item.id}` ? null : `${section.id}-${item.id}`)
                              setEditMode(false)
                            }
                          }}
                          style={{
                            position:'absolute',
                            left: xOffset,
                            top: yOffset,
                            width: cardWidth,
                            height: cardHeight,
                            background:'#FFFEF7',
                            borderRadius:2,
                            padding:12,
                            transform:`rotate(${rotation}deg)`,
                            boxShadow:'0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                            border:'1px solid #E8E5D3',
                            cursor:'pointer',
                            transition:'all 0.3s ease',
                            zIndex: expandedCard === `${section.id}-${item.id}` ? 100 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (expandedCard !== `${section.id}-${item.id}`) {
                              e.target.style.transform = `rotate(0deg) scale(1.05)`
                              e.target.style.zIndex = '10'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (expandedCard !== `${section.id}-${item.id}`) {
                              e.target.style.transform = `rotate(${rotation}deg) scale(1)`
                              e.target.style.zIndex = '1'
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
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteBoard(section.id)
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
                          
                          {/* Action Buttons */}
                          <div style={{position:'absolute',top:4,right:4,display:'flex',gap:2}}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedCard(`${section.id}-${item.id}`)
                                setEditMode(true)
                              }}
                              style={{
                                background:'none',
                                border:'none',
                                color:'#6B7280',
                                cursor:'pointer',
                                fontSize:12,
                                padding:2
                              }}
                            >
                              ✏️
                            </button>
                          </div>
                          
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
                              {section.name.split(' ')[0]}
                              {sections.length > 1 && (
                                <span style={{fontSize:9,marginLeft:4}}>#{itemIndex + 1}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Preview Content */}
                          <div style={{height:'calc(100% - 35px)',overflow:'hidden'}}>
                            {item.image && (
                              <img 
                                src={item.image} 
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
                            
                            <div style={{
                              color:'#374151',
                              fontSize:10,
                              fontFamily:'"Comic Sans MS", cursive',
                              lineHeight:1.2,
                              overflow:'hidden',
                              textOverflow:'ellipsis',
                              display:'-webkit-box',
                              WebkitLineClamp:item.image ? 3 : 5,
                              WebkitBoxOrient:'vertical'
                            }}>
                              {item.text || `Click to add notes...`}
                            </div>
                          </div>
                        </div>
                      )
                    })
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
                      {rulesSections.map(section => {
                        const sections = ruleSections[`${selectedStrategy.id}-${section.id}`] || []
                        const allSections = sections.length > 0 ? sections : [{ id: 'default', text: '', image: null }]
                        const item = allSections[0]
                        
                        if (expandedCard !== `${section.id}-${item.id}`) return null
                        
                        return (
                          <div key={expandedCard} style={{
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
                            {item.image && (
                              <div style={{marginBottom:16}}>
                                <img 
                                  src={item.image} 
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
                                <textarea
                                  value={item.text}
                                  onChange={(e) => {
                                    if (item.id === 'default') {
                                      addSection(section.id)
                                      setTimeout(() => {
                                        const newSections = ruleSections[`${selectedStrategy.id}-${section.id}`] || []
                                        if (newSections.length > 0) {
                                          updateSection(section.id, newSections[0].id, 'text', e.target.value)
                                        }
                                      }, 0)
                                    } else {
                                      updateSection(section.id, item.id, 'text', e.target.value)
                                    }
                                  }}
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
                              ) : (
                                <div style={{
                                  color:'#374151',
                                  fontSize:14,
                                  fontFamily:'"Comic Sans MS", cursive',
                                  lineHeight:1.6,
                                  minHeight:200,
                                  padding:12,
                                  border:'1px solid #E8E5D3',
                                  borderRadius:4,
                                  whiteSpace:'pre-wrap'
                                }}>
                                  {item.text || `No ${section.name.toLowerCase()} notes added yet.`}
                                </div>
                              )}
                            </div>
                            
                            {editMode && (
                              <div style={{display:'flex',gap:12,marginTop:16}}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      if (item.id === 'default') {
                                        addSection(section.id)
                                        setTimeout(() => {
                                          const newSections = ruleSections[`${selectedStrategy.id}-${section.id}`] || []
                                          if (newSections.length > 0) {
                                            handleImageUpload(section.id, newSections[0].id, e.target.files[0])
                                          }
                                        }, 0)
                                      } else {
                                        handleImageUpload(section.id, item.id, e.target.files[0])
                                      }
                                    }
                                  }}
                                  style={{display:'none'}}
                                  id={`expanded-image-${section.id}-${item.id}`}
                                />
                                <label 
                                  htmlFor={`expanded-image-${section.id}-${item.id}`}
                                  style={{
                                    background:'#4DA3FF',
                                    color:'white',
                                    padding:'8px 16px',
                                    borderRadius:6,
                                    cursor:'pointer',
                                    fontSize:14
                                  }}
                                >
                                  📷 {item.image ? 'Change Image' : 'Add Image'}
                                </label>
                              </div>
                            )}
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


      {/* New Board Name Modal */}
      {newBoardModal && (
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
              Create New Board
            </div>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Enter board name..."
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
                if (e.key === 'Enter' && newBoardName.trim()) {
                  const newRuleId = `custom-${Date.now()}`
                  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#A78BFA']
                  const newRule = {
                    id: newRuleId,
                    name: newBoardName.trim(),
                    color: colors[Math.floor(Math.random() * colors.length)]
                  }
                  setRulesSections(prev => [...prev, newRule])
                  addSection(newRuleId)
                  setNewBoardModal(false)
                }
              }}
            />
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button 
                onClick={() => setNewBoardModal(false)}
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
                  if (newBoardName.trim()) {
                    const newRuleId = `custom-${Date.now()}`
                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#A78BFA']
                    const newRule = {
                      id: newRuleId,
                      name: newBoardName.trim(),
                      color: colors[Math.floor(Math.random() * colors.length)]
                    }
                    setRulesSections(prev => [...prev, newRule])
                    addSection(newRuleId)
                    setNewBoardModal(false)
                  }
                }}
                disabled={!newBoardName.trim()}
                style={{
                  padding:'8px 16px',
                  background: newBoardName.trim() ? '#4DA3FF' : '#2A3441',
                  border:'none',
                  borderRadius:6,
                  color: newBoardName.trim() ? 'white' : '#6B7280',
                  cursor: newBoardName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}