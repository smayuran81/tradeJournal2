export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionCookie = req.cookies.session
  
  if (!sessionCookie) {
    return res.json({ user: null })
  }

  try {
    const session = JSON.parse(sessionCookie)
    res.json({ user: session })
  } catch (error) {
    res.json({ user: null })
  }
}