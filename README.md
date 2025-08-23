# 🏊‍♂️ NightSwim - Hayward OmniLogic Pool Data Proxy

A Node.js Express server that acts as a proxy to the Hayward OmniLogic pool control system, providing a clean JSON API for accessing pool data.

## 🚀 Features

- **Auto-authentication**: No manual login required - automatically authenticates with Hayward OmniLogic
- **Comprehensive Data**: Fetches dashboard, filter, heater, chlorinator, lights, and schedule data
- **Time Series Charts**: Beautiful line charts showing historical trends for chlorinator and temperature data
- **Backend Data Retention**: Automatically stores and manages 24 hours of historical data on the server
- **Persistent Storage**: Optional InfluxDB Cloud integration for long-term data retention and event annotations
- **Event Annotations**: Store and retrieve events/notes at specific timestamps
- **Clean JSON API**: Returns structured JSON data for easy integration
- **Session Management**: Handles authentication sessions automatically
- **Browser Interface**: Simple web interface to view pool data with interactive charts
- **Modern Architecture**: Built with domain-driven design principles for improved maintainability

## 📁 Project Structure

```
nightswim/
├── src/
│   ├── services/           # Business logic and external service interactions
│   │   ├── HaywardSession.js      # Hayward OmniLogic session management
│   │   ├── sessionManager.js      # User session management
│   │   ├── poolDataService.js     # Pool data fetching operations
│   │   └── poolDataParser.js      # HTML parsing for pool data
│   ├── routes/             # Express route handlers
│   │   └── poolRoutes.js   # Pool-related API endpoints
│   ├── middleware/         # Express middleware
│   │   └── auth.js         # Authentication middleware
│   └── utils/              # Utility functions and constants
│       ├── constants.js    # Application constants and configuration
│       └── credentials.js  # Pool login credentials (gitignored)
├── public/                 # Static files for web interface
│   ├── index.html          # Main web page
│   └── script.js           # Client-side JavaScript
├── test/                   # Unit tests
│   ├── poolDataParser.test.js
│   └── constants.test.js
├── server.js               # Main application entry point
├── package.json
├── eslint.config.js        # ESLint configuration
└── env.example             # Example environment variables file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nightswim
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure credentials**
   
   **Local Development:**
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env with your credentials
   nano .env
   ```
   
   **Production/Deployment:**
   Set the following environment variables in your deployment platform:
   - `HAYWARD_USERNAME`: Your Hayward OmniLogic email
   - `HAYWARD_PASSWORD`: Your Hayward OmniLogic password
   
   **Note**: The application will throw an error if credentials are not provided.

4. **Configure InfluxDB (Optional)**
   
   For persistent time series storage and event annotations:
   
   a. **Sign up for InfluxDB Cloud**
      - Go to [cloud.influxdata.com](https://cloud.influxdata.com)
      - Create a free account
      - Create a new organization and bucket named `pool_metrics`
   
   b. **Get your connection details**
      - Copy your cluster URL (e.g., `https://us-east-1-1.aws.cloud2.influxdata.com`)
      - Generate an API token with write permissions
      - Note your organization name
   
   c. **Add to environment variables**
      ```bash
      # Add to your .env file or deployment environment
      INFLUXDB_URL=https://your-cluster.cloud.influxdata.com
      INFLUXDB_TOKEN=your-influxdb-token
      INFLUXDB_ORG=your-organization-name
      INFLUXDB_BUCKET=pool_metrics
      ```

5. **Start the server**
   ```bash
   npm run dev
   ```

## 🚀 Usage

### API Endpoints

#### `GET /api/pool/data`
Returns all pool data in a single JSON payload. No authentication required - handles login automatically.

#### `GET /api/pool/timeseries?hours=24`
Returns time series data for charting. Supports query parameter `hours` to specify time range (default: 24 hours).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-08-03T03:47:30.070Z",
      "saltInstant": 2879,
      "cellTemp": 75,
      "cellVoltage": 24.5,
      "waterTemp": 85
    }
  ],
  "hours": 24,
  "stats": {
    "totalPoints": 10,
    "retentionHours": 24,
    "maxPoints": 1440,
    "oldestTimestamp": "2025-08-03T04:38:01.446Z",
    "newestTimestamp": "2025-08-03T04:38:35.079Z",
    "dataAgeHours": 0.013
  }
}
```

#### `GET /api/pool/timeseries/stats`
Returns statistics about the stored time series data.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPoints": 10,
    "retentionHours": 24,
    "maxPoints": 1440,
    "oldestTimestamp": "2025-08-03T04:38:01.446Z",
    "newestTimestamp": "2025-08-03T04:38:35.079Z",
    "dataAgeHours": 0.013
  }
}
```

#### `GET /api/pool/timeseries/persistent?hours=24`
Returns persistent time series data from InfluxDB (requires InfluxDB configuration). Supports query parameter `hours` to specify time range (default: 24 hours).

#### `GET /api/pool/annotations?hours=24`
Returns stored annotations/events from InfluxDB. Supports query parameter `hours` to specify time range (default: 24 hours).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-08-03T03:47:30.070Z",
      "title": "Pool Maintenance",
      "description": "Added chlorine tablets",
      "category": "maintenance",
      "metadata": {
        "technician": "John Doe",
        "cost": 45.00
      }
    }
  ],
  "hours": 24
}
```

#### `POST /api/pool/annotations`
Store a new annotation/event.

**Request Body:**
```json
{
  "timestamp": "2025-08-03T03:47:30.070Z",
  "title": "Pool Maintenance",
  "description": "Added chlorine tablets",
  "category": "maintenance",
  "metadata": {
    "technician": "John Doe",
    "cost": 45.00
  }
}
```

#### `GET /api/pool/influxdb/stats`
Returns InfluxDB connection and storage statistics.

**Response:**
```json
{
  "timestamp": "2025-08-03T03:47:30.070Z",
  "system": {
    "mspId": "DCEC367C6BDDCB06",
    "bowId": "48A6C0EBC3808A94",
    "bowSystemId": "BE1BF543BCC6BD40"
  },
  "dashboard": {
    "temperature": {
      "target": 75,
      "actual": 85,
      "unit": "°F"
    },
    "systemStatus": "online"
  },
  "filter": {
    "status": true,
    "diagnostic": "Filter Pump Running"
  },
  "heater": {
    "temperature": {
      "min": 55,
      "current": 75,
      "max": 90,
      "actual": 85,
      "unit": "°F"
    },
    "enabled": false
  },
  "chlorinator": {
    "salt": {
      "instant": 2884,
      "average": "--",
      "unit": "PPM"
    },
    "cell": {
      "temperature": {
        "value": 85.6,
        "unit": "°F"
      },
      "voltage": 25.57,
      "current": 6.18,
      "type": "--"
    },
    "enabled": false
  },
  "lights": {
    "status": null,
    "brightness": null,
    "enabled": false
  },
  "schedules": [
    {
      "name": "Filter Pump",
      "startTime": "08:00 AM",
      "endTime": "08:00 PM",
      "setting": "--",
      "repeat": "Weekdays",
      "status": "Enable"
    }
  ]
}
```

### Web Interface

Visit `http://localhost:3000` to view pool data in a user-friendly web interface with interactive charts.

**Chart Features:**
- **Real-time Updates**: Charts refresh every 30 seconds
- **Time Range Selection**: Choose from 1, 6, 24, or 48 hours of data
- **Multiple Metrics**: Salt level, cell temperature, cell voltage, and water temperature
- **Interactive Tooltips**: Hover for detailed values
- **Responsive Design**: Works on desktop and mobile devices
- **Backend Storage**: 24-hour data retention with automatic cleanup
- **Data Statistics**: Shows data point count and time range information

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 🔧 Development

### Code Quality

The project uses ESLint for code quality and JSDoc for type enforcement. Run the linter:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run lint:fix
```

### Type Enforcement

The project uses JSDoc type annotations to enforce types throughout the codebase. This provides TypeScript-like type safety without requiring a full TypeScript migration.

#### Type Definitions

All major data structures have comprehensive type definitions:

- **DashboardData**: Temperature and system status information
- **FilterData**: Filter pump status and diagnostic data
- **HeaterData**: Heater temperature and status information
- **ChlorinatorData**: Salt levels and cell information
- **LightsData**: Lights status and brightness
- **Schedule**: Schedule information with timing details

#### Type Validation

Run the type checking demonstration:
```bash
npm run type-check
```

This script validates sample data against the defined types and demonstrates how type checking works.

#### Benefits

- **Compile-time type checking** through ESLint JSDoc rules
- **Runtime type validation** functions for critical data structures
- **Better IDE support** with autocomplete and error detection
- **Self-documenting code** with clear type definitions
- **Reduced runtime errors** through type enforcement

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - Run type checking demonstration

## 🏗️ Architecture

### Services Layer
- **HaywardSession**: Manages authentication and HTTP requests to Hayward OmniLogic
- **SessionManager**: Handles user session lifecycle and cleanup
- **PoolDataService**: Orchestrates data fetching from multiple pool components
- **PoolDataParser**: Parses HTML responses from Hayward OmniLogic pages

### Routes Layer
- **PoolRoutes**: Defines API endpoints for pool data access

### Middleware Layer
- **AuthMiddleware**: Handles authentication and session management

### Utils Layer
- **Constants**: Centralized configuration and constants
- **Credentials**: Secure credential management

## 🔒 Security

- **Environment Variables**: Credentials are sourced from `HAYWARD_USERNAME` and `HAYWARD_PASSWORD` environment variables
- **Local Development**: Uses `.env` file for local development (gitignored)
- **Production**: Requires environment variables to be set in deployment platform
- **Session Management**: Sessions are managed securely with proper cleanup
- **Request Security**: All external requests use proper headers and timeouts

## 📝 License

MIT License# CI Trigger - Sat Aug 23 10:57:12 EDT 2025
