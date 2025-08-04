// Global chart variables
let tempChart, electricalChart, chemistryChart;
let saltSparkline, waterTempSparkline, cellVoltageSparkline, weatherSparkline;

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
  if (data.chlorinator?.salt?.instant && data.chlorinator.salt.instant !== null && data.chlorinator.salt.instant !== '--') {
    cards.push(`
      <div class="status-card">
        <h3>Salt Level</h3>
        <div class="status-value">${data.chlorinator.salt.instant}</div>
        <div class="status-unit">PPM</div>
        <div class="sparkline-container">
          <canvas id="saltSparkline" class="sparkline-canvas"></canvas>
        </div>
        <div class="status-details">
          <div class="status-detail">
            <span class="status-detail-label">Average 24H</span>
            <span class="status-detail-value" id="saltAverage24H">Loading...</span>
          </div>
        </div>
      </div>
    `);
    
    // Fetch the rolling average after card is created
    fetchSaltRollingAverage();
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
 * Update existing status cards with new data (without recreating them)
 */
const updateStatusCards = (data) => {
  // Update salt level card
  const saltCard = document.querySelector('#saltSparkline')?.closest('.status-card');
  if (saltCard && data.chlorinator?.salt?.instant && data.chlorinator.salt.instant !== null && data.chlorinator.salt.instant !== '--') {
    const statusValue = saltCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = data.chlorinator.salt.instant;
    }
    
    // Fetch updated rolling average
    fetchSaltRollingAverage();
    
    // Add pulse animation
    saltCard.classList.add('pulse');
    setTimeout(() => saltCard.classList.remove('pulse'), 600);
  }
  
  // Update water temperature card
  const waterTempCard = document.querySelector('#waterTempSparkline')?.closest('.status-card');
  if (waterTempCard && data.dashboard?.temperature) {
    const statusValue = waterTempCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = data.dashboard.temperature.actual || '--';
    }
    
    const targetElement = waterTempCard.querySelector('.status-detail-value');
    if (targetElement) {
      targetElement.textContent = `${data.dashboard.temperature.target || '--'}°F`;
    }
    
    // Add pulse animation
    waterTempCard.classList.add('pulse');
    setTimeout(() => waterTempCard.classList.remove('pulse'), 600);
  }
  
  // Update cell voltage card
  const cellVoltageCard = document.querySelector('#cellVoltageSparkline')?.closest('.status-card');
  if (cellVoltageCard && data.chlorinator?.cell?.voltage) {
    const statusValue = cellVoltageCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = data.chlorinator.cell.voltage || '--';
    }
    
    const tempElement = cellVoltageCard.querySelector('.status-detail-value');
    if (tempElement) {
      tempElement.textContent = `${data.chlorinator.cell.temperature?.value || '--'}°F`;
    }
    
    // Add pulse animation
    cellVoltageCard.classList.add('pulse');
    setTimeout(() => cellVoltageCard.classList.remove('pulse'), 600);
  }
  
  // Update air temperature card (find by h3 text content)
  const airTempCards = document.querySelectorAll('.status-card h3');
  const airTempCard = Array.from(airTempCards).find(h3 => h3.textContent === 'Air Temperature')?.closest('.status-card');
  if (airTempCard && data.dashboard?.airTemperature) {
    const statusValue = airTempCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = data.dashboard.airTemperature || '--';
    }
    
    // Add pulse animation
    airTempCard.classList.add('pulse');
    setTimeout(() => airTempCard.classList.remove('pulse'), 600);
  }
  
  // Update filter pump card (find by h3 text content)
  const filterCards = document.querySelectorAll('.status-card h3');
  const filterCard = Array.from(filterCards).find(h3 => h3.textContent === 'Filter Pump')?.closest('.status-card');
  if (filterCard && data.filter) {
    const filterStatus = data.filter.status ? 'Running' : 'Stopped';
    const statusValue = filterCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = filterStatus;
    }
    
    const speedElement = filterCard.querySelector('.status-detail-value');
    if (speedElement) {
      speedElement.textContent = `${data.filter.speed || '--'} RPM`;
    }
    
    // Add pulse animation
    filterCard.classList.add('pulse');
    setTimeout(() => filterCard.classList.remove('pulse'), 600);
  }
  
  // Update heater card (find by h3 text content)
  const heaterCards = document.querySelectorAll('.status-card h3');
  const heaterCard = Array.from(heaterCards).find(h3 => h3.textContent === 'Heater')?.closest('.status-card');
  if (heaterCard && data.heater) {
    const heaterStatus = data.heater.status ? 'Active' : 'Inactive';
    const statusValue = heaterCard.querySelector('.status-value');
    if (statusValue) {
      statusValue.textContent = heaterStatus;
    }
    
    const targetElement = heaterCard.querySelector('.status-detail-value');
    if (targetElement) {
      targetElement.textContent = `${data.heater.target || '--'}°F`;
    }
    
    // Add pulse animation
    heaterCard.classList.add('pulse');
    setTimeout(() => heaterCard.classList.remove('pulse'), 600);
  }
  
  // Update timestamp
  const timestamp = document.getElementById('timestamp');
  if (timestamp) {
    timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }
  
  // Update spark lines during refresh
  updateSparklines();
};

/**
 * Load and display pool data
 */
const loadPoolData = async () => {
  try {
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

    // Initialize charts if not already done
    if (!tempChart) {
      initializeTempChart();
      initializeElectricalChart();
      initializeChemistryChart();
      
      // Format and display the data (initial load)
      formatPoolData(data);
      
      // Initialize spark lines after cards are created
      setTimeout(() => {
        initializeSparklines();
        updateSparklines();
      }, 100);
      
      updateAllCharts();
      
      // Start auto-refresh
      startChartAutoRefresh();
      startStatsAutoRefresh();
    } else {
      // Update existing cards without recreating them (refresh)
      updateStatusCards(data);
    }

    // Update weather temperature
    if (data.weather && data.weather.temperature !== null && data.weather.temperature !== undefined) {
      const weatherElement = document.getElementById('weatherTemp');
      if (weatherElement) {
        weatherElement.textContent = Math.round(data.weather.temperature);
      }
    }

    // Update spark lines with 24-hour data
    setTimeout(() => {
      updateSparklines();
    }, 100);

  } catch (error) {
    console.error('Error loading pool data:', error);
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
