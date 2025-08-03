// Global chart instance
let poolChart = null;
let chartUpdateInterval = null;
let statsUpdateInterval = null;

/**
 * Initialize the pool metrics chart
 */
const initializeChart = () => {
  // Destroy existing chart if it exists
  if (poolChart) {
    poolChart.destroy();
  }
  
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
        },
        {
          label: 'Air Temperature (°F)',
          data: [],
          borderColor: '#ffa726',
          backgroundColor: 'rgba(255, 167, 38, 0.1)',
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
    const airTempData = result.data.map(point => point.airTemp);
    
    // Update chart data
    poolChart.data.labels = labels;
    poolChart.data.datasets[0].data = saltData;
    poolChart.data.datasets[1].data = cellTempData;
    poolChart.data.datasets[2].data = cellVoltageData;
    poolChart.data.datasets[3].data = waterTempData;
    poolChart.data.datasets[4].data = airTempData;
    
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
 * Append a single data point to the chart
 */
const appendDataPoint = (dataPoint) => {
  if (!poolChart) return;
  
  const timestamp = new Date(dataPoint.timestamp);
  
  // Add new data point to each dataset
  poolChart.data.labels.push(timestamp);
  poolChart.data.datasets[0].data.push(dataPoint.saltInstant);
  poolChart.data.datasets[1].data.push(dataPoint.cellTemp);
  poolChart.data.datasets[2].data.push(dataPoint.cellVoltage);
  poolChart.data.datasets[3].data.push(dataPoint.waterTemp);
  poolChart.data.datasets[4].data.push(dataPoint.airTemp);
  
  // Remove old data points if we exceed the time range
  const timeRange = parseInt(document.getElementById('timeRange').value);
  const cutoffTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
  
  while (poolChart.data.labels.length > 0 && poolChart.data.labels[0] < cutoffTime) {
    poolChart.data.labels.shift();
    poolChart.data.datasets[0].data.shift();
    poolChart.data.datasets[1].data.shift();
    poolChart.data.datasets[2].data.shift();
    poolChart.data.datasets[3].data.shift();
    poolChart.data.datasets[4].data.shift();
  }
  
  // Update chart with smooth animation
  poolChart.update('active');
  
  // Update status
  const statusElement = document.getElementById('chartStatus');
  const dataCount = poolChart.data.labels.length;
  const oldestTime = poolChart.data.labels[0] ? poolChart.data.labels[0].toLocaleTimeString() : 'N/A';
  const newestTime = poolChart.data.labels[poolChart.data.labels.length - 1] ? 
    poolChart.data.labels[poolChart.data.labels.length - 1].toLocaleTimeString() : 'N/A';
  
  statusElement.textContent = `${dataCount} data points | ${oldestTime} - ${newestTime} | Updated: ${new Date().toLocaleTimeString()}`;
};

/**
 * Start automatic chart refresh every 2 minutes
 * Data is collected by cron every 5 minutes, so we refresh slightly more frequently
 */
const startChartAutoRefresh = () => {
  // Clear any existing interval
  if (chartUpdateInterval) {
    clearInterval(chartUpdateInterval);
  }
  
  // Update every 2 minutes (data collected by cron every 5 minutes)
  chartUpdateInterval = setInterval(async () => {
    try {
      // Just refresh the chart with existing data from InfluxDB
      updateChart();
    } catch (error) {
      console.error('Chart refresh error:', error);
    }
  }, 120000); // 2 minutes
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
 * Clean up chart resources
 */
const cleanupChart = () => {
  if (poolChart) {
    poolChart.destroy();
    poolChart = null;
  }
};

/**
 * Start automatic stats refresh every 2 minutes
 * Data is collected by cron every 5 minutes
 */
const startStatsAutoRefresh = () => {
  // Clear any existing interval
  if (statsUpdateInterval) {
    clearInterval(statsUpdateInterval);
  }
  
  // Update every 2 minutes (data collected by cron every 5 minutes)
  statsUpdateInterval = setInterval(() => {
    refreshPoolData();
  }, 120000); // 2 minutes
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
                <div class="temp">Water: ${data.dashboard.temperature.actual || '--'}°F</div>
                <div class="temp">Air: ${data.dashboard.airTemperature || '--'}°F</div>
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

/**
 * Initial page load - shows loading screen and loads everything
 */
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

    // Initialize chart only once, then just update it
    if (!poolChart) {
      initializeChart();
      updateChart(); // Load initial historical data
    } else {
      // Append the new data point to the existing chart
      const timeSeriesPoint = {
        timestamp: data.timestamp,
        saltInstant: data.chlorinator?.salt?.instant || null,
        cellTemp: data.chlorinator?.cell?.temperature?.value || null,
        cellVoltage: data.chlorinator?.cell?.voltage || null,
        waterTemp: data.dashboard?.temperature?.actual || null,
        airTemp: data.dashboard?.airTemperature || null
      };
      appendDataPoint(timeSeriesPoint);
    }

    // Start auto-refresh for chart and stats (data now collected by cron)
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

/**
 * Refresh just the pool data without reloading the page
 */
const refreshPoolData = async () => {
  const poolDataDiv = document.getElementById('poolData');
  const error = document.getElementById('error');
  const refreshBtn = document.querySelector('.refresh-btn');

  try {
    // Show refreshing state
    const originalText = refreshBtn.textContent;
    refreshBtn.textContent = '⏳ Refreshing...';
    refreshBtn.disabled = true;

    // Get pool data (authentication handled automatically)
    const dataResponse = await fetch('/api/pool/data', {
      credentials: 'include'
    });

    if (!dataResponse.ok) {
      throw new Error('Failed to fetch pool data');
    }

    const data = await dataResponse.json();

    // Update just the data display without showing loading screen
    poolDataDiv.innerHTML = formatPoolData(data);

          // Add new data point to chart if chart exists
      if (poolChart) {
        const timeSeriesPoint = {
          timestamp: data.timestamp,
          saltInstant: data.chlorinator?.salt?.instant || null,
          cellTemp: data.chlorinator?.cell?.temperature?.value || null,
          cellVoltage: data.chlorinator?.cell?.voltage || null,
          waterTemp: data.dashboard?.temperature?.actual || null,
          airTemp: data.dashboard?.airTemperature || null
        };
        appendDataPoint(timeSeriesPoint);
      }

    // Hide any existing errors
    error.style.display = 'none';

    // Show success state briefly
    refreshBtn.textContent = '✅ Updated!';
    setTimeout(() => {
      refreshBtn.textContent = originalText;
      refreshBtn.disabled = false;
    }, 1000);

  } catch (err) {
    console.error('Refresh error:', err);
    // Show error state briefly
    refreshBtn.textContent = '❌ Error';
    setTimeout(() => {
      refreshBtn.textContent = originalText;
      refreshBtn.disabled = false;
    }, 2000);
  }
};

// Load data when page loads
window.onload = loadPoolData;

// Handle time range changes
window.updateChart = () => {
  if (poolChart) {
    updateChart(); // Reload full dataset for new time range
  }
};

// Clean up when page is unloaded
window.onbeforeunload = () => {
  stopChartAutoRefresh();
  stopStatsAutoRefresh();
  cleanupChart();
};
