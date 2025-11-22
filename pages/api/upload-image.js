import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, filename } = req.body
    
    const result = await cloudinary.uploader.upload(image, {
      public_id: filename,
      folder: 'trade-journal',
      resource_type: 'auto',
      format: 'jpg',
      quality: 'auto:good',
    })

    res.status(200).json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
}