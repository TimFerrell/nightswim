// Global chart variables
let tempChart, electricalChart, chemistryChart;
let saltSparkline, waterTempSparkline, cellVoltageSparkline, weatherSparkline, filterPumpSparkline;

// Auto-refresh intervals
let chartRefreshInterval = null;
let statsRefreshInterval = null;

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
const updateAllCharts = async () => {
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
};

/**
 * Append a single data point to all charts
 */
const appendDataPoint = (dataPoint) => {
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
const startChartAutoRefresh = () => {
  if (chartRefreshInterval) {
    clearInterval(chartRefreshInterval);
  }
  
  chartRefreshInterval = setInterval(() => {
    updateAllCharts();
    updateSparklines();
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
const startStatsAutoRefresh = () => {
  if (statsRefreshInterval) {
    clearInterval(statsRefreshInterval);
  }
  
  statsRefreshInterval = setInterval(() => {
    loadPoolData();
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
const updateStatusCards = (data) => {
  // Update salt level card
  if (data.chlorinator?.salt?.instant && data.chlorinator.salt.instant !== null && data.chlorinator.salt.instant !== '--') {
    const saltValue = document.getElementById('saltValue');
    if (saltValue) {
      saltValue.textContent = data.chlorinator.salt.instant;
      saltValue.classList.remove('skeleton-value');
    }
    
    // Fetch updated rolling average
    fetchSaltRollingAverage();
    
    // Add pulse animation and mark as loaded
    const saltCard = document.getElementById('saltCard');
    if (saltCard) {
      saltCard.classList.add('pulse', 'loaded');
      setTimeout(() => saltCard.classList.remove('pulse'), 600);
    }
  }

  // Update water temperature card
  if (data.dashboard?.temperature?.actual && data.dashboard.temperature.actual !== null && data.dashboard.temperature.actual !== '--') {
    const waterTempValue = document.getElementById('waterTempValue');
    const waterTempComfort = document.getElementById('waterTempComfort');
    
    if (waterTempValue) {
      waterTempValue.textContent = Math.round(data.dashboard.temperature.actual);
      waterTempValue.classList.remove('skeleton-value');
    }
    
    if (waterTempComfort) {
      const temp = parseFloat(data.dashboard.temperature.actual);
      if (!isNaN(temp)) {
        waterTempComfort.textContent = getWaterComfortLevel(temp);
        waterTempComfort.classList.remove('skeleton-text');
      }
    }
    
    // Add pulse animation and mark as loaded
    const waterTempCard = document.getElementById('waterTempCard');
    if (waterTempCard) {
      waterTempCard.classList.add('pulse', 'loaded');
      setTimeout(() => waterTempCard.classList.remove('pulse'), 600);
    }
  }

  // Update cell voltage card
  if (data.chlorinator?.cell?.voltage && data.chlorinator.cell.voltage !== null && data.chlorinator.cell.voltage !== '--') {
    const cellVoltageValue = document.getElementById('cellVoltageValue');
    const cellVoltageStatus = document.getElementById('cellVoltageStatus');
    
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
    
    // Add pulse animation and mark as loaded
    const cellVoltageCard = document.getElementById('cellVoltageCard');
    if (cellVoltageCard) {
      cellVoltageCard.classList.add('pulse', 'loaded');
      setTimeout(() => cellVoltageCard.classList.remove('pulse'), 600);
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
    
    // Add pulse animation and mark as loaded
    const filterPumpCard = document.getElementById('filterPumpCard');
    if (filterPumpCard) {
      filterPumpCard.classList.add('pulse', 'loaded');
      setTimeout(() => filterPumpCard.classList.remove('pulse'), 600);
    }
  }

  // Update weather temperature card
  if (data.weather && data.weather.temperature !== null && data.weather.temperature !== undefined) {
    const weatherTempValue = document.getElementById('weatherTempValue');
    if (weatherTempValue) {
      weatherTempValue.textContent = Math.round(data.weather.temperature);
      weatherTempValue.classList.remove('skeleton-value');
    }
    
    // Add pulse animation and mark as loaded
    const weatherCard = document.getElementById('weatherCard');
    if (weatherCard) {
      weatherCard.classList.add('pulse', 'loaded');
      setTimeout(() => weatherCard.classList.remove('pulse'), 600);
    }
  }

  // Update timestamp
  const timestampElement = document.getElementById('timestamp');
  if (timestampElement) {
    timestampElement.textContent = new Date().toLocaleTimeString();
  }
};

/**
 * Load and display pool data from InfluxDB
 */
const loadPoolData = async () => {
  try {
    console.log('🚀 Loading pool data from InfluxDB...');
    const startTime = Date.now();

    const response = await fetch('/api/pool/data', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to load pool data');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error('Invalid response format');
    }

    const data = result.data;
    const loadTime = Date.now() - startTime;
    console.log(`✅ Pool data loaded in ${loadTime}ms from ${result.source}`);

    // Initialize charts if not already done
    if (!tempChart) {
      initializeTempChart();
      initializeElectricalChart();
      initializeChemistryChart();
      
      // Initialize spark lines
      setTimeout(() => {
        initializeSparklines();
        updateSparklines();
      }, 100);
      
      updateAllCharts();
      
      // Start auto-refresh
      startChartAutoRefresh();
      startStatsAutoRefresh();
    }

    // Update status cards with data
    updateStatusCards(data);

    // Update spark lines with 24-hour data
    setTimeout(() => {
      updateSparklines();
    }, 100);

  } catch (error) {
    console.error('Error loading pool data:', error);
    // Show error state
    const statusGrid = document.getElementById('statusGrid');
    if (statusGrid) {
      statusGrid.innerHTML = `
        <div class="loading-progress">
          <p style="color: var(--color-error);">Error loading data: ${error.message}</p>
          <button onclick="loadPoolData()" style="margin-top: var(--spacing-4); padding: var(--spacing-2) var(--spacing-4); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer;">Retry</button>
        </div>
      `;
    }
  }
};

/**
 * Initialize spark line charts
 */
const initializeSparklines = () => {
  try {
    // Clean up existing spark lines
    cleanupChart(saltSparkline);
    cleanupChart(waterTempSparkline);
    cleanupChart(cellVoltageSparkline);
    cleanupChart(weatherSparkline);
    cleanupChart(filterPumpSparkline);

    // Initialize salt spark line
    const saltCanvas = document.getElementById('saltSparkline');
    if (saltCanvas) {
      saltSparkline = new Chart(saltCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          interaction: { intersect: false },
          elements: { point: { radius: 0 } }
        }
      });
    }

    // Initialize water temperature spark line
    const waterTempCanvas = document.getElementById('waterTempSparkline');
    if (waterTempCanvas) {
      waterTempSparkline = new Chart(waterTempCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          interaction: { intersect: false },
          elements: { point: { radius: 0 } }
        }
      });
    }

    // Initialize cell voltage spark line
    const cellVoltageCanvas = document.getElementById('cellVoltageSparkline');
    if (cellVoltageCanvas) {
      cellVoltageSparkline = new Chart(cellVoltageCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          interaction: { intersect: false },
          elements: { point: { radius: 0 } }
        }
      });
    }

    // Initialize weather spark line
    const weatherCanvas = document.getElementById('weatherSparkline');
    if (weatherCanvas) {
      weatherSparkline = new Chart(weatherCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          interaction: { intersect: false },
          elements: { point: { radius: 0 } }
        }
      });
    }

    // Initialize filter pump spark line
    const filterPumpCanvas = document.getElementById('filterPumpSparkline');
    if (filterPumpCanvas) {
      filterPumpSparkline = new Chart(filterPumpCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          interaction: { intersect: false },
          elements: { point: { radius: 0 } }
        }
      });
    }
  } catch (error) {
    console.error('Error initializing spark lines:', error);
  }
};

/**
 * Update spark line charts with 24-hour data
 */
const updateSparklines = async () => {
  try {
    const response = await fetch('/api/pool/timeseries?hours=24', {
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to fetch time series data for spark lines');
      return;
    }

    const result = await response.json();
    if (!result.success || !result.data || result.data.length === 0) {
      return;
    }

    const data = result.data;

    // Update salt spark line
    if (saltSparkline) {
      const saltData = data.map(point => point.saltInstant).filter(v => v !== null && v !== undefined);
      saltSparkline.data.labels = Array(saltData.length).fill('');
      saltSparkline.data.datasets[0].data = saltData;
      saltSparkline.update('none');
    }

    // Update water temperature spark line
    if (waterTempSparkline) {
      const waterTempData = data.map(point => point.waterTemp).filter(v => v !== null && v !== undefined);
      waterTempSparkline.data.labels = Array(waterTempData.length).fill('');
      waterTempSparkline.data.datasets[0].data = waterTempData;
      waterTempSparkline.update('none');
    }

    // Update cell voltage spark line
    if (cellVoltageSparkline) {
      const cellVoltageData = data.map(point => point.cellVoltage).filter(v => v !== null && v !== undefined);
      cellVoltageSparkline.data.labels = Array(cellVoltageData.length).fill('');
      cellVoltageSparkline.data.datasets[0].data = cellVoltageData;
      cellVoltageSparkline.update('none');
    }

    // Update weather spark line
    if (weatherSparkline) {
      const weatherData = data.map(point => point.weatherTemp).filter(v => v !== null && v !== undefined);
      weatherSparkline.data.labels = Array(weatherData.length).fill('');
      weatherSparkline.data.datasets[0].data = weatherData;
      weatherSparkline.update('none');
    }

    // Update filter pump spark line
    if (filterPumpSparkline) {
      const filterPumpData = data.map(point => point.filterPumpStatus).filter(v => v !== null && v !== undefined);
      filterPumpSparkline.data.labels = Array(filterPumpData.length).fill('');
      filterPumpSparkline.data.datasets[0].data = filterPumpData;
      filterPumpSparkline.update('none');
    }
  } catch (error) {
    console.error('Error updating spark lines:', error);
  }
};

/**
 * Fetch the 24-hour rolling average for salt level
 */
const fetchSaltRollingAverage = async () => {
  try {
    const response = await fetch('/api/pool/salt/average', {
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to fetch 24-hour salt rolling average');
      const element = document.getElementById('saltAverage24H');
      if (element) element.textContent = 'N/A';
      return;
    }

    const result = await response.json();

    if (!result.success) {
      const element = document.getElementById('saltAverage24H');
      if (element) element.textContent = 'N/A';
      return;
    }

    const average24H = result.rollingAverage || 'N/A';
    const element = document.getElementById('saltAverage24H');
    if (element) {
      element.textContent = average24H === 'N/A' ? 'N/A' : `${average24H} PPM`;
    }
  } catch (error) {
    console.error('Error fetching salt rolling average:', error);
    const element = document.getElementById('saltAverage24H');
    if (element) element.textContent = 'N/A';
  }
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadPoolData();
  
  // Listen for dark mode changes
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
});

/**
 * Handle dark mode changes
 */
const handleDarkModeChange = (e) => {
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
  
  // Reinitialize spark lines
  initializeSparklines();
  
  // Update charts with current data
  updateAllCharts();
  updateSparklines();
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopChartAutoRefresh();
  stopStatsAutoRefresh();
  cleanupChart();
});

// Make functions globally available
window.updateAllCharts = updateAllCharts;
