/**
 * DOM Cache Utility
 * Performance-optimized DOM element caching
 */

class DOMCache {
  constructor() {
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all DOM element references
   */
  init() {
    if (this.initialized) {
      console.warn('DOMCache already initialized');
      return;
    }

    console.log('🏗️ Initializing DOM cache...');
    
    // Status cards
    this.cacheElements({
      // Salt monitoring
      saltValue: 'saltValue',
      saltCard: 'saltCard',
      
      // Temperature monitoring
      waterTempValue: 'waterTempValue',
      waterTempComfort: 'waterTempComfort',
      waterTempCard: 'waterTempCard',
      
      // Cell monitoring
      cellVoltageValue: 'cellVoltageValue',
      cellVoltageStatus: 'cellVoltageStatus',
      cellVoltageCard: 'cellVoltageCard',
      
      // Filter pump
      filterPumpValue: 'filterPumpValue',
      filterPumpState: 'filterPumpState',
      filterPumpCard: 'filterPumpCard',
      
      // Weather
      weatherTempValue: 'weatherTempValue',
      weatherCard: 'weatherCard',
      
      // Weather time series
      rainValue: 'rainValue',
      heatIndexValue: 'heatIndexValue',
      weatherTimeSeriesAlertsValue: 'weatherTimeSeriesAlertsValue',
      weatherTimeSeriesCard: 'weatherTimeSeriesCard'
    });

    this.initialized = true;
    console.log('✅ DOM cache initialized with', this.cache.size, 'elements');
  }

  /**
   * Cache multiple elements at once
   */
  cacheElements(elementMap) {
    for (const [key, id] of Object.entries(elementMap)) {
      const element = document.getElementById(id);
      if (element) {
        this.cache.set(key, element);
      } else {
        console.warn(`⚠️ Element not found: ${id}`);
        this.cache.set(key, null);
      }
    }
  }

  /**
   * Get cached element by key
   */
  get(key) {
    if (!this.initialized) {
      throw new Error('DOMCache not initialized. Call init() first.');
    }
    
    return this.cache.get(key) || null;
  }

  /**
   * Check if element exists in cache
   */
  has(key) {
    return this.cache.has(key) && this.cache.get(key) !== null;
  }

  /**
   * Update a specific cached element
   */
  update(key, elementId) {
    const element = document.getElementById(elementId);
    this.cache.set(key, element);
    return element;
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    this.initialized = false;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cache.size;
    const valid = Array.from(this.cache.values()).filter(el => el !== null).length;
    const invalid = total - valid;
    
    return { total, valid, invalid };
  }
}

// Export singleton instance
const domCache = new DOMCache();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => domCache.init());
} else {
  // DOM is already ready
  domCache.init();
}

window.domCache = domCache; // Make available globally for debugging
module.exports = { DOMCache, domCache };