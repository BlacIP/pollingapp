const CACHE_PREFIX = 'poll_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PRELOAD_KEY = 'preloaded_polls';

export function getCachedPoll(pollId) {
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

export function setCachedPoll(pollId, pollData) {
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

export function getPreloadedPolls() {
  try {
    const cached = localStorage.getItem(PRELOAD_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Preload cache read error:', error);
  }
  return null;
}

export function setPreloadedPolls(polls) {
  try {
    const cacheData = {
      data: polls,
      timestamp: Date.now()
    };
    localStorage.setItem(PRELOAD_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Preload cache write error:', error);
  }
}

export function clearPollCache(pollId = null) {
  if (pollId) {
    localStorage.removeItem(CACHE_PREFIX + pollId);
  } else {
    // Clear all poll caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem(PRELOAD_KEY);
  }
}