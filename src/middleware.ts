import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserIdentifier } from '@/lib/utils/tokenUtils';

// Define the header name we expect the token in
const TOKEN_HEADER_NAME = 'X-Access-Token';
const USER_ID_HEADER_NAME = 'X-User-Identifier';

export function middleware(request: NextRequest) {
  // Add diagnostic logging
  console.log(`[Middleware] Intercepted request for: ${request.nextUrl.pathname}`);
  
  const pathname = request.nextUrl.pathname;

  const publicApiRoutes = new Set([
    '/api/providers',
  ]);

  // Only apply validation to specific API paths (e.g., all under /api/ but not auth routes if you had them)
  // Adjust the path check as needed for your application structure.
  if (pathname.startsWith('/api/')) {
    if (publicApiRoutes.has(pathname)) {
      console.log(`[Middleware] Public API route passthrough: ${pathname}`);
      return NextResponse.next();
    }

    const token = request.headers.get(TOKEN_HEADER_NAME);
    
    // Add diagnostic logging without exposing the actual token
    console.log(`[Middleware] API Check - Path: ${pathname}, Token Provided: ${token ? 'Yes' : 'No'}`);
    
    const userIdentifier = getUserIdentifier(token);

    if (!userIdentifier) {
      // Token is missing or invalid, reject the request
      console.warn(`[Middleware] ACCESS DENIED for ${pathname}. No valid user identifier found. Token Provided: ${token ? 'Yes' : 'No'}`);
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Authentication Required: Invalid or missing access token.' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    // Token is valid, proceed with the request
    // Add the user identifier to the request headers for downstream API routes to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(USER_ID_HEADER_NAME, userIdentifier);

    console.log(`[Middleware] ACCESS GRANTED: User '${userIdentifier}' to ${pathname}`);

    // Clone the request with the added user identifier header
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Add diagnostic logging for non-API routes
  console.log(`[Middleware] Passing through non-API request: ${pathname}`);
  
  // Allow requests that don't match the API path prefix (e.g., page loads)
  return NextResponse.next();
}

// Configure the middleware to run only on API routes
export const config = {
  matcher: ['/api/:path*'], // Apply to all routes under /api/
}; 
