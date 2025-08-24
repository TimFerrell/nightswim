const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import new architecture modules
const { envConfig } = require('./src/config');
const { influxDBClient } = require('./src/domains/monitoring');

// Import routes (will be migrated gradually)
const poolRoutes = require('./src/routes/poolRoutes');
const cronRoutes = require('./src/routes/cronRoutes');

// New architecture API routes
const newPoolRoutes = require('./src/web/api/routes');
const newCronRoutes = require('./src/web/api/cron-routes');

// Legacy compatibility during migration
const { influxDBService } = require('./src/services/influxDBService');

const app = express();
const PORT = envConfig.get('PORT') || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', 'https://cdn.jsdelivr.net'],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      styleSrcElem: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\''],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\'']
    }
  }
}));

// Add Permissions-Policy header to disable unused experimental features
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', [
    'browsing-topics=()',
    'run-ad-auction=()',
    'join-ad-interest-group=()',
    'private-state-token-redemption=()',
    'private-state-token-issuance=()',
    'private-aggregation=()',
    'attribution-reporting=()',
    'compute-pressure=()'
  ].join(', '));
  next();
});
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));
app.use(session({
  secret: envConfig.get('SESSION_SECRET') || 'hayward-proxy-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to false for development
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasCredentials = !!(process.env.HAYWARD_USERNAME && process.env.HAYWARD_PASSWORD);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasCredentials,
    environment: process.env.NODE_ENV || 'development'
  });
});

// InfluxDB test endpoint
app.get('/api/test-influxdb', async (req, res) => {
  try {
    const results = await influxDBService.testConnection();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/pool', poolRoutes); // Legacy routes (v1)
app.use('/api/pool', newPoolRoutes); // New architecture routes (v2)
app.use('/api/cron', cronRoutes); // Legacy cron routes (v1)
app.use('/api/cron', newCronRoutes); // New architecture cron routes (v2)

// GET / - Main pool data page
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

// GET /script.js - Serve JavaScript file with correct MIME type
app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(`${__dirname}/public/script.js`);
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res && typeof res.status === 'function') {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Hayward Omnilogic Proxy Server running on port ${PORT}`);
  console.log('Target URL: https://haywardomnilogic.com');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
