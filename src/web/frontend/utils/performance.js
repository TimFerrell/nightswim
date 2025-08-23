/**
 * Performance Utilities
 * Debouncing, throttling, and other performance helpers
 */

/**
 * Debounce function calls
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function calls
 */
function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request cache with TTL support
 */
class RequestCache {
  constructor(defaultTTL = 30000) { // 30 seconds default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    // Clean expired entries first
    this.cleanExpired();
    return this.cache.size;
  }

  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Batch DOM updates for better performance
 */
function batchDOMUpdates(updates) {
  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.error('Error in batched DOM update:', error);
      }
    });
  });
}

/**
 * Measure and log performance
 */
function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Create singleton instances
const requestCache = new RequestCache();

module.exports = {
  debounce,
  throttle,
  RequestCache,
  requestCache,
  batchDOMUpdates,
  measurePerformance,
  prefersReducedMotion
};