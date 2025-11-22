import React from 'react'
import { Card, CardContent, CardActions, Grid, LinearProgress, Box, Typography, Button, Chip, Stack } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

function percentLabel(n){
  return `${n}%`
}

export default function Dashboard({ pairs = [], reviews = {}, onOpenPair }){
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  function computeProgressDetails(pair){
    const rev = reviews[pair] || {}
    const plan = rev.plan || {}
    const checklist = plan.checklist || []
    const progress = rev.progress || { daily: {} }
    const daily = progress.daily || {}

    const totalPossible = checklist.length * DAYS.length
    let totalChecked = 0
    DAYS.forEach(d => {
      const dayMap = daily[d] || {}
      checklist.forEach(it => { if (dayMap[it.id]) totalChecked += 1 })
    })
    const pct = totalPossible ? Math.round((totalChecked / totalPossible) * 100) : 0
    return { pct, totalChecked, totalPossible }
  }

  function fmtDate(ts){
    if (!ts) return '—'
    try{ const d = new Date(ts); return d.toLocaleString() }catch(e){ return '—' }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        Weekly Dashboard
      </Typography>
      <Grid container spacing={2}>
        {pairs.map(p => {
          const { pct, totalChecked, totalPossible } = computeProgressDetails(p.pair)
          const hasPlan = !!(reviews[p.pair] && reviews[p.pair].plan)
          const hasReview = !!(reviews[p.pair] && reviews[p.pair].review)
          const updatedAt = reviews[p.pair]?.meta?.updatedAt || reviews[p.pair]?.plan?.updatedAt || reviews[p.pair]?.review?.updatedAt || null
          
          return (
            <Grid item xs={12} sm={6} md={4} key={p.pair}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {p.pair}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {p.bid} / {p.ask}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {percentLabel(pct)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #2b6ef6, #4f7bff)',
                        },
                      }}
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                      {totalChecked}/{totalPossible} checks
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      icon={hasPlan ? <AssignmentIcon /> : <WarningIcon />}
                      label={hasPlan ? 'Plan' : 'No plan'}
                      size="small"
                      variant={hasPlan ? 'filled' : 'outlined'}
                      color={hasPlan ? 'default' : 'warning'}
                    />
                    {hasReview && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Reviewed"
                        size="small"
                        variant="filled"
                        color="success"
                      />
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="textSecondary">
                      {fmtDate(updatedAt)}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={() => onOpenPair && onOpenPair(p, 'daily')}
                  >
                    Open
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
