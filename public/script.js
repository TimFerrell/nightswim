// Global chart instance
let poolChart = null;
let chartUpdateInterval = null;
let statsUpdateInterval = null;

/**
 * Initialize the pool metrics chart
 */
const initializeChart = () => {
  const ctx = document.getElementById('poolChart').getContext('2d');
  
  poolChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Salt Level (PPM)',
          data: [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Cell Temperature (°F)',
          data: [],
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Cell Voltage (V)',
          data: [],
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          tension: 0.4,
          yAxisID: 'y2'
        },
        {
          label: 'Water Temperature (°F)',
          data: [],
          borderColor: '#45b7d1',
          backgroundColor: 'rgba(69, 183, 209, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        }
      ]
    },
    options: {
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
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: '#667eea',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true
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
            text: 'Time'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temperature (°F) / Salt (PPM)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Voltage (V)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
};

/**
 * Update the chart with new data
 */
const updateChart = async () => {
  if (!poolChart) return;
  
  const timeRange = document.getElementById('timeRange').value;
  const statusElement = document.getElementById('chartStatus');
  
  try {
    statusElement.textContent = 'Loading...';
    
    const response = await fetch(`/api/pool/timeseries?hours=${timeRange}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch time series data');
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      statusElement.textContent = 'No data available';
      return;
    }
    
    // Process data for chart
    const labels = result.data.map(point => new Date(point.timestamp));
    const saltData = result.data.map(point => point.saltInstant);
    const cellTempData = result.data.map(point => point.cellTemp);
    const cellVoltageData = result.data.map(point => point.cellVoltage);
    const waterTempData = result.data.map(point => point.waterTemp);
    
    // Update chart data
    poolChart.data.labels = labels;
    poolChart.data.datasets[0].data = saltData;
    poolChart.data.datasets[1].data = cellTempData;
    poolChart.data.datasets[2].data = cellVoltageData;
    poolChart.data.datasets[3].data = waterTempData;
    
    poolChart.update('none'); // Update without animation for better performance
    
    // Update status with data info
    const dataCount = result.data.length;
    const oldestTime = result.stats?.oldestTimestamp ? new Date(result.stats.oldestTimestamp).toLocaleTimeString() : 'N/A';
    const newestTime = result.stats?.newestTimestamp ? new Date(result.stats.newestTimestamp).toLocaleTimeString() : 'N/A';
    
    statusElement.textContent = `${dataCount} data points | ${oldestTime} - ${newestTime} | Updated: ${new Date().toLocaleTimeString()}`;
    
  } catch (error) {
    console.error('Chart update error:', error);
    statusElement.textContent = 'Error loading data';
  }
};

/**
 * Start automatic chart refresh every 30 seconds
 */
const startChartAutoRefresh = () => {
  // Clear any existing interval
  if (chartUpdateInterval) {
    clearInterval(chartUpdateInterval);
  }
  
  // Update every 30 seconds
  chartUpdateInterval = setInterval(() => {
    updateChart();
  }, 30000);
};

/**
 * Stop automatic chart refresh
 */
const stopChartAutoRefresh = () => {
  if (chartUpdateInterval) {
    clearInterval(chartUpdateInterval);
    chartUpdateInterval = null;
  }
};

/**
 * Start automatic stats refresh every 30 seconds
 */
const startStatsAutoRefresh = () => {
  // Clear any existing interval
  if (statsUpdateInterval) {
    clearInterval(statsUpdateInterval);
  }
  
  // Update every 30 seconds
  statsUpdateInterval = setInterval(() => {
    loadPoolData();
  }, 30000);
};

/**
 * Stop automatic stats refresh
 */
const stopStatsAutoRefresh = () => {
  if (statsUpdateInterval) {
    clearInterval(statsUpdateInterval);
    statsUpdateInterval = null;
  }
};

const formatPoolData = (data) => {
  let html = '';

  // System Info
  html += `
        <div class="card">
            <h2>📊 System Info</h2>
            <div class="timestamp">Last updated: ${new Date(data.timestamp).toLocaleString()}</div>
            <div>MSP ID: ${data.system.mspId}</div>
            <div>Bow ID: ${data.system.bowId}</div>
        </div>
    `;

  // Temperature
  if (data.dashboard.temperature) {
    html += `
            <div class="card">
                <h2>🌡️ Temperature</h2>
                <div class="temp">Target: ${data.dashboard.temperature.target || '--'}°F</div>
                <div class="temp">Actual: ${data.dashboard.temperature.actual || '--'}°F</div>
            </div>
        `;
  }

  // Filter Pump
  if (data.dashboard.filterStatus) {
    const statusClass = data.dashboard.filterStatus.toLowerCase() === 'on' ? 'on' : 'off';
    html += `
            <div class="card">
                <h2>🔧 Filter Pump</h2>
                <div class="status ${statusClass}">${data.dashboard.filterStatus.toUpperCase()}</div>
            </div>
        `;
  }

  // Heater
  if (data.heater.temperature) {
    const enabledClass = data.heater.enabled ? 'enabled' : 'off';
    html += `
            <div class="card">
                <h2>🔥 Heater</h2>
                <div class="temp">Current: ${data.heater.temperature.current || '--'}</div>
                <div class="temp">Actual: ${data.heater.temperature.actual || '--'}</div>
                <div class="status ${enabledClass}">${data.heater.enabled ? 'ENABLED' : 'DISABLED'}</div>
            </div>
        `;
  }

  // Chlorinator
  if (data.chlorinator.salt || data.chlorinator.cell) {
    const enabledClass = data.chlorinator.enabled ? 'enabled' : 'off';
    html += `
            <div class="card">
                <h2>🧂 Chlorinator</h2>
                <div class="temp">Salt: ${data.chlorinator.salt?.instant || '--'} PPM</div>
                <div class="temp">Cell Temp: ${data.chlorinator.cell?.temperature?.value || '--'}${data.chlorinator.cell?.temperature?.unit || ''}</div>
                <div class="temp">Cell Voltage: ${data.chlorinator.cell?.voltage || '--'}V</div>
                <div class="status ${enabledClass}">${data.chlorinator.enabled ? 'ENABLED' : 'DISABLED'}</div>
            </div>
        `;
  }

  // Lights
  if (data.lights) {
    const enabledClass = data.lights.enabled ? 'enabled' : 'off';
    html += `
            <div class="card">
                <h2>💡 Lights</h2>
                <div class="status ${enabledClass}">${data.lights.enabled ? 'ENABLED' : 'DISABLED'}</div>
            </div>
        `;
  }

  // Water Features
  if (data.waterFeatures) {
    const enabledClass = data.waterFeatures.enabled ? 'enabled' : 'off';
    html += `
            <div class="card">
                <h2>🌊 Water Features</h2>
                <div class="status ${enabledClass}">${data.waterFeatures.enabled ? 'ENABLED' : 'DISABLED'}</div>
            </div>
        `;
  }

  // Cleaner
  if (data.cleaner) {
    const enabledClass = data.cleaner.enabled ? 'enabled' : 'off';
    html += `
            <div class="card">
                <h2>🤖 Cleaner</h2>
                <div class="status ${enabledClass}">${data.cleaner.enabled ? 'ENABLED' : 'DISABLED'}</div>
            </div>
        `;
  }

  // Schedules
  if (data.schedules && data.schedules.length > 0) {
    html += `
            <div class="card">
                <h2>⏰ Schedules</h2>
        `;

    data.schedules.forEach(schedule => {
      html += `
                <div class="schedule-item">
                    <strong>${schedule.name}</strong><br>
                    <span class="schedule-time">${schedule.startTime} - ${schedule.endTime}</span><br>
                    <span class="schedule-status">${schedule.repeat} | ${schedule.status}</span>
                </div>
            `;
    });

    html += '</div>';
  }

  return html;
};

const loadPoolData = async () => {
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  const error = document.getElementById('error');
  const poolDataDiv = document.getElementById('poolData');

  loading.style.display = 'block';
  content.style.display = 'none';
  error.style.display = 'none';

  try {
    // Get pool data (authentication handled automatically)
    const dataResponse = await fetch('/api/pool/data', {
      credentials: 'include'
    });

    if (!dataResponse.ok) {
      throw new Error('Failed to fetch pool data');
    }

    const data = await dataResponse.json();

    // Display formatted data
    poolDataDiv.innerHTML = formatPoolData(data);

    // Initialize and update chart
    initializeChart();
    updateChart();

    // Start auto-refresh for chart and stats
    startChartAutoRefresh();
    startStatsAutoRefresh();

    loading.style.display = 'none';
    content.style.display = 'block';

  } catch (err) {
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = `❌ Error: ${err.message}`;
  }
};

// Load data when page loads
window.onload = loadPoolData;

// Clean up when page is unloaded
window.onbeforeunload = () => {
  stopChartAutoRefresh();
  stopStatsAutoRefresh();
};
