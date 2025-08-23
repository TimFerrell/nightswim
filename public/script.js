// Global chart variables
let tempChart, electricalChart, chemistryChart;
let saltSparkline, waterTempSparkline, cellVoltageSparkline, filterPumpSparkline, weatherTimeSeriesChart;

// Update architecture status indicator
function updateArchitectureStatus(version) {
  const statusElement = document.getElementById('architectureVersion');
  if (statusElement) {
    statusElement.textContent = version;
    statusElement.className = `status-value${  version.startsWith('v2') ? ' v2' : ''}`;
  }
}

// DOM element cache for performance
const domCache = {
  // Status cards
  saltValue: null,
  saltCard: null,
  waterTempValue: null,
  waterTempComfort: null,
  waterTempCard: null,
  cellVoltageValue: null,
  cellVoltageStatus: null,
  cellVoltageCard: null,
  filterPumpValue: null,
  filterPumpState: null,
  filterPumpCard: null,
  weatherTempValue: null,
  weatherCard: null,

  // Weather time series elements
  rainValue: null,
  heatIndexValue: null,
  weatherTimeSeriesAlertsValue: null,
  weatherTimeSeriesCard: null,

  // Initialize cache
  init() {
    this.saltValue = document.getElementById('saltValue');
    this.saltCard = document.getElementById('saltCard');
    this.waterTempValue = document.getElementById('waterTempValue');
    this.waterTempComfort = document.getElementById('waterTempComfort');
    this.waterTempCard = document.getElementById('waterTempCard');
    this.cellVoltageValue = document.getElementById('cellVoltageValue');
    this.cellVoltageStatus = document.getElementById('cellVoltageStatus');
    this.cellVoltageCard = document.getElementById('cellVoltageCard');
    this.filterPumpValue = document.getElementById('filterPumpValue');
    this.filterPumpState = document.getElementById('filterPumpState');
    this.filterPumpCard = document.getElementById('filterPumpCard');
    this.weatherTempValue = document.getElementById('weatherTempValue');
    this.weatherCard = document.getElementById('weatherCard');

    // Weather time series elements
    this.rainValue = document.getElementById('rainValue');
    this.heatIndexValue = document.getElementById('heatIndexValue');
    this.weatherTimeSeriesAlertsValue = document.getElementById('weatherTimeSeriesAlertsValue');
    this.weatherTimeSeriesCard = document.getElementById('weatherTimeSeriesCard');
  }
};

// Debounce utility for performance
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Request cache for API calls
const _requestCache = {
  data: null,
  timestamp: 0,
  ttl: 5000, // 5 seconds cache

  isValid() {
    return this.data && (Date.now() - this.timestamp) < this.ttl;
  },

  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },

  get() {
    return this.isValid() ? this.data : null;
  },

  clear() {
    this.data = null;
    this.timestamp = 0;
  }
};

// Register Chart.js plugins
if (typeof annotationPlugin !== 'undefined') {
  Chart.register(annotationPlugin);
}

// Auto-refresh intervals
let chartRefreshInterval = null;
let statsRefreshInterval = null;

// Utility functions - defined first to avoid hoisting issues
const getSeverityClass = (severity) => {
  switch (severity?.toLowerCase()) {
  case 'extreme':
  case 'severe':
    return 'severe';
  case 'moderate':
    return 'moderate';
  case 'minor':
  case 'unknown':
  default:
    return 'minor';
  }
};

const getSeverityText = (severity) => {
  switch (severity?.toLowerCase()) {
  case 'extreme':
    return 'EXTREME';
  case 'severe':
    return 'SEVERE';
  case 'moderate':
    return 'MODERATE';
  case 'minor':
    return 'MINOR';
  case 'unknown':
  default:
    return 'ADVISORY';
  }
};

const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

const formatTime = (timeString) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const updateSaltAnnotations = (currentSalt) => {
  if (!saltSparkline) return;

  const annotations = saltSparkline.options.plugins.annotation.annotations;

  // Reset all annotations to low saturation
  annotations.tooLowRegion.backgroundColor = 'rgba(255, 255, 0, 0.05)';
  annotations.safeRegion.backgroundColor = 'rgba(0, 255, 0, 0.05)';
  annotations.tooHighRegion.backgroundColor = 'rgba(255, 0, 0, 0.05)';

  // Increase saturation for the region containing current value
  if (currentSalt >= 2000 && currentSalt < 2700) {
    annotations.tooLowRegion.backgroundColor = 'rgba(255, 255, 0, 0.15)';
  } else if (currentSalt >= 2700 && currentSalt < 3400) {
    annotations.safeRegion.backgroundColor = 'rgba(0, 255, 0, 0.15)';
  } else if (currentSalt >= 3400 && currentSalt <= 4000) {
    annotations.tooHighRegion.backgroundColor = 'rgba(255, 0, 0, 0.15)';
  }

  saltSparkline.update('none');
};

const createWeatherAlertItem = (alert) => {
  const alertItem = document.createElement('div');
  alertItem.className = `weather-alert-item ${getSeverityClass(alert.severity)}`;

  const severityClass = getSeverityClass(alert.severity);
  const severityText = getSeverityText(alert.severity);

  alertItem.innerHTML = `
    <div class="weather-alert-header">
      <h4 class="weather-alert-title">${alert.event}</h4>
      <span class="weather-alert-severity ${severityClass}">${severityText}</span>
    </div>
    <div class="weather-alert-description">${truncateText(alert.description, 100)}</div>
    <div class="weather-alert-time">
      Until ${formatTime(alert.endTime)}
    </div>
  `;

  return alertItem;
};

const updateWeatherTimeSeriesChart = (data) => {
  if (!weatherTimeSeriesChart || !data.timeSeries) {
    return;
  }

  const labels = data.timeSeries.map(d => new Date(d.timestamp));

  weatherTimeSeriesChart.data.labels = labels;
  weatherTimeSeriesChart.data.datasets[0].data = data.timeSeries.map(d => d.rain);
  weatherTimeSeriesChart.data.datasets[1].data = data.timeSeries.map(d => d.heatIndex);

  weatherTimeSeriesChart.update('none');
};

const updateWeatherAlertsCard = (alertsData, historyData) => {
  const weatherAlertsValue = document.getElementById('weatherAlertsValue');
  const weatherAlertsContainer = document.getElementById('weatherAlertsContainer');
  const weatherAlertsPast24H = document.getElementById('weatherAlertsPast24H');
  const weatherAlertsCard = document.getElementById('weatherAlertsCard');

  if (!weatherAlertsValue || !weatherAlertsContainer || !weatherAlertsPast24H) {
    console.warn('Weather alerts DOM elements not found');
    return;
  }

  if (alertsData.error) {
    weatherAlertsValue.textContent = '!';
    weatherAlertsValue.classList.remove('skeleton-value', 'has-alerts', 'no-alerts');
    weatherAlertsValue.classList.add('error');
    weatherAlertsContainer.innerHTML = `<div class="no-alerts-message" style="color: var(--color-error);">Error: ${alertsData.error}</div>`;
    if (weatherAlertsPast24H) {
      weatherAlertsPast24H.textContent = 'Error';
      weatherAlertsPast24H.classList.remove('skeleton-text');
    }
    if (weatherAlertsCard) {
      weatherAlertsCard.classList.add('loaded');
    }
    return;
  }

  if (alertsData.hasActiveAlerts && alertsData.alertCount > 0) {
    weatherAlertsValue.textContent = alertsData.alertCount;
    weatherAlertsValue.classList.remove('skeleton-value', 'no-alerts', 'error');
    weatherAlertsValue.classList.add('has-alerts');
    weatherAlertsContainer.innerHTML = '';
    alertsData.alerts.forEach(alert => {
      const alertItem = createWeatherAlertItem(alert);
      weatherAlertsContainer.appendChild(alertItem);
    });
  } else {
    weatherAlertsValue.textContent = '0';
    weatherAlertsValue.classList.remove('skeleton-value', 'has-alerts', 'error');
    weatherAlertsValue.classList.add('no-alerts');
    weatherAlertsContainer.innerHTML = '';
  }

  if (weatherAlertsPast24H) {
    const past24HCount = historyData?.alerts?.length || 0;
    weatherAlertsPast24H.textContent = `${past24HCount} Warnings`;
    weatherAlertsPast24H.classList.remove('skeleton-text');
  }

  if (weatherAlertsCard) {
    weatherAlertsCard.classList.add('loaded');
  }
};

const updateWeatherTimeSeriesCard = (data) => {
  if (data.error) {
    const weatherTimeSeriesValue = document.getElementById('weatherTimeSeriesValue');
    if (weatherTimeSeriesValue) {
      weatherTimeSeriesValue.textContent = '!';
      weatherTimeSeriesValue.classList.add('error');
    }
    return;
  }

  if (domCache.rainValue && data.currentRain !== undefined) {
    domCache.rainValue.textContent = data.currentRain.toFixed(2);
    domCache.rainValue.classList.remove('skeleton-value');
  }

  if (domCache.heatIndexValue && data.currentHeatIndex !== undefined) {
    domCache.heatIndexValue.textContent = Math.round(data.currentHeatIndex);
    domCache.heatIndexValue.classList.remove('skeleton-value');
  }

  if (domCache.weatherTimeSeriesAlertsValue && data.alertCount !== undefined) {
    domCache.weatherTimeSeriesAlertsValue.textContent = data.alertCount;
    domCache.weatherTimeSeriesAlertsValue.classList.remove('skeleton-value');
  }

  if (domCache.weatherTimeSeriesCard) {
    domCache.weatherTimeSeriesCard.classList.add('loaded');
  }

  updateWeatherTimeSeriesChart(data);
};

// Forward declarations for functions used before definition
const loadPoolData = async (retryCount = 0) => {
  try {
    console.log(`🔄 Loading pool data from InfluxDB (attempt ${retryCount + 1})...`);
    const startTime = Date.now();

    // Try new architecture endpoint first (v2), fallback to legacy (v1)
    let response;
    try {
      response = await fetch('/api/pool/v2/data', { credentials: 'include' });
      if (!response.ok) throw new Error('v2 endpoint failed');
      console.log('📊 Using new architecture (v2) endpoint');
      updateArchitectureStatus('v2 (domain-driven)');
    } catch {
      console.log('📊 Falling back to legacy (v1) endpoint');
      response = await fetch('/api/pool/data', { credentials: 'include' });
      updateArchitectureStatus('v1 (legacy)');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Invalid response format');
    }

    const data = result.data;
    const loadTime = Date.now() - startTime;
    console.log(`✅ Pool data loaded in ${loadTime}ms`);
    console.log('📊 Pool data:', data);

    // Update stats display with new data
    // updateStatsDisplay(data);

    // Update all 3 main charts with new data
    // updateAllCharts(data);

  } catch (error) {
    console.error(`Failed to load pool data (attempt ${retryCount + 1}):`, error);

    if (retryCount < 2) {
      console.log(`🔄 Retrying data load in ${2 ** retryCount}s...`);
      setTimeout(() => loadPoolData(retryCount + 1), (2 ** retryCount) * 1000);
    } else {
      console.error('❌ Failed to load pool data after 3 attempts');
      // showDataLoadError(error.message);
    }
  }
};

const loadWeatherAlerts = async () => {
  try {
    console.log('⚠️ Loading weather alerts from InfluxDB...');
    const startTime = Date.now();

    // Fetch both active alerts and 24-hour history
    const [alertsResponse, historyResponse] = await Promise.all([
      fetch('/api/pool/alerts', { credentials: 'include' }),
      fetch('/api/pool/alerts/history?hours=24', { credentials: 'include' })
    ]);

    if (!alertsResponse.ok) {
      throw new Error(`HTTP ${alertsResponse.status}: ${alertsResponse.statusText}`);
    }

    if (!historyResponse.ok) {
      throw new Error(`HTTP ${historyResponse.status}: ${historyResponse.statusText}`);
    }

    const alertsResult = await alertsResponse.json();
    const historyResult = await historyResponse.json();

    if (!alertsResult.success) {
      throw new Error(alertsResult.error || 'Invalid weather alerts response format');
    }

    if (!historyResult.success) {
      throw new Error(historyResult.error || 'Invalid weather alerts history response format');
    }

    const alertsData = alertsResult.data;
    const historyData = historyResult.data;
    const loadTime = Date.now() - startTime;
    console.log(`✅ Weather alerts loaded in ${loadTime}ms`);

    updateWeatherAlertsCard(alertsData, historyData);

  } catch (error) {
    console.error('Error loading weather alerts:', error);
    updateWeatherAlertsCard({
      hasActiveAlerts: false,
      alertCount: 0,
      alerts: [],
      error: error.message
    }, { alerts: [] });
  }
};

const loadWeatherTimeSeries = async () => {
  try {
    console.log('🌤️ Loading weather time series from InfluxDB...');
    const startTime = Date.now();

    const response = await fetch('/api/pool/weather', { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Invalid weather time series response format');
    }

    const data = result.data;
    const loadTime = Date.now() - startTime;
    console.log(`✅ Weather time series loaded in ${loadTime}ms`);

    updateWeatherTimeSeriesCard(data);

  } catch (error) {
    console.error('Error loading weather time series:', error);
    updateWeatherTimeSeriesCard({
      error: error.message
    });
  }
};

const updateSparklines = async () => {
  console.log('📈 Updating sparklines...');
  try {
    const response = await fetch('/api/pool/sparklines', { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to load sparkline data');
    }

    const data = result.data;
    console.log('📊 Sparkline data:', data);

    // Update each sparkline if it exists
    if (saltSparkline && data.salt) {
      saltSparkline.data.labels = data.salt.map(d => new Date(d.timestamp));
      saltSparkline.data.datasets[0].data = data.salt.map(d => d.value);
      saltSparkline.update('none');

      const currentSalt = data.salt[data.salt.length - 1]?.value;
      if (currentSalt !== undefined) {
        updateSaltAnnotations(currentSalt);
      }
    }

    if (waterTempSparkline && data.waterTemp) {
      waterTempSparkline.data.labels = data.waterTemp.map(d => new Date(d.timestamp));
      waterTempSparkline.data.datasets[0].data = data.waterTemp.map(d => d.value);
      waterTempSparkline.update('none');
    }

    if (cellVoltageSparkline && data.cellVoltage) {
      cellVoltageSparkline.data.labels = data.cellVoltage.map(d => new Date(d.timestamp));
      cellVoltageSparkline.data.datasets[0].data = data.cellVoltage.map(d => d.value);
      cellVoltageSparkline.update('none');
    }

    if (filterPumpSparkline && data.filterPump) {
      filterPumpSparkline.data.labels = data.filterPump.map(d => new Date(d.timestamp));
      filterPumpSparkline.data.datasets[0].data = data.filterPump.map(d => d.value);
      filterPumpSparkline.update('none');
    }

    console.log('✅ Sparklines updated successfully');

  } catch (error) {
    console.error('Error updating sparklines:', error);
  }
};

const fetchSaltRollingAverage = async () => {
  try {
    const response = await fetch('/api/pool/salt/average', { credentials: 'include' });

    if (!response.ok) {
      console.error(`Failed to fetch salt rolling average: HTTP ${response.status}`);
      return;
    }

    const result = await response.json();
    if (!result.success) {
      console.error('Failed to load salt rolling average:', result.error);
      return;
    }

    const average = result.data?.average;
    if (average !== undefined && average !== null) {
      const averageElement = document.getElementById('saltAverage');
      if (averageElement) {
        averageElement.textContent = Math.round(average);
        averageElement.classList.remove('skeleton-value');
        console.log('🧂 Updated salt rolling average to:', Math.round(average));
      }
    }
  } catch (error) {
    console.error('Error fetching salt rolling average:', error);
  }
};

const initializeSparklines = () => {
  const chartConfig = (label, color, yAxisConfig = {}) => ({
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: `${color  }20`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false, ...yAxisConfig }
      },
      animation: { duration: 0 }
    }
  });

  // Initialize sparklines
  const saltCanvas = document.getElementById('saltSparkline');
  if (saltCanvas) {
    if (saltSparkline) saltSparkline.destroy();
    const config = chartConfig('Salt', '#3498db');

    // Add salt level annotations
    config.options.plugins.annotation = {
      annotations: {
        tooLowRegion: {
          type: 'box',
          yMin: 2000,
          yMax: 2700,
          backgroundColor: 'rgba(255, 255, 0, 0.05)',
          borderWidth: 0
        },
        safeRegion: {
          type: 'box',
          yMin: 2700,
          yMax: 3400,
          backgroundColor: 'rgba(0, 255, 0, 0.05)',
          borderWidth: 0
        },
        tooHighRegion: {
          type: 'box',
          yMin: 3400,
          yMax: 4000,
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
          borderWidth: 0
        }
      }
    };
    config.options.scales.y = { min: 2000, max: 4000, display: false };

    saltSparkline = new Chart(saltCanvas, config);
  }

  const waterTempCanvas = document.getElementById('waterTempSparkline');
  if (waterTempCanvas) {
    if (waterTempSparkline) waterTempSparkline.destroy();
    waterTempSparkline = new Chart(waterTempCanvas, chartConfig('Water Temp', '#e74c3c'));
  }

  const cellVoltageCanvas = document.getElementById('cellVoltageSparkline');
  if (cellVoltageCanvas) {
    if (cellVoltageSparkline) cellVoltageSparkline.destroy();
    cellVoltageSparkline = new Chart(cellVoltageCanvas, chartConfig('Cell Voltage', '#f39c12'));
  }

  const filterPumpCanvas = document.getElementById('filterPumpSparkline');
  if (filterPumpCanvas) {
    if (filterPumpSparkline) filterPumpSparkline.destroy();
    filterPumpSparkline = new Chart(filterPumpCanvas, chartConfig('Filter Pump', '#9b59b6', { min: 0, max: 1 }));
  }

  console.log('✅ Sparklines initialized');
};


/**
 * Get human-readable comfort level for water temperature
 * @param {number} temperature - Water temperature in Fahrenheit
 * @returns {string} Comfort level description
 */
const getWaterComfortLevel = (temperature) => {
  if (temperature >= 95) return 'Too Hot';
  if (temperature >= 88) return 'Hot';
  if (temperature >= 82) return 'Warm';
  if (temperature >= 78) return 'Perfect';
  if (temperature >= 72) return 'Cool';
  if (temperature >= 68) return 'Chilly';
  if (temperature >= 60) return 'Cold';
  return 'Too Cold';
};

/**
 * Get chart configuration based on type
 */
const getChartConfig = (type) => {
  // Detect dark mode
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const baseConfig = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      title: {
        display: false
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: isDarkMode ? '#ffffff' : '#1a1f36'
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(26, 31, 54, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: isDarkMode ? '#8b5cf6' : '#635bff',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600',
          family: 'Inter, sans-serif'
        },
        bodyFont: {
          size: 13,
          family: 'Inter, sans-serif'
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'MMM d, h:mm a'
          }
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 14,
            weight: '600',
            family: 'Inter, sans-serif'
          },
          color: isDarkMode ? '#a0a0a0' : '#697386'
        },
        grid: {
          color: isDarkMode ? 'rgba(42, 42, 42, 0.5)' : 'rgba(225, 229, 233, 0.5)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: isDarkMode ? '#666666' : '#8b9bb4'
        }
      }
    }
  };

  // Add specific Y-axis configuration based on chart type
  if (type === 'temperature') {
    baseConfig.scales.y = {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Temperature (°F)',
        font: {
          size: 14,
          weight: '600',
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#a0a0a0' : '#697386'
      },
      grid: {
        color: isDarkMode ? 'rgba(42, 42, 42, 0.5)' : 'rgba(225, 229, 233, 0.5)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#666666' : '#8b9bb4'
      }
    };
  } else if (type === 'electrical') {
    baseConfig.scales.y = {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Voltage (V)',
        font: {
          size: 14,
          weight: '600',
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#a0a0a0' : '#697386'
      },
      grid: {
        color: isDarkMode ? 'rgba(42, 42, 42, 0.5)' : 'rgba(225, 229, 233, 0.5)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#666666' : '#8b9bb4'
      }
    };
  } else if (type === 'chemistry') {
    baseConfig.scales.y = {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Salt Level (PPM)',
        font: {
          size: 14,
          weight: '600',
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#a0a0a0' : '#697386'
      },
      grid: {
        color: isDarkMode ? 'rgba(42, 42, 42, 0.5)' : 'rgba(225, 229, 233, 0.5)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, sans-serif'
        },
        color: isDarkMode ? '#666666' : '#8b9bb4'
      }
    };
  }

  return baseConfig;
};

/**
 * Initialize the temperature chart
 */
const initializeTempChart = () => {
  if (tempChart) {
    tempChart.destroy();
  }

  const ctx = document.getElementById('tempChart').getContext('2d');

  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Water Temperature (°F)',
          data: [],
          borderColor: '#45b7d1',
          backgroundColor: 'rgba(69, 183, 209, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Air Temperature (°F)',
          data: [],
          borderColor: '#ffa726',
          backgroundColor: 'rgba(255, 167, 38, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Cell Temperature (°F)',
          data: [],
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: getChartConfig('temperature')
  });
};

/**
 * Initialize the electrical chart
 */
const initializeElectricalChart = () => {
  if (electricalChart) {
    electricalChart.destroy();
  }

  const ctx = document.getElementById('electricalChart').getContext('2d');

  electricalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Cell Voltage (V)',
          data: [],
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: getChartConfig('electrical')
  });
};

/**
 * Initialize the chemistry chart
 */
const initializeChemistryChart = () => {
  if (chemistryChart) {
    chemistryChart.destroy();
  }

  const ctx = document.getElementById('chemistryChart').getContext('2d');

  chemistryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Salt Level (PPM)',
          data: [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: getChartConfig('chemistry')
  });
};

/**
 * Update all charts with new data
 */
// Debounced chart update function
const debouncedUpdateCharts = debounce(async () => {
  const timeRange = document.getElementById('timeRange').value;

  try {
    const response = await fetch(`/api/pool/timeseries?hours=${timeRange}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch time series data');
    }

    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      document.getElementById('tempChartStatus').textContent = 'No data available';
      document.getElementById('electricalChartStatus').textContent = 'No data available';
      document.getElementById('chemistryChartStatus').textContent = 'No data available';
      return;
    }

    // Process data for all charts
    const labels = result.data.map(point => new Date(point.timestamp));
    const waterTempData = result.data.map(point => point.waterTemp);
    const airTempData = result.data.map(point => point.airTemp);
    const cellTempData = result.data.map(point => point.cellTemp);
    const cellVoltageData = result.data.map(point => point.cellVoltage);
    const saltData = result.data.map(point => point.saltInstant);

    // Debug logging
    console.log('Chart data debug:', {
      dataPoints: result.data.length,
      waterTemp: waterTempData.filter(v => v !== null && v !== undefined).length,
      airTemp: airTempData.filter(v => v !== null && v !== undefined).length,
      cellTemp: cellTempData.filter(v => v !== null && v !== undefined).length,
      sampleWaterTemp: waterTempData.slice(0, 3),
      sampleAirTemp: airTempData.slice(0, 3),
      sampleCellTemp: cellTempData.slice(0, 3)
    });

    // Update temperature chart
    if (tempChart) {
      tempChart.data.labels = labels;
      tempChart.data.datasets[0].data = waterTempData;
      tempChart.data.datasets[1].data = airTempData;
      tempChart.data.datasets[2].data = cellTempData;
      tempChart.update('none');
    }

    // Update electrical chart
    if (electricalChart) {
      electricalChart.data.labels = labels;
      electricalChart.data.datasets[0].data = cellVoltageData;
      electricalChart.update('none');
    }

    // Update chemistry chart
    if (chemistryChart) {
      chemistryChart.data.labels = labels;
      chemistryChart.data.datasets[0].data = saltData;
      chemistryChart.update('none');
    }

    // Update status with data info
    const dataCount = result.data.length;
    const oldestTime = result.stats?.oldestTimestamp ? new Date(result.stats.oldestTimestamp).toLocaleTimeString() : 'N/A';
    const newestTime = result.stats?.newestTimestamp ? new Date(result.stats.newestTimestamp).toLocaleTimeString() : 'N/A';
    const statusText = `${dataCount} data points | ${oldestTime} - ${newestTime} | Updated: ${new Date().toLocaleTimeString()}`;

    document.getElementById('tempChartStatus').textContent = statusText;
    document.getElementById('electricalChartStatus').textContent = statusText;
    document.getElementById('chemistryChartStatus').textContent = statusText;

  } catch (error) {
    console.error('Chart update error:', error);
    document.getElementById('tempChartStatus').textContent = 'Error loading data';
    document.getElementById('electricalChartStatus').textContent = 'Error loading data';
    document.getElementById('chemistryChartStatus').textContent = 'Error loading data';
  }
}, 300); // 300ms debounce

const updateAllCharts = debouncedUpdateCharts;

/**
 * Append a single data point to all charts
 */
const _appendDataPoint = (dataPoint) => {
  const timestamp = new Date(dataPoint.timestamp);
  const timeRange = parseInt(document.getElementById('timeRange').value);
  const cutoffTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));

  // Update temperature chart
  if (tempChart) {
    tempChart.data.labels.push(timestamp);
    tempChart.data.datasets[0].data.push(dataPoint.waterTemp);
    tempChart.data.datasets[1].data.push(dataPoint.airTemp);
    tempChart.data.datasets[2].data.push(dataPoint.cellTemp);

    // Remove old data points
    while (tempChart.data.labels.length > 0 && tempChart.data.labels[0] < cutoffTime) {
      tempChart.data.labels.shift();
      tempChart.data.datasets[0].data.shift();
      tempChart.data.datasets[1].data.shift();
      tempChart.data.datasets[2].data.shift();
    }

    tempChart.update('active');
  }

  // Update electrical chart
  if (electricalChart) {
    electricalChart.data.labels.push(timestamp);
    electricalChart.data.datasets[0].data.push(dataPoint.cellVoltage);

    // Remove old data points
    while (electricalChart.data.labels.length > 0 && electricalChart.data.labels[0] < cutoffTime) {
      electricalChart.data.labels.shift();
      electricalChart.data.datasets[0].data.shift();
    }

    electricalChart.update('active');
  }

  // Update chemistry chart
  if (chemistryChart) {
    chemistryChart.data.labels.push(timestamp);
    chemistryChart.data.datasets[0].data.push(dataPoint.saltInstant);

    // Remove old data points
    while (chemistryChart.data.labels.length > 0 && chemistryChart.data.labels[0] < cutoffTime) {
      chemistryChart.data.labels.shift();
      chemistryChart.data.datasets[0].data.shift();
    }

    chemistryChart.update('active');
  }
};

/**
 * Start automatic chart refresh
 */
const _startChartAutoRefresh = () => {
  if (chartRefreshInterval) {
    clearInterval(chartRefreshInterval);
  }

  chartRefreshInterval = setInterval(() => {
    updateAllCharts();
    updateSparklines();
    loadWeatherAlerts(); // Refresh weather alerts every 30 seconds
    loadWeatherTimeSeries(); // Refresh weather time series every 30 seconds
  }, 30000); // Refresh every 30 seconds
};

/**
 * Stop automatic chart refresh
 */
const stopChartAutoRefresh = () => {
  if (chartRefreshInterval) {
    clearInterval(chartRefreshInterval);
    chartRefreshInterval = null;
  }
};

/**
 * Clean up chart instances
 */
const cleanupChart = (chart) => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
};

/**
 * Start automatic stats refresh
 */
const _startStatsAutoRefresh = () => {
  if (statsRefreshInterval) {
    clearInterval(statsRefreshInterval);
  }

  statsRefreshInterval = setInterval(() => {
    loadPoolData();
    loadWeatherAlerts(); // Refresh weather alerts every 30 seconds
    loadWeatherTimeSeries(); // Refresh weather time series every 30 seconds
  }, 30000); // Refresh every 30 seconds (more frequent since no manual button)
};

/**
 * Stop automatic stats refresh
 */
const stopStatsAutoRefresh = () => {
  if (statsRefreshInterval) {
    clearInterval(statsRefreshInterval);
    statsRefreshInterval = null;
  }
};

/**
 * Update status cards with real data and pulse animation
 */
const _updateStatusCards = (data) => {
  console.log('🔄 Updating status cards with data:', data);

  // Initialize DOM cache if not done
  if (!domCache.saltValue) {
    domCache.init();
  }

  // Update salt level card
  console.log('🧂 Salt data:', data.chlorinator?.salt);

  if (data.chlorinator?.salt?.instant && data.chlorinator.salt.instant !== null && data.chlorinator.salt.instant !== '--') {
    console.log('🧂 Found salt element:', domCache.saltValue);
    if (domCache.saltValue) {
      domCache.saltValue.textContent = data.chlorinator.salt.instant;
      domCache.saltValue.classList.remove('skeleton-value');
      console.log('🧂 Updated salt value to:', data.chlorinator.salt.instant);

      // Update annotation colors based on current salt value
      updateSaltAnnotations(data.chlorinator.salt.instant);
    }

    // Fetch updated rolling average
    fetchSaltRollingAverage();

    // Mark as loaded
    if (domCache.saltCard) {
      domCache.saltCard.classList.add('loaded');
    }
  } else {
    // Check if pump is off - if so, show appropriate message
    if (data.filter?.status === false) {
      if (domCache.saltValue) {
        domCache.saltValue.textContent = 'Pump Off';
        domCache.saltValue.classList.remove('skeleton-value');
        domCache.saltValue.classList.add('pump-off-indicator');
      }
      console.log('🧂 Salt sensor unavailable - pump is off');
    } else {
      console.warn('🧂 Salt data is missing or invalid:', data.chlorinator?.salt?.instant);
    }
  }

  // Update water temperature card
  console.log('🌊 Water temp data:', data.dashboard?.temperature);
  const waterTempValue = document.getElementById('waterTempValue');
  const waterTempComfort = document.getElementById('waterTempComfort');
  const waterTempCard = document.getElementById('waterTempCard');

  if (data.dashboard?.temperature?.actual && data.dashboard.temperature.actual !== null && data.dashboard.temperature.actual !== '--') {
    console.log('🌊 Found water temp element:', waterTempValue);
    if (waterTempValue) {
      waterTempValue.textContent = Math.round(data.dashboard.temperature.actual);
      waterTempValue.classList.remove('skeleton-value');
      waterTempValue.classList.remove('pump-off-indicator');
      console.log('🌊 Updated water temp value to:', Math.round(data.dashboard.temperature.actual));
    }

    if (waterTempComfort) {
      const temp = parseFloat(data.dashboard.temperature.actual);
      if (!isNaN(temp)) {
        waterTempComfort.textContent = getWaterComfortLevel(temp);
        waterTempComfort.classList.remove('skeleton-text');
        console.log('🌊 Updated comfort level to:', getWaterComfortLevel(temp));
      }
    }

    // Mark as loaded
    if (waterTempCard) {
      waterTempCard.classList.add('loaded');
    }
  } else {
    // Check if pump is off - if so, show appropriate message
    if (data.filter?.status === false) {
      if (waterTempValue) {
        waterTempValue.textContent = 'Pump Off';
        waterTempValue.classList.remove('skeleton-value');
        waterTempValue.classList.add('pump-off-indicator');
      }
      if (waterTempComfort) {
        waterTempComfort.textContent = 'Sensor Unavailable';
        waterTempComfort.classList.remove('skeleton-text');
        waterTempComfort.classList.add('pump-off-indicator');
      }
      console.log('🌊 Water temp sensor unavailable - pump is off');
    } else {
      // Show default when no data available
      if (waterTempValue) {
        waterTempValue.textContent = '--';
        waterTempValue.classList.remove('skeleton-value');
        waterTempValue.classList.remove('pump-off-indicator');
      }
      console.warn('🌊 Water temp data is missing or invalid:', data.dashboard?.temperature?.actual);
    }
  }

  // Update cell voltage card
  const cellVoltageValue = document.getElementById('cellVoltageValue');
  const cellVoltageStatus = document.getElementById('cellVoltageStatus');
  const cellVoltageCard = document.getElementById('cellVoltageCard');

  if (data.chlorinator?.cell?.voltage && data.chlorinator.cell.voltage !== null && data.chlorinator.cell.voltage !== '--') {
    if (cellVoltageValue) {
      cellVoltageValue.textContent = data.chlorinator.cell.voltage;
      cellVoltageValue.classList.remove('skeleton-value');
    }

    if (cellVoltageStatus) {
      const voltage = parseFloat(data.chlorinator.cell.voltage);
      if (!isNaN(voltage)) {
        cellVoltageStatus.textContent = voltage > 5 ? 'Operating' : 'Inactive';
        cellVoltageStatus.classList.remove('skeleton-text');
      }
    }

    // Mark as loaded
    if (cellVoltageCard) {
      cellVoltageCard.classList.add('loaded');
    }
  } else {
    // Show default when no data available
    if (cellVoltageValue) {
      cellVoltageValue.textContent = '--';
      cellVoltageValue.classList.remove('skeleton-value');
    }
  }

  // Update filter pump card
  if (data.filter?.status !== null && data.filter?.status !== undefined) {
    const filterPumpValue = document.getElementById('filterPumpValue');
    const filterPumpState = document.getElementById('filterPumpState');

    if (filterPumpValue) {
      filterPumpValue.textContent = data.filter.status ? 'ON' : 'OFF';
      filterPumpValue.classList.remove('skeleton-value');
    }

    if (filterPumpState) {
      filterPumpState.textContent = data.filter.status ? 'Running' : 'Stopped';
      filterPumpState.classList.remove('skeleton-text');
    }

    // Mark as loaded
    const filterPumpCard = document.getElementById('filterPumpCard');
    if (filterPumpCard) {
      filterPumpCard.classList.add('loaded');
    }
  }

  // Update weather temperature card
  if (data.weather && data.weather.temperature !== null && data.weather.temperature !== undefined) {
    const weatherTempValue = document.getElementById('weatherTempValue');
    if (weatherTempValue) {
      weatherTempValue.textContent = Math.round(data.weather.temperature);
      weatherTempValue.classList.remove('skeleton-value');
    }

    // Mark as loaded
    const weatherCard = document.getElementById('weatherCard');
    if (weatherCard) {
      weatherCard.classList.add('loaded');
    }
  }

  // Update timestamp
  const timestampElement = document.getElementById('timestamp');
  if (timestampElement) {
    timestampElement.textContent = new Date().toLocaleTimeString();
  }
};
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Handle dark mode changes
   */
  const handleDarkModeChange = (_e) => {
    // Reinitialize charts with new color scheme
    if (tempChart) {
      tempChart.destroy();
      initializeTempChart();
    }
    if (electricalChart) {
      electricalChart.destroy();
      initializeElectricalChart();
    }
    if (chemistryChart) {
      chemistryChart.destroy();
      initializeChemistryChart();
    }
    if (saltSparkline) {
      saltSparkline.destroy();
      saltSparkline = null;
    }
    if (waterTempSparkline) {
      waterTempSparkline.destroy();
      waterTempSparkline = null;
    }
    if (cellVoltageSparkline) {
      cellVoltageSparkline.destroy();
      cellVoltageSparkline = null;
    }
    if (filterPumpSparkline) {
      filterPumpSparkline.destroy();
      filterPumpSparkline = null;
    }
    if (weatherTimeSeriesChart) {
      weatherTimeSeriesChart.destroy();
      weatherTimeSeriesChart = null;
    }

    // Reinitialize spark lines
    initializeSparklines();

    // Update charts with current data
    updateAllCharts();
    updateSparklines();
  };

  loadPoolData();
  loadWeatherAlerts(); // Load weather alerts on page load
  loadWeatherTimeSeries(); // Load weather time series on page load

  // Listen for dark mode changes
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopChartAutoRefresh();
  stopStatsAutoRefresh();
  cleanupChart();
});

// Make functions globally available
window.updateAllCharts = updateAllCharts;
