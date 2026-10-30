const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const apiUrl = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://project-tvkl.onrender.com');

let parsedApiUrl;
try {
  parsedApiUrl = new URL(apiUrl);
} catch {
  throw new Error('VITE_API_URL must be an absolute http(s) origin without a path.');
}

if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
  throw new Error('VITE_API_URL must be an absolute http(s) origin.');
}

const isLoopbackApiHost = parsedApiUrl.hostname === 'localhost'
  || parsedApiUrl.hostname.endsWith('.localhost')
  || parsedApiUrl.hostname.startsWith('127.')
  || parsedApiUrl.hostname === '[::1]';

if (import.meta.env.PROD && isLoopbackApiHost) {
  throw new Error('VITE_API_URL must not point to localhost in a production build.');
}

const apiOrigin = parsedApiUrl.origin;
const API_BASE_URL = `${apiOrigin}/api/v1`;

const getAuthToken = () => localStorage.getItem('medicare_token');

export const api = {
  async request(endpoint, options = {}) {
    const { method = 'GET', body, headers = {}, requireAuth = false, ...rest } = options;
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const requestOptions = {
      method,
      ...rest,
      headers: {
        ...(!isFormData && body !== undefined && body !== null
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers,
      },
    };

    const token = getAuthToken();
    if (requireAuth && !token) {
      throw new Error('Authentication required. Please sign in again.');
    }
    if (token) {
      requestOptions.headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined && body !== null && !isFormData) {
      requestOptions.body = JSON.stringify(body);
    } else if (body !== undefined && body !== null) {
      requestOptions.body = body;
    }

    const response = await fetch(url, requestOptions);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }

    return payload;
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

export const getApiBaseUrl = () => API_BASE_URL;
