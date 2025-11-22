import { useState } from 'react'
import { Box, TextField, Button, Stack } from '@mui/material'

export default function NewPairForm({ onAdd }) {
  const [pair, setPair] = useState('')
  const [bid, setBid] = useState('')
  const [ask, setAsk] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!pair) return
    onAdd && onAdd({ pair, bid: bid || '-', ask: ask || '-' })
    setPair('')
    setBid('')
    setAsk('')
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <TextField
        placeholder="Pair (e.g. EUR/USD)"
        value={pair}
        onChange={e => setPair(e.target.value)}
        size="small"
        variant="outlined"
      />
      <TextField
        placeholder="Bid"
        value={bid}
        onChange={e => setBid(e.target.value)}
        size="small"
        variant="outlined"
        sx={{ width: 90 }}
      />
      <TextField
        placeholder="Ask"
        value={ask}
        onChange={e => setAsk(e.target.value)}
        size="small"
        variant="outlined"
        sx={{ width: 90 }}
      />
      <Button type="submit" variant="contained" size="small">
        Add Pair
      </Button>
    </Box>
  )
}
