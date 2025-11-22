import { AppBar, Toolbar, IconButton, Button, Select, MenuItem, Box, Chip, Avatar, Menu } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useState } from 'react'

export default function Topbar({ onToggle, userName, userImage, onSignOut, isAdmin }) {
  const [anchorEl, setAnchorEl] = useState(null)
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
          TradingJournal Pro
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            src={userImage} 
            alt={userName}
            sx={{ width: 32, height: 32, cursor: 'pointer' }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          />
          <Chip label={userName} size="small" variant="outlined" />
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => { window.location.href = '/trade-journal'; setAnchorEl(null) }}>Trade Journal</MenuItem>
          <MenuItem onClick={() => { onSignOut(); setAnchorEl(null) }}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
