import { useState } from 'react'

export default function TradeAnalysis({ trade }) {
  const [expandedSections, setExpandedSections] = useState({})
  
  if (!trade) return null

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,padding:16}}>
      {/* Pre-trade Analysis */}
      {(trade.reasonForEntry || trade.riskRewardRatio || trade.stopLossReason || trade.takeProfitReason) && (
        <div style={{background:'#f0f9ff',padding:12,borderRadius:8,border:'1px solid #0ea5e9'}}>
          <div 
            onClick={() => toggleSection('preAnalysis')}
            style={{fontWeight:600,color:'#0c4a6e',marginBottom:8,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}
          >
            <span>📋 Pre-trade Analysis</span>
            <span style={{fontSize:12}}>{expandedSections.preAnalysis ? '▼' : '▶'}</span>
          </div>
          {expandedSections.preAnalysis && (
            <div>
              {trade.reasonForEntry && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Entry Reasoning:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.reasonForEntry}</div>
                </div>
              )}
              {trade.riskRewardRatio && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Risk-Reward: {trade.riskRewardRatio}</div>
                </div>
              )}
              {trade.stopLossReason && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Stop-Loss Reason:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.stopLossReason}</div>
                </div>
              )}
              {trade.takeProfitReason && (
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Take-Profit Reason:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.takeProfitReason}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post-trade Analysis */}
      {(trade.whatWentWell || trade.whatWentWrong || trade.rrAchieved || trade.pipsGainedLost) && (
        <div style={{background:'#fef3c7',padding:12,borderRadius:8,border:'1px solid #f59e0b'}}>
          <div 
            onClick={() => toggleSection('postAnalysis')}
            style={{fontWeight:600,color:'#92400e',marginBottom:8,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}
          >
            <span>📊 Post-trade Analysis</span>
            <span style={{fontSize:12}}>{expandedSections.postAnalysis ? '▼' : '▶'}</span>
          </div>
          {expandedSections.postAnalysis && (
            <div>
              {trade.rrAchieved && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>RR Achieved: {trade.rrAchieved}</div>
                </div>
              )}
              {trade.pipsGainedLost && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Pips: {trade.pipsGainedLost}</div>
                </div>
              )}
              {trade.whatWentWell && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>What went well:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.whatWentWell}</div>
                </div>
              )}
              {trade.whatWentWrong && (
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>What went wrong:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.whatWentWrong}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Psychology */}
      {(trade.moodBeforeTrade || trade.confidenceLevel || trade.emotionalTriggers || (trade.emotionalFactors && trade.emotionalFactors.length > 0)) && (
        <div style={{background:'#e0e7ff',padding:12,borderRadius:8,border:'1px solid #6366f1'}}>
          <div 
            onClick={() => toggleSection('psychology')}
            style={{fontWeight:600,color:'#4338ca',marginBottom:8,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}
          >
            <span>🧠 Psychology</span>
            <span style={{fontSize:12}}>{expandedSections.psychology ? '▼' : '▶'}</span>
          </div>
          {expandedSections.psychology && (
            <div>
              {trade.confidenceLevel && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Confidence: {trade.confidenceLevel}/10</div>
                </div>
              )}
              {trade.moodBeforeTrade && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Mood before trade:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.moodBeforeTrade}</div>
                </div>
              )}
              {trade.emotionalFactors && trade.emotionalFactors.length > 0 && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Emotional factors:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.emotionalFactors.join(', ')}</div>
                </div>
              )}
              {trade.emotionalTriggers && (
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Triggers:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.emotionalTriggers}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lessons Learned */}
      {(trade.thingToImprove || trade.mistakePatterns || trade.followedRules) && (
        <div style={{background:'#fef2f2',padding:12,borderRadius:8,border:'1px solid #ef4444'}}>
          <div 
            onClick={() => toggleSection('lessons')}
            style={{fontWeight:600,color:'#dc2626',marginBottom:8,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}
          >
            <span>💡 Lessons Learned</span>
            <span style={{fontSize:12}}>{expandedSections.lessons ? '▼' : '▶'}</span>
          </div>
          {expandedSections.lessons && (
            <div>
              {trade.thingToImprove && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>To improve:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.thingToImprove}</div>
                </div>
              )}
              {trade.followedRules && trade.followedRules !== 'Yes' && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Rule adherence: {trade.followedRules}</div>
                </div>
              )}
              {trade.mistakePatterns && (
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Mistake patterns:</div>
                  <div style={{fontSize:13,color:'#64748b'}}>{trade.mistakePatterns}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}