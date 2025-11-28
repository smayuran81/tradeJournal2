import { Drawer, List, ListItemButton, ListItemText, ListItemIcon, Divider, Box } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TimelineIcon from '@mui/icons-material/Timeline'
import AssignmentIcon from '@mui/icons-material/Assignment'
import HistoryIcon from '@mui/icons-material/History'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export default function Sidebar({ open = true, onNavigate, onClose }) {
  const navItems = [
    { label: 'Weekly Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
    { label: 'Weekly Analysis', icon: <TimelineIcon />, view: 'wizard' },
    { label: 'Current Analysis', icon: <AssignmentIcon />, view: 'analysis' },
    { label: 'Journal History', icon: <HistoryIcon />, view: 'history' },
    { label: 'Trade Journal', icon: <TrendingUpIcon />, view: 'trade-journal' },
    { label: 'Oanda Orders', icon: <AccountBalanceIcon />, view: 'oanda-transactions' },
    { label: 'Strategy Playbook', icon: <MenuBookIcon />, view: 'strategy-playbook' },
  ]

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.view}
            onClick={() => {
              onNavigate && onNavigate(item.view)
              onClose && onClose()
            }}
            sx={{
              mb: 1,
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'rgba(43, 110, 246, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </Box>
  )

  if (!open) return null

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          backgroundColor: 'background.paper',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          marginTop: '56px',
          height: 'calc(100vh - 56px)',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {drawerContent}
      </Box>
    </Drawer>
  )
}
