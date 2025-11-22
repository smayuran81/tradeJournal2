import React, { useState } from 'react'
import { Box, Card, CardContent, Button, Typography, List, ListItem, ListItemText, Grid } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PairSelector from './PairSelector'

export default function WeeklyAnalysisWizard({ pairs = [], onStart, onAddPair }){
  const [selected, setSelected] = useState([])

  function toggle(pair){
    setSelected(s => s.includes(pair) ? s.filter(x=>x!==pair) : [...s,pair])
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Weekly Analysis Wizard
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onAddPair && onAddPair()}
        >
          Add Pair
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <PairSelector pairs={pairs} selected={selected} onToggle={toggle} onAdd={onAddPair} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Selected Pairs
              </Typography>
              {selected.length > 0 ? (
                <List sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                  {selected.map(s => (
                    <ListItem key={s} dense>
                      <ListItemText primary={s} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  No pairs selected
                </Typography>
              )}
              <Button
                variant="contained"
                fullWidth
                disabled={!selected.length}
                onClick={()=>onStart && onStart(selected)}
              >
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
