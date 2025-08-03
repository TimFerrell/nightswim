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
  const jsonDataDiv = document.getElementById('jsonData');

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

    // Display raw JSON
    jsonDataDiv.textContent = JSON.stringify(data, null, 2);

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
