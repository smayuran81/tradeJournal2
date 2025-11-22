import { useState, useEffect } from 'react'
import { Box, TextField, Button, Stack, Typography } from '@mui/material'

const PROMPTS = [
  'What worked well this week?',
  "What didn't work or surprised you?",
  'What are the concrete actions for next week?',
  'Confidence level (1-10)'
]

export default function ReviewPanel({ review = {}, onSave }) {
  const [answers, setAnswers] = useState(review.answers || PROMPTS.map(() => ''))

  useEffect(() => {
    setAnswers(review.answers || PROMPTS.map(() => ''))
  }, [review])

  function setAns(i, v) { setAnswers(a => { const c = [...a]; c[i] = v; return c }) }

  function save() { onSave && onSave({ answers }) }

  return (
    <Stack spacing={3}>
      {PROMPTS.map((p, i) => (
        <TextField
          key={i}
          fullWidth
          multiline
          rows={4}
          label={p}
          value={answers[i] || ''}
          onChange={e => setAns(i, e.target.value)}
          variant="outlined"
        />
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={save}>
          Save Review
        </Button>
      </Box>
    </Stack>
  )
}
