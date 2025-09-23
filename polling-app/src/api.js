export const BASE_URL = 'https://script.google.com/macros/s/AKfycbyzMXI4IhCFyIlmXMlkMa9L7UltF3GOOSj_bKuXZ_3qV2-9jhukHNJcWBZRsSUXHAAb/exec';

// Error logging helper
function logApiError(endpoint, error) {
  console.error(`API Error [${endpoint}]:`, error);
}

// Build URL with path and optional token
function buildUrl(path, token) {
  const u = new URL(BASE_URL);
  u.searchParams.set('path', path);
  if (token) u.searchParams.set('token', token);
  return u.toString();
}

// Generic POST request handler
async function post(path, data = {}, token) {
  console.log(`Making POST request to ${path}:`, { data, token: token ? 'present' : 'missing' });
  
  try {
    const url = buildUrl(path, token);
    console.log('Request URL:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
    });
    
    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);
    
    try { 
      const result = JSON.parse(text);
      console.log('Parsed result:', result);
      
      if (!result.ok) {
        logApiError(path, result.error);
      }
      return result;
    } catch (parseError) { 
      const error = text || 'Bad JSON response';
      console.error('JSON parse error:', parseError);
      logApiError(path, error);
      return { ok: false, error };
    }
  } catch (networkError) {
    console.error('Network error:', networkError);
    logApiError(path, networkError.message);
    return { ok: false, error: 'Network error: ' + networkError.message };
  }
}

// Generic GET request handler
async function get(path, params = {}) {
  try {
    const u = new URL(BASE_URL);
    u.searchParams.set('path', path);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        u.searchParams.set(key, value);
      }
    });

    const res = await fetch(u.toString(), { method: 'GET' });
    const text = await res.text();
    
    try { 
      const result = JSON.parse(text);
      if (!result.ok) {
        logApiError(path, result.error);
      }
      return result;
    } catch { 
      const error = text || 'Bad JSON response';
      logApiError(path, error);
      return { ok: false, error };
    }
  } catch (networkError) {
    logApiError(path, networkError.message);
    return { ok: false, error: 'Network error: ' + networkError.message };
  }
}

// Retry logic for failed requests
async function withRetry(apiCall, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      if (result.ok || attempt === maxRetries) {
        return result;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } catch (error) {
      if (attempt === maxRetries) {
        return { ok: false, error: error.message };
      }
    }
  }
}

// Auth API functions
export function requestOtp({ email, name, phone, mode = 'signin' }) {
  if (!email || typeof email !== 'string') {
    return Promise.resolve({ ok: false, error: 'Valid email is required' });
  }
  
  const normalizedData = {
    email: email.toLowerCase().trim(),
    name: (name || '').trim(),
    phone: (phone || '').trim(),
    mode: mode // 'signin' or 'signup'
  };
  
  return withRetry(() => post('auth/request-otp', normalizedData));
}

export function verifyOtp({ email, code }) {
  if (!email || typeof email !== 'string') {
    return Promise.resolve({ ok: false, error: 'Valid email is required' });
  }
  if (!code || typeof code !== 'string') {
    return Promise.resolve({ ok: false, error: 'Valid code is required' });
  }
  
  const normalizedData = {
    email: email.toLowerCase().trim(),
    code: code.trim()
  };
  
  return withRetry(() => post('auth/verify-otp', normalizedData));
}

// Check if token is still valid
export function checkAuth(token) {
  if (!token) {
    return Promise.resolve({ ok: false, error: 'No token provided' });
  }
  
  return get('auth/me', { token });
}

// Poll API functions
export function myPolls(token) {
  if (!token) {
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  
  return withRetry(() => get('polls/mine', { token }));
}



export function createPoll(token, payload) {
  if (!token) {
    console.error('createPoll: No token provided');
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  
  // Validate payload
  if (!payload.title || !payload.options || payload.options.length < 2) {
    console.error('createPoll: Invalid payload', payload);
    return Promise.resolve({ ok: false, error: 'Title and at least 2 options required' });
  }
  
  console.log('createPoll: Making request with payload:', payload);
  return withRetry(() => post('polls/create', payload, token));
}

export function deletePoll(token, poll_id) {
  if (!token) {
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  if (!poll_id) {
    return Promise.resolve({ ok: false, error: 'Poll ID required' });
  }
  
  return withRetry(() => post('polls/delete', { poll_id }, token));
}

export function pollResults(poll_id) {
  if (!poll_id) {
    return Promise.resolve({ ok: false, error: 'Poll ID required' });
  }
  
  return withRetry(() => get('polls/results', { poll_id }));
}

export function vote(poll_id, option_index, voter_name = '') {
  if (!poll_id) {
    return Promise.resolve({ ok: false, error: 'Poll ID required' });
  }
  if (option_index === undefined || option_index === null) {
    return Promise.resolve({ ok: false, error: 'Option index required' });
  }
  
  const voteData = {
    poll_id,
    option_index: parseInt(option_index),
    voter_name: voter_name.trim()
  };
  
  return withRetry(() => post('polls/vote', voteData));
}

// Utility functions for local storage
export function getStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    if (token && user) {
      return { token, user: JSON.parse(user) };
    }
  } catch (error) {
    console.error('Error reading stored auth:', error);
  }
  return null;
}

export function storeAuth(token, user) {
  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing auth:', error);
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
}

// Debug helper - only use in development
export function debugApi(enabled = false) {
  if (enabled) {
    window.apiDebug = {
      BASE_URL,
      testAuth: () => checkAuth(getStoredAuth()?.token),
      testPolls: () => myPolls(getStoredAuth()?.token),
      clearStorage: clearAuth
    };
    console.log('API debug tools available at window.apiDebug');
  }
}