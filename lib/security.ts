import crypto from 'crypto';
import { type NextRequest } from 'next/server';

/**
 * Generates a cryptographically strong random token used for CSRF (Cross-Site Request Forgery) protection.
 * This token is a key component of the stateless double submit cookie pattern.
 * It is intended to be sent to the client where it's stored in two ways:
 * 1. As an HttpOnly cookie (cannot be accessed by client-side JavaScript).
 * 2. Made available to client-side JavaScript (e.g., returned in the response body of a dedicated endpoint).
 * For state-changing requests, the client must send this token back in a custom HTTP header.
 * The server then verifies if the token from the header matches the token in the HttpOnly cookie.
 *
 * @returns {string} A 32-byte random string, hex encoded, to be used as a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Recommended cookie name for the CSRF token when using the `__Host-` prefix for enhanced security.
 * The `__Host-` prefix helps to prevent cookie tossing from subdomains by ensuring the cookie
 * is set by the host itself, not a subdomain.
 *
 * Requirements for using the `__Host-` prefix:
 * - The cookie must be set with the `Secure` attribute (sent only over HTTPS).
 * - The cookie must be set from a secure (HTTPS) URI.
 * - The cookie must not have a `Domain` attribute (this restricts the cookie to the host that set it).
 * - The cookie's `Path` attribute must be set to `/`.
 *
 * This name is intended for the HttpOnly cookie part of the double submit cookie CSRF protection pattern.
 */
export const CSRF_HOST_COOKIE_NAME = '__Host-csrf-token';

/**
 * Fallback cookie name for the CSRF token if the stricter `__Host-` prefix requirements cannot be met
 * (e.g., during development in a non-HTTPS environment, or if path/domain attributes are needed for other reasons).
 * This name is used for the HttpOnly cookie in the double submit cookie CSRF protection pattern.
 * It's crucial that this cookie is set as `HttpOnly`.
 */
export const CSRF_FALLBACK_COOKIE_NAME = 'csrf-token';

/**
 * Name of the custom HTTP header used by the client to send the CSRF token back to the server.
 * In the stateless double submit cookie pattern, the client-side JavaScript reads the CSRF token
 * (which was initially provided by the server, possibly in a response body when the HttpOnly cookie was set)
 * and includes it in this header for all state-changing requests (e.g., POST, PUT, DELETE).
 * The server then verifies that the token from this header matches the token found in the HttpOnly cookie
 * (which is automatically sent by the browser).
 */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Base options for setting the CSRF HttpOnly cookie.
 * These options contribute to the security and proper functioning of the double submit cookie pattern.
 * The `secure` attribute should be added dynamically based on whether the environment is HTTPS.
 *
 * - `httpOnly: true`: Prevents client-side JavaScript from accessing the cookie, mitigating XSS attacks
 *   aimed at stealing the CSRF token from the cookie.
 * - `path: '/'`: Makes the cookie available for all paths under the domain, ensuring it's sent
 *   with requests to any API endpoint on the site.
 * - `sameSite: 'lax'`: Provides a good balance of security and usability. It protects against CSRF
 *   from most cross-site requests initiated by third-party websites, while still allowing the cookie
 *   to be sent during top-level navigations (e.g., when a user clicks a link to your site).
 *   For stricter protection, 'strict' could be considered, but 'lax' is a common default.
 */
export const CSRF_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
};

/**
 * Verifies the CSRF token for a given request based on the stateless double submit cookie pattern.
 *
 * This pattern involves two main components for verification:
 * 1. An HttpOnly cookie containing the CSRF token, automatically sent by the browser with requests
 *    to the server. This cookie should have been set by the server at an earlier point (e.g., via `/api/auth/csrf`).
 * 2. A custom HTTP header (defined by `CSRF_HEADER_NAME`) where the client-side application explicitly
 *    sends the same CSRF token. The client obtains this token value not from the cookie (as it's HttpOnly)
 *    but from a value previously sent by the server in a response body (e.g., from `/api/auth/csrf`).
 *
 * This function checks for the presence of both tokens (one from the header, one from the cookie)
 * and ensures they are identical. A match indicates that the request likely originated from the
 * legitimate frontend application that had access to the token value to set the custom header.
 * An attacker, even if they can make a user's browser send a request to your server, cannot typically
 * read the HttpOnly cookie's value from another domain, nor can they set the custom header correctly
 * for a cross-origin request unless there are other vulnerabilities like XSS.
 *
 * @param {NextRequest} request - The incoming Next.js API request object.
 * @returns {boolean} Returns `true` if CSRF validation passes (both tokens exist and match).
 *                    Returns `false` if validation fails (tokens are missing, or they do not match).
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const tokenFromHeader = request.headers.get(CSRF_HEADER_NAME);

  // This function relies on CSRF_FALLBACK_COOKIE_NAME being used consistently
  // by the endpoint that sets the CSRF cookie (e.g., /api/auth/csrf).
  // If the cookie-setting endpoint were to use CSRF_HOST_COOKIE_NAME under certain conditions (like HTTPS),
  // this verification logic would need to be aware of that or check for both potential cookie names.
  // For simplicity in this implementation, CSRF_FALLBACK_COOKIE_NAME is used as the single source of truth for the cookie name.
  const tokenFromCookie = request.cookies.get(CSRF_FALLBACK_COOKIE_NAME)?.value;

  if (!tokenFromHeader || !tokenFromCookie) {
    if (!tokenFromHeader) {
      console.warn(`CSRF verification failed: Missing ${CSRF_HEADER_NAME} header. This header should be sent by the client with the token value.`);
    }
    if (!tokenFromCookie) {
      console.warn(`CSRF verification failed: Missing ${CSRF_FALLBACK_COOKIE_NAME} cookie. This HttpOnly cookie should be automatically sent by the browser.`);
    }
    return false;
  }

  if (tokenFromHeader !== tokenFromCookie) {
    // Avoid logging the tokens themselves in production environments for security reasons,
    // or consider logging only truncated or hashed versions if necessary for debugging.
    // The current logging is primarily for development insight.
    console.warn('CSRF verification failed: Token mismatch. The token from the header did not match the token from the cookie.');
    // For more detailed debugging (use with caution, especially in prod):
    // console.warn('CSRF verification failed: Token mismatch.', { headerToken: tokenFromHeader, cookieToken: tokenFromCookie });
    return false;
  }

  return true;
}
