// Simple script to check time series data without requiring credentials
const timeSeriesService = require('../src/services/timeSeriesService');

function checkTimeSeriesData() {
  console.log('🔍 Checking Time Series Data...\n');

  try {
    // Get recent data points
    const recentData = timeSeriesService.getDataPoints(24); // Last 24 hours
    console.log(`📊 Total data points in last 24 hours: ${recentData.length}`);
    
    if (recentData.length === 0) {
      console.log('❌ No data points found in the last 24 hours');
      return;
    }
    
    // Show the latest data point
    const latestPoint = recentData[recentData.length - 1];
    console.log('\n📈 Latest Data Point:');
    console.log('=====================');
    console.log(`Timestamp: ${latestPoint.timestamp}`);
    console.log(`Pump Status: ${latestPoint.pumpStatus} (${typeof latestPoint.pumpStatus})`);
    console.log(`Salt Level: ${latestPoint.saltInstant}`);
    console.log(`Water Temp: ${latestPoint.waterTemp}`);
    console.log(`Cell Voltage: ${latestPoint.cellVoltage}`);
    
    // Show pump status history
    console.log('\n🔧 Pump Status History (Last 10 points):');
    console.log('=========================================');
    const pumpHistory = recentData.slice(-10).map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      status: point.pumpStatus,
      type: typeof point.pumpStatus
    }));
    
    pumpHistory.forEach((point, index) => {
      console.log(`${index + 1}. ${point.timestamp} - ${point.status} (${point.type})`);
    });
    
    // Count pump status values
    const statusCounts = {};
    recentData.forEach(point => {
      const status = point.pumpStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\n📊 Pump Status Distribution:');
    console.log('============================');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status} (${typeof status}): ${count} times`);
    });
    
    // Get stats
    const stats = timeSeriesService.getStats();
    console.log('\n📈 Time Series Stats:');
    console.log('=====================');
    console.log(`Total points: ${stats.totalPoints}`);
    console.log(`Retention hours: ${stats.retentionHours}`);
    console.log(`Oldest timestamp: ${stats.oldestTimestamp}`);
    console.log(`Newest timestamp: ${stats.newestTimestamp}`);
    console.log(`Data age hours: ${stats.dataAgeHours.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error checking time series data:', error);
  }
}

// Run the check
checkTimeSeriesData(); 