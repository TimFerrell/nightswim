// Global chart instances
let tempChart = null;
let electricalChart = null;
let chemistryChart = null;
let chartUpdateInterval = null;
let statsUpdateInterval = null;

/**
 * Common chart configuration
 */
const getChartConfig = (type) => {
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
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#667eea',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
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
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          }
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
          weight: 'bold'
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.08)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11
        }
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
          weight: 'bold'
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.08)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11
        }
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
          weight: 'bold'
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.08)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11
        }
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
          backgroundColor: 'rgba(69, 183, 209, 0.15)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Air Temperature (°F)',
          data: [],
          borderColor: '#ffa726',
          backgroundColor: 'rgba(255, 167, 38, 0.15)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Cell Temperature (°F)',
          data: [],
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.15)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
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
          backgroundColor: 'rgba(78, 205, 196, 0.15)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
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
          backgroundColor: 'rgba(102, 126, 234, 0.15)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
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
  
  // Update status for all charts
  const dataCount = tempChart ? tempChart.data.labels.length : 0;
  const oldestTime = tempChart && tempChart.data.labels[0] ? tempChart.data.labels[0].toLocaleTimeString() : 'N/A';
  const newestTime = tempChart && tempChart.data.labels[tempChart.data.labels.length - 1] ? 
    tempChart.data.labels[tempChart.data.labels.length - 1].toLocaleTimeString() : 'N/A';
  const statusText = `${dataCount} data points | ${oldestTime} - ${newestTime} | Updated: ${new Date().toLocaleTimeString()}`;
  
  document.getElementById('tempChartStatus').textContent = statusText;
  document.getElementById('electricalChartStatus').textContent = statusText;
  document.getElementById('chemistryChartStatus').textContent = statusText;
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
      // Just refresh the charts with existing data from InfluxDB
      updateAllCharts();
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

    // Initialize charts only once, then just update them
    if (!tempChart) {
      initializeTempChart();
      initializeElectricalChart();
      initializeChemistryChart();
      updateAllCharts(); // Load initial historical data
    } else {
      // Append the new data point to the existing charts
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

          // Add new data point to charts if they exist
      if (tempChart) {
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
window.updateAllCharts = () => {
  if (tempChart) {
    updateAllCharts(); // Reload full dataset for new time range
  }
};

// Clean up when page is unloaded
window.onbeforeunload = () => {
  stopChartAutoRefresh();
  stopStatsAutoRefresh();
  cleanupChart();
};
