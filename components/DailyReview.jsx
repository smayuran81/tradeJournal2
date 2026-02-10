import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Tabs,
  Tab,
  Autocomplete,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { MAJOR_PAIRS } from '../data/pairs'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Daily prep questions for each pair
const DAILY_PREP_QUESTIONS = [
  {
    id: 'bias',
    section: 'Market Bias',
    text: 'What is your bias for today?',
    type: 'select',
    options: ['Bullish', 'Bearish', 'Neutral', 'No Trade']
  },
  {
    id: 'htf_structure',
    section: 'Market Bias',
    text: 'What is the HTF (Daily/4H) structure?',
    type: 'select',
    options: ['Uptrend', 'Downtrend', 'Ranging', 'At Key Level']
  },
  {
    id: 'key_levels',
    section: 'Key Levels',
    text: 'Key support/resistance levels to watch',
    type: 'text',
    placeholder: 'e.g., Support: 1.0850, Resistance: 1.0920'
  },
  {
    id: 'poi',
    section: 'Key Levels',
    text: 'Point of Interest (POI) / Zone to watch',
    type: 'text',
    placeholder: 'e.g., Demand zone at 1.0860-1.0875'
  },
  {
    id: 'looking_for',
    section: 'Trade Plan',
    text: 'What setup are you looking for?',
    type: 'text',
    placeholder: 'e.g., Break of structure + retest, rejection at supply zone'
  },
  {
    id: 'entry_trigger',
    section: 'Trade Plan',
    text: 'Entry trigger / confirmation needed',
    type: 'text',
    placeholder: 'e.g., Engulfing candle on 15min, break and close above 1.0900'
  },
  {
    id: 'invalidation',
    section: 'Trade Plan',
    text: 'What would invalidate this setup?',
    type: 'text',
    placeholder: 'e.g., Break below 1.0820, close above supply zone'
  },
  {
    id: 'news_events',
    section: 'Risk Factors',
    text: 'Any news events today for this pair?',
    type: 'select',
    options: ['None', 'Low Impact', 'Medium Impact', 'High Impact - Avoid']
  },
  {
    id: 'notes',
    section: 'Risk Factors',
    text: 'Additional notes',
    type: 'text',
    placeholder: 'Any other observations or reminders...'
  }
]

function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))

  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday)
    currentDate.setDate(monday.getDate() + i)
    weekDates.push(currentDate)
  }
  return weekDates
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0]
}

function formatWeekRange(weekDates) {
  const start = weekDates[0]
  const end = weekDates[6]
  const options = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`
}

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

function calculatePairCompletion(pairData) {
  if (!pairData) return 0
  let answered = 0
  DAILY_PREP_QUESTIONS.forEach(q => {
    const val = pairData[q.id]
    if (q.type === 'select' && val) answered++
    else if (q.type === 'text' && val && val.trim().length > 0) answered++
  })
  return Math.round((answered / DAILY_PREP_QUESTIONS.length) * 100)
}

export default function DailyReview() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reviews, setReviews] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(true)

  // Prep state
  const [selectedPairs, setSelectedPairs] = useState([])
  const [pairResponses, setPairResponses] = useState({})
  const [expandedPair, setExpandedPair] = useState(null)

  const weekDates = getWeekDates(currentDate)
  const weekKey = formatDateKey(weekDates[0])

  useEffect(() => {
    loadReviews()
  }, [weekKey])

  async function loadReviews() {
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-reviews?weekKey=${weekKey}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || {})
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
      const stored = localStorage.getItem(`dailyReviews_${weekKey}`)
      if (stored) {
        setReviews(JSON.parse(stored))
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveReview() {
    if (!selectedDay) return

    const dateKey = formatDateKey(selectedDay)
    const updatedReviews = {
      ...reviews,
      [dateKey]: {
        prep: {
          pairs: selectedPairs,
          responses: pairResponses
        },
        review: reviews[dateKey]?.review || {},
        updatedAt: new Date().toISOString()
      }
    }

    setReviews(updatedReviews)

    try {
      await fetch('/api/daily-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekKey, reviews: updatedReviews })
      })
    } catch (error) {
      console.error('Failed to save review:', error)
      localStorage.setItem(`dailyReviews_${weekKey}`, JSON.stringify(updatedReviews))
    }

    setDialogOpen(false)
    setSelectedDay(null)
    resetForm()
  }

  function resetForm() {
    setSelectedPairs([])
    setPairResponses({})
    setExpandedPair(null)
    setTabValue(0)
  }

  function handleDayClick(date) {
    setSelectedDay(date)
    const dateKey = formatDateKey(date)
    const dayData = reviews[dateKey]

    if (dayData?.prep) {
      setSelectedPairs(dayData.prep.pairs || [])
      setPairResponses(dayData.prep.responses || {})
      setExpandedPair(dayData.prep.pairs?.[0] || null)
    } else {
      setSelectedPairs([])
      setPairResponses({})
      setExpandedPair(null)
    }

    setTabValue(0)
    setDialogOpen(true)
  }

  function handlePairSelect(event, newPairs) {
    setSelectedPairs(newPairs)
    // Initialize responses for new pairs
    const newResponses = { ...pairResponses }
    newPairs.forEach(pair => {
      if (!newResponses[pair]) {
        newResponses[pair] = {}
      }
    })
    // Remove responses for deselected pairs
    Object.keys(newResponses).forEach(pair => {
      if (!newPairs.includes(pair)) {
        delete newResponses[pair]
      }
    })
    setPairResponses(newResponses)

    // Expand first new pair
    if (newPairs.length > 0 && !expandedPair) {
      setExpandedPair(newPairs[0])
    }
  }

  function handleResponseChange(pair, questionId, value) {
    setPairResponses(prev => ({
      ...prev,
      [pair]: {
        ...prev[pair],
        [questionId]: value
      }
    }))
  }

  function removePair(pairToRemove) {
    setSelectedPairs(prev => prev.filter(p => p !== pairToRemove))
    setPairResponses(prev => {
      const newResponses = { ...prev }
      delete newResponses[pairToRemove]
      return newResponses
    })
    if (expandedPair === pairToRemove) {
      setExpandedPair(selectedPairs.filter(p => p !== pairToRemove)[0] || null)
    }
  }

  function navigateWeek(direction) {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  function goToCurrentWeek() {
    setCurrentDate(new Date())
  }

  const today = formatDateKey(new Date())

  // Group questions by section
  const questionsBySection = DAILY_PREP_QUESTIONS.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = []
    acc[q.section].push(q)
    return acc
  }, {})

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#1f2937' }}>
        Daily Review
      </Typography>

      {/* Week Navigation */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton onClick={() => navigateWeek(-1)}>
          <ChevronLeftIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {formatWeekRange(weekDates)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={goToCurrentWeek}
            sx={{ textTransform: 'none' }}
          >
            Today
          </Button>
        </Box>

        <IconButton onClick={() => navigateWeek(1)}>
          <ChevronRightIcon />
        </IconButton>
      </Paper>

      {/* Week Calendar Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
        mb: 3
      }}>
        {weekDates.map((date, idx) => {
          const dateKey = formatDateKey(date)
          const dayData = reviews[dateKey]
          const hasPrepData = dayData?.prep?.pairs?.length > 0
          const hasReviewData = dayData?.review?.setups?.length > 0
          const isToday = dateKey === today

          return (
            <Paper
              key={dateKey}
              onClick={() => handleDayClick(date)}
              sx={{
                p: 2,
                minHeight: 150,
                cursor: 'pointer',
                border: isToday ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                backgroundColor: isToday ? 'rgba(59, 130, 246, 0.05)' : 'white',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              {/* Day Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: isToday ? '#3b82f6' : '#6b7280',
                    textTransform: 'uppercase',
                    fontSize: 12
                  }}
                >
                  {DAYS[idx]}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: isToday ? '#3b82f6' : '#1f2937'
                  }}
                >
                  {date.getDate()}
                </Typography>
              </Box>

              {/* Content Preview */}
              {hasPrepData || hasReviewData ? (
                <Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {hasPrepData && (
                      <Chip
                        size="small"
                        label={`${dayData.prep.pairs.length} pairs`}
                        color="primary"
                        sx={{ fontSize: 10 }}
                      />
                    )}
                    {hasReviewData && (
                      <Chip
                        size="small"
                        label="Setups"
                        color="success"
                        sx={{ fontSize: 10 }}
                      />
                    )}
                  </Box>
                  {hasPrepData && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#4b5563',
                        fontSize: 11,
                        lineHeight: 1.3
                      }}
                    >
                      {dayData.prep.pairs.slice(0, 3).join(', ')}
                      {dayData.prep.pairs.length > 3 && '...'}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 80,
                  color: '#9ca3af'
                }}>
                  <AddIcon sx={{ mr: 0.5 }} />
                  <Typography variant="body2">Add</Typography>
                </Box>
              )}
            </Paper>
          )
        })}
      </Box>

      {/* Review Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
          {selectedDay && (
            <>
              <EditIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {selectedDay.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </>
          )}
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Prep" />
            <Tab label="Review" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Prep Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280' }}>
                Select pairs you want to watch today and fill in your analysis
              </Typography>

              <Autocomplete
                multiple
                options={MAJOR_PAIRS}
                value={selectedPairs}
                onChange={handlePairSelect}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Pairs"
                    placeholder="Add pairs..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      color="primary"
                      size="small"
                    />
                  ))
                }
                sx={{ mb: 3 }}
              />

              {/* Pair Accordions with Questions */}
              {selectedPairs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedPairs.map(pair => {
                    const completion = calculatePairCompletion(pairResponses[pair])
                    const isExpanded = expandedPair === pair

                    return (
                      <Accordion
                        key={pair}
                        expanded={isExpanded}
                        onChange={(e, expanded) => setExpandedPair(expanded ? pair : null)}
                        sx={{
                          border: '1px solid #e5e7eb',
                          '&:before': { display: 'none' },
                          boxShadow: isExpanded ? 2 : 0
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'white',
                            '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.05)' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                            <Typography sx={{ fontWeight: 600, minWidth: 100 }}>{pair}</Typography>
                            <Box sx={{ flex: 1, mx: 2 }}>
                              <LinearProgress
                                variant="determinate"
                                value={completion}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: '#e5e7eb',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: completion === 100 ? '#10b981' : '#3b82f6'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="body2" sx={{ color: '#6b7280', minWidth: 40 }}>
                              {completion}%
                            </Typography>
                            {completion === 100 && (
                              <CheckCircleIcon sx={{ color: '#10b981', ml: 1, fontSize: 20 }} />
                            )}
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                removePair(pair)
                              }}
                              sx={{ ml: 1, color: '#9ca3af' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          {Object.entries(questionsBySection).map(([section, questions]) => (
                            <Box key={section} sx={{ mb: 3 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: '#3b82f6',
                                  fontWeight: 700,
                                  mb: 2,
                                  pb: 1,
                                  borderBottom: '2px solid #3b82f6'
                                }}
                              >
                                {section}
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {questions.map(q => (
                                  <Box key={q.id}>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600, color: '#374151', mb: 1 }}
                                    >
                                      {q.text}
                                    </Typography>

                                    {q.type === 'select' ? (
                                      <FormControl component="fieldset" size="small">
                                        <RadioGroup
                                          row
                                          value={pairResponses[pair]?.[q.id] || ''}
                                          onChange={(e) => handleResponseChange(pair, q.id, e.target.value)}
                                        >
                                          {q.options.map(opt => (
                                            <FormControlLabel
                                              key={opt}
                                              value={opt}
                                              control={<Radio size="small" />}
                                              label={
                                                <Typography variant="body2">{opt}</Typography>
                                              }
                                              sx={{
                                                mr: 3,
                                                '& .MuiFormControlLabel-label': {
                                                  color: pairResponses[pair]?.[q.id] === opt ? '#1f2937' : '#6b7280'
                                                }
                                              }}
                                            />
                                          ))}
                                        </RadioGroup>
                                      </FormControl>
                                    ) : (
                                      <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        size="small"
                                        placeholder={q.placeholder}
                                        value={pairResponses[pair]?.[q.id] || ''}
                                        onChange={(e) => handleResponseChange(pair, q.id, e.target.value)}
                                        sx={{
                                          '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#f9fafb'
                                          }
                                        }}
                                      />
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    )
                  })}
                </Box>
              ) : (
                <Box sx={{
                  textAlign: 'center',
                  py: 6,
                  color: '#9ca3af',
                  border: '2px dashed #e5e7eb',
                  borderRadius: 2
                }}>
                  <Typography>Select pairs above to add your daily prep</Typography>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Review Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 3 }}>
              <Box sx={{
                textAlign: 'center',
                py: 8,
                color: '#9ca3af',
                border: '2px dashed #e5e7eb',
                borderRadius: 2
              }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Setup Journaling</Typography>
                <Typography>Coming soon - journal the setups you found today</Typography>
              </Box>
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={saveReview}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
