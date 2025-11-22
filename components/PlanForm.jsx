import { useState } from 'react'
import { Box, TextField, Button, Typography, Stack, IconButton, Card, CardContent } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

export default function PlanForm({ initial = {}, onSave }) {
  const [objectives, setObjectives] = useState(initial.objectives || [''])
  const [checklist, setChecklist] = useState(initial.checklist || [{ id: Date.now(), text: '' }])
  const [targets, setTargets] = useState(initial.targets || '')

  function setObjective(i, v) {
    setObjectives(o => { const copy = [...o]; copy[i] = v; return copy })
  }

  function addObjective() { setObjectives(o => [...o, '']) }
  function removeObjective(i) { setObjectives(o => o.filter((_, idx) => idx !== i)) }

  function setItemText(id, text) {
    setChecklist(c => c.map(it => it.id === id ? { ...it, text } : it))
  }
  function addItem() { setChecklist(c => [...c, { id: Date.now(), text: '' }]) }
  function removeItem(id) { setChecklist(c => c.filter(it => it.id !== id)) }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Objectives
          </Typography>
          <Stack spacing={2}>
            {objectives.map((o, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={o}
                  onChange={e => setObjective(i, e.target.value)}
                  variant="outlined"
                />
                <IconButton size="small" onClick={() => removeObjective(i)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            onClick={addObjective}
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
          >
            Add Objective
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Weekly Checklist
          </Typography>
          <Stack spacing={2}>
            {checklist.map(item => (
              <Box key={item.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={item.text}
                  onChange={e => setItemText(item.id, e.target.value)}
                  variant="outlined"
                />
                <IconButton size="small" onClick={() => removeItem(item.id)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
          >
            Add Checklist Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Targets / Notes
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={targets}
            onChange={e => setTargets(e.target.value)}
            variant="outlined"
          />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => onSave && onSave({ objectives: objectives.filter(Boolean), checklist, targets })}
        >
          Save Plan
        </Button>
      </Box>
    </Stack>
  )
}
