export const BASE_URL = 'https://script.google.com/macros/s/AKfycbz6Iju-W9f9Qi_ltFaSSawhwfUdPRb-yQZ1fTdUtNgRjv3rE5K5VLUH7Ins_DwiQd0/exec';

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
    
    // Add 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
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
    if (networkError.name === 'AbortError') {
      console.error('Request timeout');
      logApiError(path, 'Request timeout');
      return { ok: false, error: 'Request timeout - please try again' };
    }
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
async function withRetry(apiCall, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      if (result.ok || attempt === maxRetries) {
        return result;
      }
      // Shorter wait time (500ms instead of 1-2s)
      await new Promise(resolve => setTimeout(resolve, 500));
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
const CACHE_PREFIX = 'poll_cache_';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const BACKGROUND_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const POLLS_CACHE_KEY = 'user_polls_cache';
const LOGOUT_FLAG_KEY = 'auth_logged_out';

function getCachedPoll(pollId) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + pollId);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

function setCachedPoll(pollId, pollData) {
  try {
    const cacheData = {
      data: pollData,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + pollId, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

export function clearCachedPoll(pollId) {
  try {
    localStorage.removeItem(CACHE_PREFIX + pollId);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

// Add caching for user's polls
export function myPolls(token) {
  if (!token) {
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  
  // Check cache first
  try {
    const cached = localStorage.getItem(POLLS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('Returning cached user polls');
        return Promise.resolve({ ok: true, polls: data });
      }
    }
  } catch (error) {
    console.error('User polls cache read error:', error);
  }
  
  // Fetch from API and cache
  return withRetry(() => get('polls/mine', { token }))
    .then(result => {
      if (result.ok && result.polls) {
        try {
          // Cache user's polls
          setUserPollsCache(result.polls);
          console.log('Cached user polls:', result.polls.length);
          
          // Also cache individual polls
          result.polls.forEach(poll => {
            setCachedPoll(poll.id, poll);
          });
        } catch (error) {
          console.error('Failed to cache user polls:', error);
        }
      }
      return result;
    });
}

// Clear user polls cache when needed
export function clearUserPollsCache() {
  try {
    localStorage.removeItem(POLLS_CACHE_KEY);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log(
      `Cleared user polls cache${keysToRemove.length ? ' and ' + keysToRemove.length + ' cached poll(s)' : ''}`
    );
  } catch (error) {
    console.error('Failed to clear user polls cache:', error);
  }
}

export function setUserPollsCache(polls) {
  try {
    const cacheData = {
      data: polls,
      timestamp: Date.now()
    };
    localStorage.setItem(POLLS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to set user polls cache:', error);
  }
}

export function createPoll(token, payload) {
  if (!token) {
    console.error('createPoll: No token provided');
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  
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

export function getPublicPoll(poll_id) {
  if (!poll_id) {
    return Promise.resolve({ ok: false, error: 'Poll ID required' });
  }
  
  // Check cache first
  const cached = getCachedPoll(poll_id);
  if (cached) {
    console.log('Returning cached poll:', poll_id);
    return Promise.resolve({ ok: true, poll: cached });
  }
  
  // Fetch from API and cache result
  return withRetry(() => get('polls/results', { poll_id }))
    .then(result => {
      if (result.ok && result.poll) {
        setCachedPoll(poll_id, result.poll);
      }
      return result;
    });
}

export function submitPublicVote(poll_id, option_indices, voter_name = '') {
  if (!poll_id) {
    return Promise.resolve({ ok: false, error: 'Poll ID required' });
  }
  if (!option_indices || option_indices.length === 0) {
    return Promise.resolve({ ok: false, error: 'At least one option must be selected' });
  }
  
  // For single votes, use the existing vote function
  if (option_indices.length === 1) {
    return vote(poll_id, option_indices[0], voter_name);
  }
  
  // For multiple votes, we need to submit each one separately
  // This is a limitation of the current backend
  const votePromises = option_indices.map(index => 
    vote(poll_id, index, voter_name)
  );
  
  return Promise.all(votePromises).then(results => {
    const failed = results.find(r => !r.ok);
    if (failed) {
      return failed;
    }
    return { ok: true };
  });
}

// Update cache when poll status changes
export function updatePollStatus(token, poll_id, status) {
  if (!token || !poll_id || !status) {
    return Promise.resolve({ ok: false, error: 'Token, poll ID and status are required' });
  }
  
  const statusData = {
    poll_id,
    status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'deleted') {
    statusData.deleted_at = new Date().toISOString();
  }
  
  return withRetry(() => post('polls/status', statusData, token))
    .then(result => {
      if (result.ok) {
        // Clear cache so next myPolls() call fetches fresh data
        clearUserPollsCache();
      }
      return result;
    });
}

// Update cache when poll is permanently deleted
export function permanentlyDeletePoll(token, poll_id) {
  if (!token || !poll_id) {
    return Promise.resolve({ ok: false, error: 'Token and poll ID are required' });
  }
  
  return withRetry(() => post('polls/permanent-delete', { poll_id }, token))
    .then(result => {
      if (result.ok) {
        // Clear cache so next myPolls() call fetches fresh data
        clearUserPollsCache();
      }
      return result;
    });
}

// Utility functions for local storage
export function getStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    const loginTime = localStorage.getItem('auth_login_time');
    const loggedOut = localStorage.getItem(LOGOUT_FLAG_KEY) === '1';

    if (!token || !user || !loginTime) {
      return null;
    }

    const loginTimestamp = parseInt(loginTime, 10);
    const isExpired =
      Number.isNaN(loginTimestamp) || Date.now() - loginTimestamp > SESSION_DURATION;

    if (isExpired) {
      clearAuth();
      return null;
    }

    return { token, user: JSON.parse(user), loggedOut };
  } catch (error) {
    console.error('Error reading stored auth:', error);
  }
  return null;
}

export function storeAuth(token, user) {
  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_login_time', Date.now().toString());
    localStorage.removeItem(LOGOUT_FLAG_KEY);
  } catch (error) {
    console.error('Error storing auth:', error);
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_login_time');
    localStorage.removeItem(LOGOUT_FLAG_KEY);
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
}

export function markAuthLoggedOut() {
  try {
    localStorage.setItem(LOGOUT_FLAG_KEY, '1');
  } catch (error) {
    console.error('Error marking auth as logged out:', error);
  }
}

export function clearAuthLogoutMarker() {
  try {
    localStorage.removeItem(LOGOUT_FLAG_KEY);
  } catch (error) {
    console.error('Error clearing auth logout marker:', error);
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

// Optimistic poll creation
export function createPollOptimistic(token, payload) {
  if (!token) {
    return Promise.resolve({ ok: false, error: 'Authentication required' });
  }
  
  if (!payload.title || !payload.options || payload.options.length < 2) {
    return Promise.resolve({ ok: false, error: 'Title and at least 2 options required' });
  }

  // Generate temporary poll for immediate UI update
  const tempPoll = {
    id: 'temp_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    votes: payload.options.map(() => 0),
    vote_count: 0,
    pending: true
  };

  // Submit in background
  setTimeout(async () => {
    try {
      const res = await createPoll(token, payload);
      
      if (res?.ok && res.poll) {
        window.dispatchEvent(new CustomEvent('pollCreated', { 
          detail: { tempId: tempPoll.id, realPoll: res.poll }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('pollCreationFailed', { 
          detail: { tempId: tempPoll.id, error: res?.error }
        }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('pollCreationFailed', { 
        detail: { tempId: tempPoll.id, error: error.message }
      }));
    }
  }, 100);

  return Promise.resolve({ ok: true, poll: tempPoll });
}

// Background sync for polls
let backgroundSyncInterval = null;

export function startBackgroundSync(token) {
  if (backgroundSyncInterval) {
    clearInterval(backgroundSyncInterval);
  }
  
  console.log('Starting background sync every 10 minutes');
  
  backgroundSyncInterval = setInterval(async () => {
    try {
      console.log('Background sync: Fetching latest polls...');
      const res = await withRetry(() => get('polls/mine', { token }));
      
      if (res?.ok && res.polls) {
        // Update cache
        const cacheData = {
          data: res.polls,
          timestamp: Date.now()
        };
        localStorage.setItem('user_polls_cache', JSON.stringify(cacheData));
        
        // Cache individual polls
        res.polls.forEach(poll => {
          setCachedPoll(poll.id, poll);
        });
        
        console.log('Background sync: Updated cache with', res.polls.length, 'polls');
        
        // Emit event for UI update
        window.dispatchEvent(new CustomEvent('pollsUpdated', { 
          detail: { polls: res.polls, source: 'background' }
        }));
        
      } else {
        console.error('Background sync failed:', res?.error);
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, BACKGROUND_SYNC_INTERVAL);
}

export function stopBackgroundSync() {
  if (backgroundSyncInterval) {
    clearInterval(backgroundSyncInterval);
    backgroundSyncInterval = null;
    console.log('Stopped background sync');
  }
}
