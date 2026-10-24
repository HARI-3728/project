const backendUrl = import.meta.env.VITE_BACKEND_URL;
if (!backendUrl) {
  throw new Error('Missing VITE_BACKEND_URL in the frontend environment.');
}

const API_BASE_URL = `${new URL(backendUrl).origin}/api/v1`;

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
