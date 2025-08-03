// Chart instances
let tempChart = null;
let electricalChart = null;
let chemistryChart = null;

// Spark line chart instances
let saltSparkline = null;
let waterTempSparkline = null;
let cellVoltageSparkline = null;

// Auto-refresh intervals
let chartRefreshInterval = null;
let statsRefreshInterval = null;

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
const cleanupChart = () => {
  if (tempChart) {
    tempChart.destroy();
    tempChart = null;
  }
  if (electricalChart) {
    electricalChart.destroy();
    electricalChart = null;
  }
  if (chemistryChart) {
    chemistryChart.destroy();
    chemistryChart = null;
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
 * Format pool data for display
 */
const formatPoolData = (data) => {
  const statusGrid = document.getElementById('statusGrid');
  
  // Create status cards
  const cards = [];
  
  // Water Temperature Card
  if (data.dashboard?.temperature) {
    cards.push(`
      <div class="status-card">
        <h3>Water Temperature</h3>
        <div class="status-value">${data.dashboard.temperature.actual || '--'}</div>
        <div class="status-unit">°F</div>
        <div class="sparkline-container">
          <canvas id="waterTempSparkline" class="sparkline-canvas"></canvas>
        </div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Target</span>
            <span class="status-detail-value">${data.dashboard.temperature.target || '--'}°F</span>
          </div>
        </div>
      </div>
    `);
  }
  
  // Air Temperature Card
  if (data.dashboard?.airTemperature) {
    cards.push(`
      <div class="status-card">
        <h3>Air Temperature</h3>
        <div class="status-value">${data.dashboard.airTemperature || '--'}</div>
        <div class="status-unit">°F</div>
      </div>
    `);
  }
  
  // Salt Level Card
  if (data.chlorinator?.salt) {
    // Calculate 24-hour moving average from time series data
    let average24H = '--';
    if (saltSparkline && saltSparkline.data.datasets[0].data.length > 0) {
      const saltData = saltSparkline.data.datasets[0].data.filter(v => v !== null && v !== undefined);
      if (saltData.length > 0) {
        const sum = saltData.reduce((acc, val) => acc + val, 0);
        average24H = Math.round(sum / saltData.length);
      }
    }
    
    cards.push(`
      <div class="status-card">
        <h3>Salt Level</h3>
        <div class="status-value">${data.chlorinator.salt.instant || '--'}</div>
        <div class="status-unit">PPM</div>
        <div class="sparkline-container">
          <canvas id="saltSparkline" class="sparkline-canvas"></canvas>
        </div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Average 24H</span>
            <span class="status-detail-value">${average24H} PPM</span>
          </div>
        </div>
      </div>
    `);
  }
  
  // Cell Voltage Card
  if (data.chlorinator?.cell?.voltage) {
    cards.push(`
      <div class="status-card">
        <h3>Cell Voltage</h3>
        <div class="status-value">${data.chlorinator.cell.voltage || '--'}</div>
        <div class="status-unit">V</div>
        <div class="sparkline-container">
          <canvas id="cellVoltageSparkline" class="sparkline-canvas"></canvas>
        </div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Temperature</span>
            <span class="status-detail-value">${data.chlorinator.cell.temperature?.value || '--'}°F</span>
          </div>
        </div>
      </div>
    `);
  }
  
  // Filter Status Card
  if (data.filter) {
    const filterStatus = data.filter.status ? 'Running' : 'Stopped';
    const statusClass = data.filter.status ? 'status-on' : 'status-off';
    
    cards.push(`
      <div class="status-card">
        <h3>Filter Pump</h3>
        <div class="status-value">${filterStatus}</div>
        <div class="status-unit">Status</div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Speed</span>
            <span class="status-detail-value">${data.filter.speed || '--'} RPM</span>
          </div>
        </div>
      </div>
    `);
  }
  
  // Heater Status Card
  if (data.heater) {
    const heaterStatus = data.heater.status ? 'Active' : 'Inactive';
    
    cards.push(`
      <div class="status-card">
        <h3>Heater</h3>
        <div class="status-value">${heaterStatus}</div>
        <div class="status-unit">Status</div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Target</span>
            <span class="status-detail-value">${data.heater.target || '--'}°F</span>
          </div>
        </div>
      </div>
    `);
  }
  
  // Update the status grid
  statusGrid.innerHTML = cards.join('');
  
  // Update timestamp
  const timestamp = document.getElementById('timestamp');
  timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
};

/**
 * Load pool data and initialize dashboard
 */
const loadPoolData = async () => {
  try {
    const response = await fetch('/api/pool/data', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch pool data');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load pool data');
    }
    
    // Initialize charts if not already done
    if (!tempChart) {
      initializeTempChart();
      initializeElectricalChart();
      initializeChemistryChart();
      initializeSparklines();
      updateAllCharts();
      updateSparklines();
    }
    
    // Create time series data point
    const timeSeriesPoint = {
      timestamp: new Date().toISOString(),
      saltInstant: result.data.chlorinator?.salt?.instant || null,
      cellTemp: result.data.chlorinator?.cell?.temperature?.value || null,
      cellVoltage: result.data.chlorinator?.cell?.voltage || null,
      waterTemp: result.data.dashboard?.temperature?.actual || null,
      airTemp: result.data.dashboard?.airTemperature || null
    };
    
    // Append to charts
    appendDataPoint(timeSeriesPoint);
    
    // Format and display the data (after spark lines are updated)
    formatPoolData(result.data);
    
    // Start auto-refresh
    startChartAutoRefresh();
    startStatsAutoRefresh();
    
  } catch (error) {
    console.error('Error loading pool data:', error);
    document.getElementById('timestamp').textContent = `Error: ${error.message}`;
  }
};

/**
 * Initialize spark line charts
 */
const initializeSparklines = () => {
  // Initialize salt spark line
  const saltCanvas = document.getElementById('saltSparkline');
  if (saltCanvas && !saltSparkline) {
    const ctx = saltCanvas.getContext('2d');
    saltSparkline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#8b9bb4',
          backgroundColor: 'rgba(139, 155, 180, 0.1)',
          borderWidth: 1.5,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
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
  if (waterTempCanvas && !waterTempSparkline) {
    const ctx = waterTempCanvas.getContext('2d');
    waterTempSparkline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#8b9bb4',
          backgroundColor: 'rgba(139, 155, 180, 0.1)',
          borderWidth: 1.5,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
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
  if (cellVoltageCanvas && !cellVoltageSparkline) {
    const ctx = cellVoltageCanvas.getContext('2d');
    cellVoltageSparkline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#8b9bb4',
          backgroundColor: 'rgba(139, 155, 180, 0.1)',
          borderWidth: 1.5,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        interaction: { intersect: false },
        elements: { point: { radius: 0 } }
      }
    });
  }
};

/**
 * Update spark lines with new data
 */
const updateSparklines = async () => {
  try {
    const response = await fetch('/api/pool/timeseries?hours=24', {
      credentials: 'include'
    });
    
    if (!response.ok) return;
    
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) return;
    
    // Update salt spark line
    if (saltSparkline) {
      const saltData = result.data.map(point => point.saltInstant).filter(v => v !== null && v !== undefined);
      if (saltData.length > 0) {
        saltSparkline.data.labels = Array(saltData.length).fill('');
        saltSparkline.data.datasets[0].data = saltData;
        saltSparkline.update('none');
      }
    }
    
    // Update water temperature spark line
    if (waterTempSparkline) {
      const waterTempData = result.data.map(point => point.waterTemp).filter(v => v !== null && v !== undefined);
      if (waterTempData.length > 0) {
        waterTempSparkline.data.labels = Array(waterTempData.length).fill('');
        waterTempSparkline.data.datasets[0].data = waterTempData;
        waterTempSparkline.update('none');
      }
    }
    
    // Update cell voltage spark line
    if (cellVoltageSparkline) {
      const cellVoltageData = result.data.map(point => point.cellVoltage).filter(v => v !== null && v !== undefined);
      if (cellVoltageData.length > 0) {
        cellVoltageSparkline.data.labels = Array(cellVoltageData.length).fill('');
        cellVoltageSparkline.data.datasets[0].data = cellVoltageData;
        cellVoltageSparkline.update('none');
      }
    }
    
  } catch (error) {
    console.error('Spark line update error:', error);
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
