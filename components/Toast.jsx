import React from 'react'
import { Stack, Alert } from '@mui/material'

export default function Toasts({ toasts = [] }){
  return (
    <Stack
      sx={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 9999,
        gap: 1,
      }}
    >
      {toasts.map(t => (
        <Alert key={t.id} severity={t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : 'info'}>
          {t.message}
        </Alert>
      ))}
    </Stack>
  )
}
