// Hardcoded users for demo
const USERS = {
  'admin': { password: 'admin123', userId: 'user_admin', name: 'Admin User' },
  'trader1': { password: 'trader123', userId: 'user_trader1', name: 'Trader One' },
  'demo': { password: 'demo123', userId: 'user_demo', name: 'Demo User' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const user = USERS[username]
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Set session cookie
  res.setHeader('Set-Cookie', `session=${JSON.stringify({ userId: user.userId, username, name: user.name })}; Path=/; HttpOnly; Max-Age=86400`)
  
  res.json({ success: true, user: { userId: user.userId, username, name: user.name } })
}