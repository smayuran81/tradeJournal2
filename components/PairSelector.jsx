import React from 'react'
import { Card, CardContent, CardHeader, Box, FormControlLabel, Checkbox, Button, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function PairSelector({ pairs = [], selected = [], onToggle, onAdd }){
  return (
    <Card>
      <CardHeader
        title="Pairs"
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => onAdd && onAdd()}
          >
            Add Pair
          </Button>
        }
      />
      <CardContent>
        <Stack spacing={1}>
          {pairs.length > 0 ? (
            pairs.map(p => (
              <FormControlLabel
                key={p.pair}
                control={
                  <Checkbox
                    checked={selected.includes(p.pair)}
                    onChange={() => onToggle && onToggle(p.pair)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {p.pair}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {p.bid} / {p.ask}
                    </Typography>
                  </Box>
                }
              />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No pairs available
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
