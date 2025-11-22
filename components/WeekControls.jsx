import { Box, Button, Select, MenuItem } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function WeekControls({ weekKey, onWeekChange, onAddPair, showAddPair = true }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {showAddPair && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddPair}
        >
          Add Pair
        </Button>
      )}
      <Select
        value={weekKey}
        onChange={e => onWeekChange(e.target.value)}
        size="small"
        sx={{ minWidth: 140 }}
      >
        {generateWeekKeys(4).map(k => (
          <MenuItem key={k} value={k}>{k}</MenuItem>
        ))}
      </Select>
    </Box>
  )
}

function getWeekKey(d) {
  const date = new Date(d)
  const day = date.getDay() || 7
  const monday = new Date(date.getTime() - (day - 1) * 86400000)
  return monday.toISOString().slice(0,10)
}

function generateWeekKeys(n = 4) {
  const out = []
  const now = new Date()
  for (let i=0;i<n;i++){
    const d = new Date(now.getTime() - i * 7 * 86400000)
    out.push(getWeekKey(d))
  }
  return out
}