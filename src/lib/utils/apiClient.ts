/**
 * Utility function for making authenticated API requests
 * Automatically adds the access token from localStorage to all requests
 */
export async function fetchApi<T = any>(
  endpoint: string, 
  options: RequestInit = {}, 
  returnBlob: boolean = false
): Promise<T> {
  const token = localStorage.getItem('appAccessToken');
  
  // Log token presence but not the actual token value
  console.log(`[Client] Using ${token ? 'saved' : 'no'} access token for API call to ${endpoint}`);
  
  if (!token) {
    throw new Error('Access token not set.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json'); // Default content type
  headers.set('X-Access-Token', token);

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Unauthorized: Invalid or missing token.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }

  // Return the appropriate response type
  if (returnBlob) {
    return response.blob() as Promise<T>;
  }
  
  return response.json(); // Assuming API always returns JSON
} 