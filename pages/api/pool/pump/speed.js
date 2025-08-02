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

    const { poolId, pumpId, speed } = req.body;
    
    if (!poolId || !pumpId || speed === undefined) {
      return res.status(400).json({ error: 'poolId, pumpId, and speed are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setPumpSpeed(poolId, pumpId, speed);
    res.json({ success: true, message: 'Pump speed set successfully' });
  } catch (error) {
    console.error('Failed to set pump speed:', error);
    res.status(500).json({ error: 'Failed to set pump speed', message: error.message });
  }
}