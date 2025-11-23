# OAuth Setup Guide

## 1. GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: Trading Journal
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/api/auth/callback/github
4. Copy Client ID and Client Secret to .env.local

## 2. Google OAuth Setup

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Configure:
   - Application type: Web application
   - Authorized redirect URIs: http://localhost:3000/api/auth/callback/google
4. Copy Client ID and Client Secret to .env.local

## 3. Environment Variables

Update .env.local with your OAuth credentials:

```
NEXTAUTH_SECRET=generate-a-random-secret-key
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-g-client-secret
```

## 4. Generate NEXTAUTH_SECRET

Run: `openssl rand -base64 32`

## Features Added

- ✅ OAuth2 authentication with GitHub and Google
- ✅ User-specific data isolation
- ✅ Protected API routes
- ✅ Session management
- ✅ Sign in/out functionality
- ✅ User profile display

## Database Changes

All trades now include `userId` field for data isolation. Each user only sees their own trades.