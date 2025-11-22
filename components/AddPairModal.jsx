import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material'

export default function AddPairModal({ open, onClose, onAdd }){
  const [symbol, setSymbol] = useState('')

  function submit(e){ 
    e.preventDefault()
    onAdd && onAdd({ pair: symbol, bid: '-', ask: '-' })
    setSymbol('')
    onClose && onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Pair</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            placeholder="Pair Symbol (e.g. EURUSD)"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            autoFocus
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
