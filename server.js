const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const poolRoutes = require('./src/routes/poolRoutes');
const cronRoutes = require('./src/routes/cronRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
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
  secret: process.env.SESSION_SECRET || 'hayward-proxy-secret-key',
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

// Routes
app.use('/api/pool', poolRoutes);
app.use('/api/cron', cronRoutes);

// GET / - Main pool data page
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

// GET /script.js - Serve JavaScript file with correct MIME type
app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(`${__dirname}/public/script.js`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Hayward Omnilogic Proxy Server running on port ${PORT}`);
  console.log('Target URL: https://haywardomnilogic.com');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
