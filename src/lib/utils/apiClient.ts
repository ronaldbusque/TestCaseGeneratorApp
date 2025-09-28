/**
 * Utility function for making authenticated API requests
 * Automatically adds the access token from localStorage to all requests
 */
function buildAuthHeaders(options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  return headers;
}

function getAccessToken() {
  const token = localStorage.getItem('appAccessToken');

  console.log(`[Client] Using ${token ? 'saved' : 'no'} access token for API call`);

  if (!token) {
    throw new Error('Access token not set.');
  }

  return token;
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  returnBlob: boolean = false
): Promise<T> {
  const token = getAccessToken();
  const headers = buildAuthHeaders(options);
  console.log(`[Client] Fetching JSON response from ${endpoint}`);
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

export async function fetchApiStream(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = buildAuthHeaders(options);
  headers.set('Accept', 'application/x-ndjson, application/json');
  headers.set('X-Access-Token', token);
  console.log(`[Client] Fetching streaming response from ${endpoint}`);

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'Unauthorized: Invalid or missing token.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      const message = parsed?.error || parsed?.message;
      throw new Error(message || `API request failed with status ${response.status}`);
    } catch (error) {
      if (error instanceof SyntaxError && raw) {
        throw new Error(raw);
      }
      throw error instanceof Error ? error : new Error(`API request failed with status ${response.status}`);
    }
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty.');
  }

  return response;
}
