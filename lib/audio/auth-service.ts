/**
 * Authentication Service
 * Handles admin API authentication using Bearer tokens
 */

/**
 * Validate admin bearer token
 *
 * @param authHeader - Authorization header value
 * @returns True if valid admin token
 */
export function validateAdminToken(authHeader: string | null): boolean {
  if (!authHeader) return false

  const token = extractBearerToken(authHeader)
  if (!token) return false

  const validTokens = getValidAdminTokens()
  return validTokens.includes(token)
}

/**
 * Extract bearer token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string): string | null {
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/**
 * Get valid admin tokens from environment
 * Supports multiple tokens separated by commas
 *
 * @returns Array of valid tokens
 */
function getValidAdminTokens(): string[] {
  const tokenEnv = process.env.ADMIN_API_TOKEN
  if (!tokenEnv) {
    console.warn('ADMIN_API_TOKEN not configured - admin endpoints disabled')
    return []
  }

  return tokenEnv.split(',').map(t => t.trim()).filter(Boolean)
}

/**
 * Create authorization error response
 *
 * @returns Response object with 401 status
 */
export function createUnauthorizedResponse() {
  return Response.json(
    {
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
    },
    { status: 401 }
  )
}

/**
 * Middleware function to protect admin routes
 * Usage: const user = await requireAdminAuth(request)
 *
 * @param request - Request object
 * @returns True if authenticated, throws Response if not
 */
export function requireAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')

  if (!validateAdminToken(authHeader)) {
    throw createUnauthorizedResponse()
  }

  return true
}

/**
 * Rate limiting for admin endpoints (optional enhancement)
 * Uses in-memory store, replace with Redis for production multi-instance
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Check rate limit for admin operations
 *
 * @param identifier - Unique identifier (IP, token hash, etc.)
 * @param maxRequests - Max requests per window
 * @param windowMs - Time window in milliseconds
 * @returns True if within limit
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // Clean up old records periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

/**
 * Create rate limit exceeded response
 *
 * @param resetAt - Timestamp when limit resets
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(resetAt: number) {
  return Response.json(
    {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
      },
    }
  )
}
