# 🏊‍♂️ NightSwim - Hayward OmniLogic Pool Data Proxy

A Node.js Express server that acts as a proxy to the Hayward OmniLogic pool control system, providing a clean JSON API for accessing pool data.

## 🚀 Features

- **Auto-authentication**: No manual login required - automatically authenticates with Hayward OmniLogic
- **Comprehensive Data**: Fetches dashboard, filter, heater, chlorinator, lights, and schedule data
- **Clean JSON API**: Returns structured JSON data for easy integration
- **Session Management**: Handles authentication sessions automatically
- **Browser Interface**: Simple web interface to view pool data

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
└── eslint.config.js        # ESLint configuration
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
   Create `src/utils/credentials.js` with your Hayward OmniLogic credentials:
   ```javascript
   module.exports = {
     username: 'your-email@example.com',
     password: 'your-password'
   };
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

## 🚀 Usage

### API Endpoints

#### `GET /api/pool/data`
Returns all pool data in a single JSON payload. No authentication required - handles login automatically.

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

Visit `http://localhost:3000` to view pool data in a user-friendly web interface.

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

- Credentials are stored in a separate file that's gitignored
- Sessions are managed securely with proper cleanup
- All external requests use proper headers and timeouts

## 📝 License

MIT License