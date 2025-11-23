// Middleware disabled - using cookie-based auth in individual API routes
export function middleware(request) {
  // No middleware needed for cookie-based auth
  return
}

export const config = {
  matcher: []
}