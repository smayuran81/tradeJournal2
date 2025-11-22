import { AppBar, Toolbar, IconButton, Button, Select, MenuItem, Box, Chip } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'

export default function Topbar({ onToggle, userName, weekKey, onWeekChange, onNavigate }) {
  return (
    <AppBar position="static" sx={{ backgroundColor: 'background.paper', color: 'text.primary', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          edge="start"
          color="inherit"
          onClick={onToggle}
          aria-label="toggle sidebar"
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(90deg, #2b6ef6, #4f7bff)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Trading Journal
        </Box>
        <Select
          value={weekKey}
          onChange={e => onWeekChange && onWeekChange(e.target.value)}
          size="small"
          sx={{ minWidth: 120, ml: 2 }}
        >
          <MenuItem value={weekKey}>{weekKey}</MenuItem>
        </Select>
        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
          <Button variant="text" size="small" onClick={() => onNavigate && onNavigate('dashboard')}>
            Dashboard
          </Button>
          <Button variant="text" size="small" onClick={() => onNavigate && onNavigate('wizard')}>
            Wizard
          </Button>
          <Button variant="text" size="small" onClick={() => onNavigate && onNavigate('history')}>
            History
          </Button>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Chip label={userName} size="small" variant="outlined" />
      </Toolbar>
    </AppBar>
  )
}
