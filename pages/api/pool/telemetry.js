const OmniLogic = require('../../../api/lib/omnilogic');

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.headers;
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Authentication headers required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    const telemetry = await omnilogic.getTelemetryData();
    res.json(telemetry);
  } catch (error) {
    console.error('Failed to get telemetry:', error);
    res.status(500).json({ error: 'Failed to get telemetry data', message: error.message });
  }
}