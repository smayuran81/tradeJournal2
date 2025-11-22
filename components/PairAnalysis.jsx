import React, { useState, useEffect } from 'react'
import { Box, Card, CardContent, CardActions, Button, Typography, Tabs, Tab, TextField, Select, MenuItem, Stack, Grid, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

export default function PairAnalysis({ pair, data = {}, onSave }){
  const [tab, setTab] = useState(0)
  const [monthly, setMonthly] = useState(data.timeframes?.monthly || { trend: '', notes: '' })
  const [weekly, setWeekly] = useState(data.timeframes?.weekly || { trend: '', notes: '' })
  const [daily, setDaily] = useState(data.timeframes?.daily || { trend: '', notes: '' })
  const [bias, setBias] = useState(data.bias || '')
  const [levels, setLevels] = useState(data.levels || [])
  const [observations, setObservations] = useState(data.observations || '')
  const [plan, setPlan] = useState(data.plan || { weeklyPlan: '', entryTriggers: '', invalidation: '', risk: '' })

  useEffect(() => { setMonthly(data.timeframes?.monthly || { trend: '', notes: '' }) }, [data])

  function saveAll(){
    const payload = {
      timeframes: { monthly, weekly, daily },
      bias, levels, observations, plan,
      updatedAt: Date.now()
    }
    onSave && onSave(payload)
  }

  function addLevel(){ setLevels(l => [...l, { id: Date.now(), type: 'Supply', note: '' }]) }
  function setLevelText(id, text){ setLevels(l => l.map(it => it.id===id?{...it,note:text}:it)) }
  function setLevelType(id, type){ setLevels(l => l.map(it => it.id===id?{...it,type}:it)) }
  function removeLevel(id){ setLevels(l => l.filter(it => it.id!==id)) }

  const tabs = ['Summary', 'Levels', 'Plan', 'Daily Checklist']

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {pair}
          </Typography>
          <Button variant="contained" onClick={saveAll}>
            Save
          </Button>
        </Box>

        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', mb: 2 }}>
          {tabs.map((t, i) => (
            <Tab key={i} label={t} />
          ))}
        </Tabs>

        {tab === 0 && (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Monthly Trend
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={monthly.trend}
                  onChange={e=>setMonthly(m=>({...m,trend:e.target.value}))}
                >
                  <MenuItem value="">--</MenuItem>
                  <MenuItem value="Uptrend">Uptrend</MenuItem>
                  <MenuItem value="Downtrend">Downtrend</MenuItem>
                  <MenuItem value="Ranging">Ranging</MenuItem>
                </Select>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  placeholder="Notes"
                  value={monthly.notes}
                  onChange={e=>setMonthly(m=>({...m,notes:e.target.value}))}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Weekly Trend
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={weekly.trend}
                  onChange={e=>setWeekly(w=>({...w,trend:e.target.value}))}
                >
                  <MenuItem value="">--</MenuItem>
                  <MenuItem value="Uptrend">Uptrend</MenuItem>
                  <MenuItem value="Downtrend">Downtrend</MenuItem>
                  <MenuItem value="Ranging">Ranging</MenuItem>
                </Select>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  placeholder="Notes"
                  value={weekly.notes}
                  onChange={e=>setWeekly(w=>({...w,notes:e.target.value}))}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Daily Trend
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={daily.trend}
                  onChange={e=>setDaily(d=>({...d,trend:e.target.value}))}
                >
                  <MenuItem value="">--</MenuItem>
                  <MenuItem value="Uptrend">Uptrend</MenuItem>
                  <MenuItem value="Downtrend">Downtrend</MenuItem>
                  <MenuItem value="Ranging">Ranging</MenuItem>
                </Select>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  placeholder="Notes"
                  value={daily.notes}
                  onChange={e=>setDaily(d=>({...d,notes:e.target.value}))}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Bias for the Week
              </Typography>
              <Select
                fullWidth
                size="small"
                value={bias}
                onChange={e=>setBias(e.target.value)}
              >
                <MenuItem value="">--</MenuItem>
                <MenuItem value="Bullish">Bullish</MenuItem>
                <MenuItem value="Bearish">Bearish</MenuItem>
                <MenuItem value="Neutral">Neutral</MenuItem>
              </Select>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={5}
              label="Notes / Observations"
              value={observations}
              onChange={e=>setObservations(e.target.value)}
              variant="outlined"
            />
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Key Areas & Levels
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addLevel}>
                Add Level
              </Button>
            </Box>
            <Stack spacing={2}>
              {levels.map(it => (
                <Box key={it.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Select
                    value={it.type}
                    onChange={e=>setLevelType(it.id,e.target.value)}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="Supply">Supply</MenuItem>
                    <MenuItem value="Demand">Demand</MenuItem>
                    <MenuItem value="Order Block">Order Block</MenuItem>
                    <MenuItem value="Imbalance">Imbalance</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Description / levels"
                    value={it.note}
                    onChange={e=>setLevelText(it.id,e.target.value)}
                  />
                  <IconButton size="small" onClick={()=>removeLevel(it.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Plan for The Week (HTF)"
              value={plan.weeklyPlan}
              onChange={e=>setPlan(p=>({...p,weeklyPlan:e.target.value}))}
              variant="outlined"
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Triggers for Entry"
                  value={plan.entryTriggers}
                  onChange={e=>setPlan(p=>({...p,entryTriggers:e.target.value}))}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Invalidation Points"
                  value={plan.invalidation}
                  onChange={e=>setPlan(p=>({...p,invalidation:e.target.value}))}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Risk Management Plan"
              value={plan.risk}
              onChange={e=>setPlan(p=>({...p,risk:e.target.value}))}
              variant="outlined"
            />
          </Stack>
        )}

        {tab === 3 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Daily Checklist (Mon–Fri)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <TableCell>Day</TableCell>
                  <TableCell align="center">Bias Aligned?</TableCell>
                  <TableCell align="center">Setup Forming?</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {['Mon','Tue','Wed','Thu','Fri'].map(d => (
                  <TableRow key={d}>
                    <TableCell sx={{ fontWeight: 600 }}>{d}</TableCell>
                    <TableCell align="center"><input type="checkbox" /></TableCell>
                    <TableCell align="center"><input type="checkbox" /></TableCell>
                    <TableCell><input style={{width:'100%', border: 'none', padding: '4px'}} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
