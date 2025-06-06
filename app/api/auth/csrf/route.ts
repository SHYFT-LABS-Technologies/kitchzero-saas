import { type NextRequest, NextResponse } from 'next/server';
import {
  generateCsrfToken,
  CSRF_FALLBACK_COOKIE_NAME, // Using fallback for wider initial compatibility (e.g. non-HTTPS dev environments)
  CSRF_COOKIE_BASE_OPTIONS
} from '@/lib/security'; // Assuming @ refers to root, adjust if necessary based on actual tsconfig paths

/**
 * GET /api/auth/csrf
 *
 * Purpose:
 * This endpoint generates a new CSRF (Cross-Site Request Forgery) token.
 * It is designed to be called by the client-side application, typically when it initializes
 * or before making a state-changing request, to obtain a fresh token.
 *
 * Token Delivery:
 * 1. Cookie: The CSRF token is set as an HttpOnly cookie. This cookie is automatically
 *    sent by the browser in subsequent requests to the same domain. The HttpOnly flag
 *    prevents JavaScript from directly accessing this cookie, mitigating XSS attacks
 *    that might try to steal the token.
 * 2. JSON Response Body: The CSRF token is also returned in the JSON response body (`{ csrfToken: "..." }`).
 *    The client-side application needs to read this token from the response body and store it
 *    (e.g., in JavaScript memory or local storage). For subsequent state-changing requests
 *    (POST, PUT, DELETE, etc.), the client must include this token in a custom HTTP header
 *    (e.g., `X-CSRF-Token`).
 *
 * Why both?
 * The "double submit cookie" pattern is a common way to implement CSRF protection.
 * - The server sets a cookie.
 * - The client sends the same token value in a custom header.
 * - The server verifies that the token from the cookie (implicitly sent by the browser)
 *   matches the token from the custom header (explicitly sent by the client).
 * This ensures that the request originated from your own frontend, as an attacker's site
 * cannot read the cookie to set the header, nor can it set the cookie for your domain.
 */
export async function GET(request: NextRequest) {
  try {
    const csrfToken = generateCsrfToken();

    // Determine if the environment is production for the 'secure' flag on the cookie
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({ csrfToken });

    // Set the CSRF token in an HttpOnly cookie.
    // The client-side JavaScript will read the token from the JSON response
    // and send it back in a custom header for mutating requests.
    response.cookies.set(
      CSRF_FALLBACK_COOKIE_NAME, // Using fallback for now; __Host- prefix has stricter requirements
      csrfToken,
      {
        ...CSRF_COOKIE_BASE_OPTIONS,
        secure: isProduction, // Cookie should only be sent over HTTPS in production
        // Consider adding maxAge if desired, e.g., maxAge: 60 * 60 (1 hour)
        // If not set, it's a session cookie by default (deleted when browser closes).
      }
    );

    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    // Avoid leaking detailed error information to the client
    return NextResponse.json(
      { error: 'Failed to generate CSRF token. Please try again later.' },
      { status: 500 }
    );
  }
}
