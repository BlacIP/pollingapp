const ENABLE_VERBOSE_LOGS = import.meta.env?.VITE_DEBUG_LOGS === 'true';

const noop = () => {};

export function configureLogging() {
  if (typeof window === 'undefined') return;

  // Preserve original console methods exactly once so we can restore them later if needed
  if (!window.__ORIGINAL_CONSOLE__) {
    window.__ORIGINAL_CONSOLE__ = {
      log: console.log,
      info: console.info,
      debug: console.debug,
    };
  }

  if (!ENABLE_VERBOSE_LOGS) {
    console.log = noop;
    console.info = noop;
    console.debug = noop;
  } else {
    const original = window.__ORIGINAL_CONSOLE__;
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
  }
}

export function restoreOriginalConsole() {
  if (typeof window === 'undefined') return;
  const original = window.__ORIGINAL_CONSOLE__;
  if (original) {
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
  }
}

