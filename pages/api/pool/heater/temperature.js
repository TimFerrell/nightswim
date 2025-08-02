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

    const { poolId, heaterId, temperature } = req.body;
    
    if (!poolId || !heaterId || !temperature) {
      return res.status(400).json({ error: 'poolId, heaterId, and temperature are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setHeaterTemperature(poolId, heaterId, temperature);
    res.json({ success: true, message: 'Heater temperature set successfully' });
  } catch (error) {
    console.error('Failed to set heater temperature:', error);
    res.status(500).json({ error: 'Failed to set heater temperature', message: error.message });
  }
}