# 🔄 Migration Guide - Pool Monitoring Application

## Overview

This guide helps you migrate from the old monolithic structure to the new domain-driven architecture. The migration is designed to be gradual with full backward compatibility.

## 🚦 Migration Status

✅ **Phase 1: New Architecture Created** (Current)
- New domain-based structure implemented
- Compatibility layer active
- All existing code continues to work

⏳ **Phase 2: Gradual Migration** (Next)
- Update imports to use new structure
- Replace legacy service calls
- Update tests gradually

📋 **Phase 3: Cleanup** (Future)
- Remove compatibility layer
- Delete old monolithic files
- Finalize new structure

## 📋 Migration Checklist

### Immediate Actions (No Breaking Changes)
- [ ] Review new architecture documentation
- [ ] Run tests to ensure compatibility layer works
- [ ] Start using new imports in new code

### Gradual Updates (When Convenient)
- [ ] Update poolDataParser imports
- [ ] Update poolDataService usage
- [ ] Migrate route handlers
- [ ] Update frontend JavaScript
- [ ] Update test files

### Final Cleanup (After Migration Complete)
- [ ] Remove compatibility layer
- [ ] Delete old files
- [ ] Update package.json scripts
- [ ] Final test run

## 🔧 Import Migration Examples

### Configuration & Constants

**Old:**
```javascript
const { POOL_CONSTANTS } = require('./src/utils/constants');
```

**New:**
```javascript
const { POOL_SYSTEM } = require('./src/config');
// or
const { config } = require('./src');
const { POOL_SYSTEM } = config;
```

### Pool Data Parsing

**Old:**
```javascript
const { 
  parseDashboardData, 
  parseFilterData,
  parseChlorinatorData 
} = require('./src/services/poolDataParser');

const dashboard = parseDashboardData(html);
const filter = parseFilterData(html);
const chlorinator = parseChlorinatorData(html);
```

**New:**
```javascript
const { PoolDataParser } = require('./src/domains/pool');

// Parse all at once (more efficient)
const allData = PoolDataParser.parseAll(html);
const { dashboard, filter, chlorinator } = allData;

// Or use individual parsers
const { DashboardParser, FilterParser, ChlorinatorParser } = require('./src/domains/pool');
const dashboard = DashboardParser.parse(html);
const filter = FilterParser.parse(html);
const chlorinator = ChlorinatorParser.parse(html);
```

### Pool Data Collection

**Old:**
```javascript
const poolDataService = require('./src/services/poolDataService');

const data = await poolDataService.fetchAllPoolData(session);
```

**New:**
```javascript
const { PoolDataCollector } = require('./src/domains/pool');

const collector = new PoolDataCollector(credentials);
const data = await collector.collectAllData();
```

### Time Series Operations

**Old:**
```javascript
const timeSeriesService = require('./src/services/timeSeriesService');

await timeSeriesService.addDataPoint(dataPoint);
const recent = timeSeriesService.getDataPoints(24);
```

**New:**
```javascript
const { timeSeriesService } = require('./src/domains/monitoring');

await timeSeriesService.addDataPoint(dataPoint);
const recent = timeSeriesService.getDataPoints(24);
```

### InfluxDB Operations

**Old:**
```javascript
const { influxDBService } = require('./src/services/influxDBService');

await influxDBService.storeDataPoint(dataPoint);
const data = await influxDBService.queryDataPoints(24);
```

**New:**
```javascript
const { influxDBClient } = require('./src/domains/monitoring');

await influxDBClient.storeDataPoint(dataPoint);
const data = await influxDBClient.queryDataPoints(24);
```

## 🗂️ File Migration Map

### Services Directory
```
src/services/poolDataParser.js    → src/domains/pool/parsers/
src/services/poolDataService.js   → src/domains/pool/services/pool-data-collector.js
src/services/HaywardSession.js    → src/domains/pool/services/pool-session.js
src/services/timeSeriesService.js → src/domains/monitoring/services/time-series.js
src/services/influxDBService.js   → src/domains/monitoring/services/influxdb-client.js
```

### Utilities Directory
```
src/utils/constants.js     → src/config/pool-constants.js
src/utils/credentials.js   → src/config/environment.js (enhanced)
```

### Frontend Files
```
public/script.js (1326 lines) → Split into:
  - src/web/frontend/utils/dom-cache.js
  - src/web/frontend/utils/performance.js
  - src/web/frontend/components/status-cards.js
  - src/web/frontend/components/charts.js (planned)
  - src/web/frontend/components/weather.js (planned)
```

## 🧪 Test Migration

### Old Test Structure
```
tests/services/poolDataParser.test.js
tests/services/influxDBService.test.js
test/poolDataParser.test.js
test/timeSeriesService.test.js
```

### New Test Structure
```
tests/domains/pool/parsers/dashboard-parser.test.js
tests/domains/pool/parsers/filter-parser.test.js
tests/domains/pool/parsers/chlorinator-parser.test.js
tests/domains/pool/services/pool-data-collector.test.js
tests/domains/monitoring/services/time-series.test.js
tests/domains/monitoring/services/influxdb-client.test.js
tests/config/environment.test.js
tests/web/frontend/components/status-cards.test.js
```

### Test Migration Example

**Old:**
```javascript
const { parseDashboardData } = require('../../src/services/poolDataParser');

describe('Pool Data Parser', () => {
  test('should parse dashboard data', () => {
    const result = parseDashboardData(html);
    expect(result.temperature.actual).toBe(82);
  });
});
```

**New:**
```javascript
const { DashboardParser } = require('../../src/domains/pool/parsers');

describe('Dashboard Parser', () => {
  test('should parse dashboard data', () => {
    const result = DashboardParser.parse(html);
    expect(result.temperature.actual).toBe(82);
  });
});
```

## 🚀 Route Handler Migration

### Old Route Handler
```javascript
const poolDataService = require('../services/poolDataService');
const { influxDBService } = require('../services/influxDBService');
const timeSeriesService = require('../services/timeSeriesService');

app.get('/api/pool/data', async (req, res) => {
  const data = await poolDataService.fetchAllPoolData(session);
  const recent = timeSeriesService.getDataPoints(24);
  // ...
});
```

### New Route Handler
```javascript
const { PoolDataCollector } = require('../domains/pool');
const { timeSeriesService, influxDBClient } = require('../domains/monitoring');

app.get('/api/pool/data', async (req, res) => {
  const collector = new PoolDataCollector(credentials);
  const data = await collector.collectAllData();
  const recent = timeSeriesService.getDataPoints(24);
  // ...
});
```

## 🎯 Benefits After Migration

### Developer Experience
- **Smaller Files**: Easier to understand and modify
- **Clear Structure**: Know exactly where to find functionality
- **Better Testing**: Focused, isolated tests
- **IntelliSense**: Better IDE support with clear modules

### Performance  
- **Tree Shaking**: Unused code elimination
- **Lazy Loading**: Load only what's needed
- **Memory Efficiency**: Better resource management
- **Faster Tests**: Parallel test execution

### Maintainability
- **Single Responsibility**: Each module has one job
- **Loose Coupling**: Modules are independent
- **High Cohesion**: Related functionality grouped together
- **Easy Extensions**: Add new features without touching existing code

## ⚠️ Common Migration Pitfalls

### 1. **Import Errors**
**Problem:** `Cannot resolve module` errors
**Solution:** Use the compatibility layer during transition

### 2. **Test Failures**
**Problem:** Tests fail after updating imports
**Solution:** Update test imports to match new structure

### 3. **Configuration Issues**
**Problem:** Environment variables not loading
**Solution:** Use new `envConfig` instead of direct `process.env`

### 4. **Session Management**
**Problem:** Session handling behaves differently
**Solution:** Use new `PoolSession` class with proper lifecycle

## 🔍 Debugging Migration Issues

### Check Compatibility Layer
```javascript
// Verify legacy exports still work
const legacyExports = require('./src/shared/compatibility/legacy-exports');
console.log('Available exports:', Object.keys(legacyExports));
```

### Test New Imports
```javascript
// Test new domain imports
const { pool, monitoring } = require('./src');
console.log('Pool domain:', Object.keys(pool));
console.log('Monitoring domain:', Object.keys(monitoring));
```

### Validate Configuration
```javascript
const { envConfig } = require('./src/config');
console.log('Config status:', envConfig.getConnectionStatus());
```

## 📞 Support & Questions

If you encounter issues during migration:

1. **Check the compatibility layer** - Most old imports should still work
2. **Review examples** - Use this guide's examples as templates  
3. **Run tests frequently** - Catch issues early
4. **Migrate gradually** - Don't try to change everything at once
5. **Keep backups** - Version control is your friend

The migration is designed to be safe and gradual. Take your time and migrate one module at a time for the best experience.