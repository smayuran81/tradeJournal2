import { useState, useEffect } from 'react'
import { Box, TextField, Button, Stack, Typography, Card, CardMedia, IconButton, Input } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

const PROMPTS = [
  'What worked well this week?',
  "What didn't work or surprised you?",
  'What are the concrete actions for next week?',
  'Confidence level (1-10)'
]

export default function ReviewPanel({ review = {}, onSave }) {
  const [answers, setAnswers] = useState(review.answers || PROMPTS.map(() => ''))
  const [images, setImages] = useState(review.images || [])

  useEffect(() => {
    setAnswers(review.answers || PROMPTS.map(() => ''))
    setImages(review.images || [])
  }, [review])

  function setAns(i, v) { setAnswers(a => { const c = [...a]; c[i] = v; return c }) }

  async function addFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    
    try {
      const uploadPromises = files.map(async (file) => {
        const reader = new FileReader()
        return new Promise((resolve) => {
          reader.onload = async () => {
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: reader.result,
                filename: `review-${Date.now()}-${file.name}`
              })
            })
            const result = await response.json()
            resolve(result.success ? result.url : null)
          }
          reader.readAsDataURL(file)
        })
      })
      
      const imageUrls = (await Promise.all(uploadPromises)).filter(Boolean)
      setImages(img => [...img, ...imageUrls])
    } catch (error) {
      console.error('Failed to upload images:', error)
      alert('Failed to upload images. Please try again.')
    }
  }

  function removeImage(i) { setImages(img => img.filter((_, idx) => idx !== i)) }

  function save() { onSave && onSave({ answers, images }) }

  return (
    <Stack spacing={3}>
      {PROMPTS.map((p, i) => (
        <TextField
          key={i}
          fullWidth
          multiline
          rows={4}
          label={p}
          value={answers[i] || ''}
          onChange={e => setAns(i, e.target.value)}
          variant="outlined"
        />
      ))}

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Images
        </Typography>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={addFiles}
          sx={{ display: 'none' }}
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUploadIcon />}
          >
            Upload Images
          </Button>
        </label>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {images.map((src, idx) => (
            <Box key={idx} sx={{ position: 'relative' }}>
              <Card sx={{ width: 120, height: 80 }}>
                <CardMedia
                  component="img"
                  height={80}
                  image={src}
                  alt={`review-${idx}`}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: 'error.main',
                  color: 'white',
                  '&:hover': { backgroundColor: 'error.dark' },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={save}>
          Save Review
        </Button>
      </Box>
    </Stack>
  )
}
