import { v2 as cloudinary } from 'cloudinary'

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

  const sessionCookie = req.cookies.session
  if (!sessionCookie) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  
  let session
  try {
    session = JSON.parse(sessionCookie)
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid session' })
  }

  try {
    const { image, filename } = req.body
    
    // Configure Cloudinary for each request
    cloudinary.config({
      cloud_name: 'dd6vtpwer',
      api_key: '179617184476631',
      api_secret: 'w0IT-tATI_UYzX1kSbJ6G01SrS0',
    })
    
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dd6vtpwer',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    })
    
    const result = await cloudinary.uploader.upload(image, {
      public_id: filename,
      folder: 'trade-journal',
      resource_type: 'auto',
    })

    console.log('Upload successful:', result.secure_url)
    res.status(200).json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ success: false, error: error.message || 'Upload failed' })
  }
}