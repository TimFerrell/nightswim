const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const FormData = require('form-data');
const { CookieJar } = require('tough-cookie');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HAYWARD_BASE_URL = 'https://haywardomnilogic.com';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'hayward-proxy-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Store for user sessions and their cookie jars
const userSessions = new Map();

class HaywardSession {
  constructor(userId) {
    this.userId = userId;
    this.cookieJar = new CookieJar();
    this.authenticated = false;
    this.lastActivity = Date.now();
    this.axiosInstance = axios.create({
      baseURL: HAYWARD_BASE_URL,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    // Axios interceptors to handle cookies
    this.setupCookieHandling();
  }

  setupCookieHandling() {
    // Request interceptor to add cookies
    this.axiosInstance.interceptors.request.use(async (config) => {
      const cookies = await this.cookieJar.getCookieString(config.baseURL + config.url);
      if (cookies) {
        config.headers.Cookie = cookies;
      }
      return config;
    });

    // Response interceptor to store cookies
    this.axiosInstance.interceptors.response.use(async (response) => {
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        for (const cookie of setCookieHeaders) {
          await this.cookieJar.setCookie(cookie, response.config.baseURL + response.config.url);
        }
      }
      this.lastActivity = Date.now();
      return response;
    });
  }

  async authenticate(username, password) {
    try {
      // First, get the login page to extract form data and viewstate
      const loginPageResponse = await this.axiosInstance.get('/');
      const $ = cheerio.load(loginPageResponse.data);
      
      // Extract ASP.NET WebForms viewstate and other hidden fields
      const viewState = $('input[name="__VIEWSTATE"]').val();
      const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val();
      const eventValidation = $('input[name="__EVENTVALIDATION"]').val();
      
      // Find login form fields (common ASP.NET WebForms patterns)
      const usernameField = $('input[type="text"][name*="user" i], input[type="text"][name*="login" i], input[type="email"]').first().attr('name');
      const passwordField = $('input[type="password"]').first().attr('name');
      const loginButton = $('input[type="submit"], button[type="submit"]').first();
      
      if (!usernameField || !passwordField) {
        throw new Error('Could not find login form fields');
      }

      // Prepare form data
      const formData = new FormData();
      if (viewState) formData.append('__VIEWSTATE', viewState);
      if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
      if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);
      
      formData.append(usernameField, username);
      formData.append(passwordField, password);
      
      // Add button click event if needed
      if (loginButton.attr('name')) {
        formData.append(loginButton.attr('name'), loginButton.val() || 'Login');
      }

      // Submit login form
      const loginResponse = await this.axiosInstance.post('/', formData, {
        headers: {
          ...formData.getHeaders(),
          'Referer': HAYWARD_BASE_URL + '/'
        }
      });

      // Check if authentication was successful
      const loginResult = cheerio.load(loginResponse.data);
      const hasError = loginResult('.error, .alert-danger, .validation-error').length > 0;
      const hasLoginForm = loginResult('input[type="password"]').length > 0;
      
      if (!hasError && !hasLoginForm) {
        this.authenticated = true;
        return { success: true, message: 'Authentication successful' };
      } else {
        return { success: false, message: 'Invalid credentials' };
      }
      
    } catch (error) {
      console.error('Authentication error:', error.message);
      return { success: false, message: 'Authentication failed: ' + error.message };
    }
  }

  async makeRequest(path, options = {}) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.axiosInstance({
        url: path,
        method: options.method || 'GET',
        data: options.data,
        headers: options.headers
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  isExpired() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - this.lastActivity > maxAge;
  }
}

// Helper function to get or create user session
function getUserSession(sessionId) {
  if (!userSessions.has(sessionId)) {
    userSessions.set(sessionId, new HaywardSession(sessionId));
  }
  
  const session = userSessions.get(sessionId);
  if (session.isExpired()) {
    userSessions.delete(sessionId);
    return new HaywardSession(sessionId);
  }
  
  return session;
}

// Clean up expired sessions periodically
setInterval(() => {
  for (const [sessionId, session] of userSessions.entries()) {
    if (session.isExpired()) {
      userSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

// Routes

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const session = getUserSession(req.sessionID);
    const result = await session.authenticate(username, password);
    
    if (result.success) {
      userSessions.set(req.sessionID, session);
      req.session.authenticated = true;
      res.json({ success: true, message: 'Authentication successful' });
    } else {
      res.status(401).json({ success: false, error: result.message });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  userSessions.delete(req.sessionID);
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  const session = userSessions.get(req.sessionID);
  const authenticated = session && session.authenticated && !session.isExpired();
  res.json({ authenticated });
});

// Generic proxy endpoint
app.all('/api/proxy/*', async (req, res) => {
  try {
    const session = userSessions.get(req.sessionID);
    
    if (!session || !session.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const path = req.params[0];
    const response = await session.makeRequest('/' + path, {
      method: req.method,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Referer': HAYWARD_BASE_URL + '/'
      }
    });

    // Set response headers
    Object.keys(response.headers).forEach(key => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.set(key, response.headers[key]);
      }
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.statusText });
    } else {
      res.status(500).json({ error: 'Proxy request failed' });
    }
  }
});

// Data extraction endpoint using Cheerio
app.get('/api/extract/:page', async (req, res) => {
  try {
    const session = userSessions.get(req.sessionID);
    
    if (!session || !session.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const page = req.params.page;
    const response = await session.makeRequest('/' + page);
    const $ = cheerio.load(response.data);

    // Extract common data patterns
    const extractedData = {
      title: $('title').text().trim(),
      headings: [],
      forms: [],
      tables: [],
      links: [],
      images: [],
      scripts: [],
      meta: {}
    };

    // Extract headings
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      extractedData.headings.push({
        level: el.tagName,
        text: $(el).text().trim(),
        id: $(el).attr('id'),
        class: $(el).attr('class')
      });
    });

    // Extract forms and their fields
    $('form').each((i, form) => {
      const formData = {
        id: $(form).attr('id'),
        action: $(form).attr('action'),
        method: $(form).attr('method') || 'GET',
        fields: []
      };

      $(form).find('input, select, textarea').each((j, field) => {
        formData.fields.push({
          name: $(field).attr('name'),
          type: $(field).attr('type') || field.tagName.toLowerCase(),
          value: $(field).val(),
          id: $(field).attr('id'),
          class: $(field).attr('class'),
          placeholder: $(field).attr('placeholder')
        });
      });

      extractedData.forms.push(formData);
    });

    // Extract tables
    $('table').each((i, table) => {
      const tableData = {
        id: $(table).attr('id'),
        class: $(table).attr('class'),
        rows: []
      };

      $(table).find('tr').each((j, row) => {
        const rowData = [];
        $(row).find('td, th').each((k, cell) => {
          rowData.push({
            text: $(cell).text().trim(),
            html: $(cell).html(),
            colspan: $(cell).attr('colspan'),
            rowspan: $(cell).attr('rowspan')
          });
        });
        tableData.rows.push(rowData);
      });

      extractedData.tables.push(tableData);
    });

    // Extract links
    $('a[href]').each((i, link) => {
      extractedData.links.push({
        href: $(link).attr('href'),
        text: $(link).text().trim(),
        title: $(link).attr('title')
      });
    });

    // Extract images
    $('img').each((i, img) => {
      extractedData.images.push({
        src: $(img).attr('src'),
        alt: $(img).attr('alt'),
        title: $(img).attr('title'),
        width: $(img).attr('width'),
        height: $(img).attr('height')
      });
    });

    // Extract meta information
    $('meta').each((i, meta) => {
      const name = $(meta).attr('name') || $(meta).attr('property');
      const content = $(meta).attr('content');
      if (name && content) {
        extractedData.meta[name] = content;
      }
    });

    res.json(extractedData);
  } catch (error) {
    console.error('Data extraction error:', error.message);
    res.status(500).json({ error: 'Data extraction failed' });
  }
});

// Custom data extraction endpoint
app.post('/api/extract-custom', async (req, res) => {
  try {
    const session = userSessions.get(req.sessionID);
    
    if (!session || !session.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { page, selectors } = req.body;
    
    if (!page || !selectors) {
      return res.status(400).json({ error: 'Page and selectors are required' });
    }

    const response = await session.makeRequest('/' + page);
    const $ = cheerio.load(response.data);

    const results = {};

    // Process each selector
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const elements = $(selector);
        if (elements.length === 1) {
          results[key] = {
            text: elements.text().trim(),
            html: elements.html(),
            attributes: {}
          };
          
          // Get all attributes
          const attrs = elements.get(0).attribs;
          if (attrs) {
            results[key].attributes = attrs;
          }
        } else if (elements.length > 1) {
          results[key] = [];
          elements.each((i, el) => {
            results[key].push({
              text: $(el).text().trim(),
              html: $(el).html(),
              attributes: el.attribs || {}
            });
          });
        } else {
          results[key] = null;
        }
      } catch (selectorError) {
        results[key] = { error: `Invalid selector: ${selector}` };
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Custom extraction error:', error.message);
    res.status(500).json({ error: 'Custom data extraction failed' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSessions: userSessions.size 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Hayward Omnilogic Proxy Server running on port ${PORT}`);
  console.log(`Target URL: ${HAYWARD_BASE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;