const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const poolRoutes = require('./src/routes/poolRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
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

// Routes
app.use('/api/pool', poolRoutes);

// GET / - Main pool data page
app.get('/', (req, res) => {
  res.sendFile(`${__dirname  }/public/index.html`);
});

// Error handling middleware
app.use((err, req, res) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Hayward Omnilogic Proxy Server running on port ${PORT}`);
  console.log('Target URL: https://haywardomnilogic.com');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
