import { useState } from 'react'
import { Box, TextField, Button, Stack, Checkbox, FormControlLabel, Typography, LinearProgress } from '@mui/material'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function ChecklistPanel({ plan = {}, progress = {}, onToggle }) {
  const [day, setDay] = useState((new Date()).getDay() === 0 ? 'Sun' : DAYS[(new Date()).getDay()-1])

  const checklist = plan.checklist || []
  const dayKey = day
  const dayProgress = (progress.daily && progress.daily[dayKey]) || {}

  function toggleItem(id) {
    const next = { ...(progress.daily || {}) }
    next[dayKey] = { ...(next[dayKey] || {}) }
    next[dayKey][id] = !dayProgress[id]
    onToggle && onToggle({ ...progress, daily: next })
  }

  const completed = checklist.filter(it => (dayProgress[it.id])).length
  const pct = checklist.length ? Math.round((completed / checklist.length) * 100) : 0

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {DAYS.map(d => (
            <Button
              key={d}
              size="small"
              variant={d === day ? 'contained' : 'outlined'}
              onClick={() => setDay(d)}
            >
              {d}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {completed}/{checklist.length} complete
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              width: 100,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.05)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #0f9d58, #0f9d58)',
              },
            }}
          />
        </Box>
      </Box>

      <Box>
        <Stack spacing={1}>
          {checklist.length > 0 ? (
            checklist.map(it => (
              <FormControlLabel
                key={it.id}
                control={
                  <Checkbox
                    checked={!!dayProgress[it.id]}
                    onChange={() => toggleItem(it.id)}
                  />
                }
                label={it.text || <em>Untitled</em>}
              />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No checklist items yet
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Mid-week notes"
          value={progress.midweekNotes || ''}
          onChange={e => onToggle && onToggle({ ...progress, midweekNotes: e.target.value })}
          variant="outlined"
        />
      </Box>
    </Stack>
  )
}
