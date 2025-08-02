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

    const { poolId, heaterId, enable } = req.body;
    
    if (!poolId || !heaterId || typeof enable !== 'boolean') {
      return res.status(400).json({ error: 'poolId, heaterId, and enable (boolean) are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setHeaterOnOff(poolId, heaterId, enable);
    res.json({ success: true, message: 'Heater toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle heater:', error);
    res.status(500).json({ error: 'Failed to toggle heater', message: error.message });
  }
}