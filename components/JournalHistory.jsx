import React, { useState, useEffect } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

export default function JournalHistory(){
  const [data, setData] = useState([])

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('weekly-data')
      const parsed = raw ? JSON.parse(raw) : {}
      const rows = []
      Object.keys(parsed).forEach(week => {
        const w = parsed[week]
        (w.pairs||[]).forEach(p => {
          const rev = (w.reviews||{})[p.pair] || {}
          const result = rev.review?.result || ''
          rows.push({ week, pair: p.pair, bias: rev.plan?.bias || '', result, notes: rev.review?.answers?.join(' | ') || '' })
        })
      })
      setData(rows.reverse())
    }catch(e){}
  },[])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Journal History
      </Typography>
      {data.length > 0 ? (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Week</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pair</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bias</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Result</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((r, i)=> (
                <TableRow key={i} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}>
                  <TableCell>{r.week}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.pair}</TableCell>
                  <TableCell>{r.bias}</TableCell>
                  <TableCell>{r.result}</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Card>
          <CardContent>
            <Typography color="textSecondary">
              No journal entries yet
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
