# Hayward Omni Pool Manager

A modern, web-based application for managing your Hayward Omni pool automation system. Built with React, Node.js, and designed for easy deployment to Vercel.

## Features

### 🏊‍♂️ Complete Pool Control
- **Equipment Status Monitoring**: Real-time status of all pool equipment
- **Temperature Control**: Set and monitor heater temperatures
- **Pump Management**: Control variable speed pumps and filters
- **Lighting Control**: Full ColorLogic light show selection with brightness/speed
- **Chlorinator Management**: Monitor salt levels, set output percentage, super chlorination
- **Relay Control**: Manage auxiliary equipment (blowers, jets, etc.)

### 📊 System Monitoring
- **Live Telemetry**: Water temperature, air temperature, flow status
- **Alarm Monitoring**: Real-time alarm notifications and status
- **Equipment Status**: Detailed status for each piece of equipment
- **Auto-Refresh**: Automatic data updates every 30 seconds

### 🎨 Modern Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Intuitive Controls**: Easy-to-use interface for all pool functions
- **Real-time Updates**: Instant feedback on all control actions
- **Beautiful UI**: Modern, clean design with pool-themed styling

## Quick Start

### Prerequisites
- Node.js 18+ 
- Hayward Omni pool system with OmniLogic controller
- Hayward app account credentials

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/TimFerrell/nightswim
   cd nightswim
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` and log in with your Hayward credentials.

### Deploy to Vercel

#### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TimFerrell/nightswim)

#### Manual Deploy

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts** to configure your deployment

## Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
NODE_ENV=development
```

For production deployment, set these in your Vercel dashboard:

```env
NODE_ENV=production
```

### Hayward Credentials

The application uses your existing Hayward OmniLogic app credentials. These are:
- **Stored locally** in your browser (localStorage)
- **Never sent to external services** except Hayward's official API
- **Transmitted securely** over HTTPS to Hayward's servers

## Architecture

### Frontend (React/Next.js)
- **Pages**: Main app routing and page components
- **Components**: Reusable UI components for equipment control
- **Styles**: Tailwind CSS for responsive, modern styling

### Backend (Node.js/Express)
- **API Routes**: RESTful endpoints for pool equipment control
- **OmniLogic Library**: Node.js implementation of Hayward's API
- **Authentication**: Secure credential handling and token management

### Deployment (Vercel)
- **Serverless Functions**: API routes deployed as serverless functions
- **Static Frontend**: React app served from Vercel's global CDN
- **Auto-scaling**: Handles traffic spikes automatically

## API Reference

### Authentication
```bash
POST /api/auth/test-connection
POST /api/auth/login
```

### Pool Management
```bash
GET /api/pool/config          # Get pool configuration
GET /api/pool/telemetry       # Get real-time telemetry
GET /api/pool/alarms          # Get active alarms

POST /api/pool/heater/temperature    # Set heater temperature
POST /api/pool/heater/toggle         # Turn heater on/off
POST /api/pool/pump/speed            # Set pump speed
POST /api/pool/lights/show           # Set light show
POST /api/pool/chlorinator/settings  # Configure chlorinator
POST /api/pool/chlorinator/super     # Super chlorination
POST /api/pool/relay/toggle          # Control relays/valves
```

## Equipment Support

### Supported Equipment Types
- ✅ **Heaters**: Virtual heaters, gas heaters, heat pumps
- ✅ **Pumps**: Variable speed pumps, single speed pumps, filter pumps
- ✅ **Lights**: ColorLogic V1 and V2 lights with full show control
- ✅ **Chlorinators**: All Hayward chlorinator models
- ✅ **Relays**: Auxiliary equipment control (blowers, jets, etc.)
- ✅ **Valves**: Automated valve control
- ✅ **Temperature Sensors**: Water and air temperature monitoring
- ✅ **Flow Sensors**: Flow detection and monitoring

### Light Shows Supported
- Voodoo Lounge, Deep Blue Sea, Royal Blue
- Afternoon Skies, Aqua Green, Emerald
- Cloud White, Warm Red, Flamingo
- Vivid Violet, Sangria, Twilight
- Tranquility, Gemstone, USA
- Mardi Gras, Cool Cabaret
- And more...

## Security

### Data Protection
- **No credential storage** on external servers
- **HTTPS encryption** for all communications
- **Client-side authentication** with Hayward's official API
- **No third-party data sharing**

### Best Practices
- Credentials are only stored locally in your browser
- All API calls use official Hayward endpoints
- No modification of pool safety systems
- Secure token-based authentication

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify your Hayward app credentials are correct
- Ensure your pool system is online
- Check internet connectivity

**Equipment Not Responding**
- Wait a few seconds and try again
- Check if equipment is in manual override mode
- Verify equipment is powered and connected

**Data Not Updating**
- Refresh the page
- Check network connection
- Verify pool system is communicating

### Support

For technical support:
1. Check the browser console for error messages
2. Verify your pool system is accessible via the Hayward app
3. Ensure all equipment is properly configured in the Hayward system

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is an unofficial application for Hayward pool systems. While it uses official Hayward APIs, it is not affiliated with or endorsed by Hayward Pool Products. Use at your own risk and always follow proper pool safety guidelines.

## Acknowledgments

- Hayward Pool Products for their OmniLogic API
- The home automation community for API documentation and examples
- Contributors to the open-source pool automation projects

---

**Made with 💙 for pool enthusiasts**