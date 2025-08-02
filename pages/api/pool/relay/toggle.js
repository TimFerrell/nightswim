const OmniLogic = require('../../../../api/lib/omnilogic');

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.headers;
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Authentication headers required' });
    }

    const { poolId, equipmentId, onOff } = req.body;
    
    if (!poolId || !equipmentId || onOff === undefined) {
      return res.status(400).json({ error: 'poolId, equipmentId, and onOff are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setRelayValve(poolId, equipmentId, onOff);
    res.json({ success: true, message: 'Relay/valve toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle relay/valve:', error);
    res.status(500).json({ error: 'Failed to toggle relay/valve', message: error.message });
  }
}