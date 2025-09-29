import { logWarning, logInfo } from './logging';

// Cache the parsed token map to avoid repeated parsing
let tokenMap: Record<string, string> | null = null;

function getTokenMap(): Record<string, string> {
  // Return cached map if available
  if (tokenMap) {
    return tokenMap;
  }

  try {
    const tokensEnv = process.env.ACCESS_TOKENS;
    if (!tokensEnv) {
      logWarning('ACCESS_TOKENS environment variable is not set.');
      console.warn('[TokenUtils] ACCESS_TOKENS environment variable is not set.');
      tokenMap = {}; // Set empty map to avoid retrying parse
      return tokenMap;
    }
    const parsed = JSON.parse(tokensEnv) as Record<string, string>;
    // Basic validation: Ensure it's a non-null object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      logWarning('ACCESS_TOKENS environment variable is not a valid JSON object.');
      console.warn('[TokenUtils] ACCESS_TOKENS environment variable is not a valid JSON object.');
      tokenMap = {};
      return tokenMap;
    }
    const adminToken = process.env.ADMIN_ACCESS_TOKEN;
    if (adminToken) {
      parsed[adminToken] = '__admin__';
    }
    tokenMap = parsed;
    logInfo('Successfully loaded ACCESS_TOKENS mapping.');
    // Don't log the entire token map as it contains sensitive information
    console.log(`[TokenUtils] Loaded ${Object.keys(tokenMap || {}).length} access tokens.`);
    // Optionally log token prefixes for debugging if needed
    // console.log('[TokenUtils] Configured token prefixes:', Object.keys(tokenMap || {}).map(t => t.substring(0, 4) + '...'));
    return tokenMap!;
  } catch (error) {
    logWarning('Failed to parse ACCESS_TOKENS environment variable.', { error });
    console.error('[TokenUtils] Failed to parse ACCESS_TOKENS:', error);
    tokenMap = {}; // Set empty map on error
    return tokenMap;
  }
}

/**
 * Checks if a token is valid and returns its associated identifier.
 * @param token The access token provided in the request.
 * @returns The user identifier string if the token is valid, otherwise null.
 */
export function getUserIdentifier(token: string | null | undefined): string | null {
  // Avoid logging the actual token value
  console.log(`[TokenUtils] Validating token presence: ${token ? 'Yes' : 'No'}`);
  
  if (!token) {
    return null; // No token provided
  }
  const map = getTokenMap();
  // Return the identifier if the token exists as a key in the map
  const identifier = map[token] || null;
  
  // Logging the identifier is usually okay, but mask the token itself
  console.log(`[TokenUtils] Token validation result: ${identifier ? `'${identifier}'` : '<invalid>'}. Token provided: ${token ? 'Yes' : 'No'}`);
  
  return identifier;
} 
