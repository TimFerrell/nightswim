# Hayward Omnilogic Proxy Server

A Node.js proxy server that forwards and authenticates requests to the Hayward Omnilogic ASP.NET WebForms application. This server handles session management, authentication, and provides data extraction capabilities using Cheerio for HTML parsing.

## Features

- **Secure Authentication**: Handles ASP.NET WebForms authentication with viewstate management
- **Session Management**: Maintains user sessions with cookie persistence
- **Proxy Functionality**: Forwards requests to Hayward Omnilogic while maintaining authentication
- **Data Extraction**: Uses Cheerio to parse HTML and extract specific data from responses
- **Custom Selectors**: Supports custom CSS selectors for targeted data extraction
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Implements CORS, Helmet security headers, and session management

## Installation

1. Clone or initialize the repository:
```bash
git clone <repository-url>
cd hayward-omnilogic-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-secret-key-here-change-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Hayward Omnilogic URL
HAYWARD_BASE_URL=https://haywardomnilogic.com
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Authenticate with Hayward Omnilogic credentials.

**Request Body:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful"
}
```

#### POST `/api/auth/logout`
Logout and destroy session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET `/api/auth/status`
Check authentication status.

**Response:**
```json
{
  "authenticated": true
}
```

### Proxy Endpoints

#### ALL `/api/proxy/*`
Forward requests to Hayward Omnilogic. Requires authentication.

**Example:**
```bash
# GET request to a specific page
curl -X GET http://localhost:3000/api/proxy/dashboard \
  -H "Cookie: connect.sid=your-session-id"

# POST request with data
curl -X POST http://localhost:3000/api/proxy/some-action \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-id" \
  -d '{"key": "value"}'
```

### Data Extraction

#### GET `/api/extract/:page`
Extract common data patterns from a page using Cheerio.

**Example:**
```bash
curl -X GET http://localhost:3000/api/extract/dashboard \
  -H "Cookie: connect.sid=your-session-id"
```

**Response:**
```json
{
  "title": "Page Title",
  "headings": [
    {
      "level": "h1",
      "text": "Dashboard",
      "id": "main-heading",
      "class": "title"
    }
  ],
  "forms": [
    {
      "id": "form1",
      "action": "/submit",
      "method": "POST",
      "fields": [
        {
          "name": "username",
          "type": "text",
          "value": "",
          "id": "txtUsername",
          "class": "form-control"
        }
      ]
    }
  ],
  "tables": [],
  "links": [],
  "images": [],
  "meta": {}
}
```

#### POST `/api/extract-custom`
Extract specific data using custom CSS selectors.

**Request Body:**
```json
{
  "page": "dashboard",
  "selectors": {
    "poolTemperature": ".temperature-value",
    "status": ".status-indicator",
    "equipmentList": ".equipment-item"
  }
}
```

**Response:**
```json
{
  "poolTemperature": {
    "text": "78°F",
    "html": "<span class=\"temperature-value\">78°F</span>",
    "attributes": {
      "class": "temperature-value",
      "data-temp": "78"
    }
  },
  "status": {
    "text": "Online",
    "html": "<div class=\"status-indicator online\">Online</div>",
    "attributes": {
      "class": "status-indicator online"
    }
  },
  "equipmentList": [
    {
      "text": "Pool Pump",
      "html": "<div class=\"equipment-item\">Pool Pump</div>",
      "attributes": {
        "class": "equipment-item",
        "data-id": "pump1"
      }
    }
  ]
}
```

### Health Check

#### GET `/health`
Server health and status information.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeSessions": 3
}
```

## Usage Examples

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true // Important for session cookies
});

async function example() {
  try {
    // Login
    await client.post('/api/auth/login', {
      username: 'your-username',
      password: 'your-password'
    });

    // Extract data from dashboard
    const dashboardData = await client.get('/api/extract/dashboard');
    console.log('Dashboard data:', dashboardData.data);

    // Custom data extraction
    const customData = await client.post('/api/extract-custom', {
      page: 'status',
      selectors: {
        temperature: '.pool-temp',
        status: '.system-status'
      }
    });
    console.log('Custom data:', customData.data);

    // Proxy a specific request
    const response = await client.get('/api/proxy/equipment-status');
    console.log('Raw response:', response.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

example();
```

### cURL Examples

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your-username", "password": "your-password"}'

# Extract dashboard data
curl -b cookies.txt -X GET http://localhost:3000/api/extract/dashboard

# Custom extraction
curl -b cookies.txt -X POST http://localhost:3000/api/extract-custom \
  -H "Content-Type: application/json" \
  -d '{
    "page": "status", 
    "selectors": {
      "temperature": ".pool-temp",
      "status": ".system-status"
    }
  }'

# Proxy request
curl -b cookies.txt -X GET http://localhost:3000/api/proxy/some-page
```

## Architecture

### Session Management
- Each user session is isolated with its own cookie jar
- Sessions automatically expire after 24 hours of inactivity
- Automatic cleanup of expired sessions

### Authentication Flow
1. Client sends credentials to `/api/auth/login`
2. Server fetches Hayward login page and extracts ASP.NET WebForms viewstate
3. Server submits login form with proper viewstate and credentials
4. Server validates authentication success and stores session
5. Subsequent requests use the authenticated session

### Data Extraction
- **Generic extraction** (`/api/extract/:page`): Extracts common HTML elements (headings, forms, tables, links, images, meta tags)
- **Custom extraction** (`/api/extract-custom`): Uses provided CSS selectors to extract specific data
- All extraction uses Cheerio for reliable HTML parsing

## Security Considerations

- Session secrets should be changed in production
- HTTPS should be used in production environments
- CORS is configured to restrict cross-origin requests
- Helmet middleware provides security headers
- Sessions are properly isolated per user

## Error Handling

The server provides comprehensive error handling:
- Authentication failures return appropriate HTTP status codes
- Network errors are caught and reported
- Invalid selectors are handled gracefully
- Session timeouts are detected and reported

## Dependencies

- **express**: Web server framework
- **axios**: HTTP client for making requests to Hayward
- **cheerio**: Server-side jQuery implementation for HTML parsing
- **express-session**: Session management
- **tough-cookie**: Cookie jar implementation
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing
- **form-data**: Multipart form data handling

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```

## License

MIT License