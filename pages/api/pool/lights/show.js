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

    const { poolId, lightId, showId, speed = 1, brightness = 100 } = req.body;
    
    if (!poolId || !lightId || showId === undefined) {
      return res.status(400).json({ error: 'poolId, lightId, and showId are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setLightShow(poolId, lightId, showId, speed, brightness);
    res.json({ success: true, message: 'Light show set successfully' });
  } catch (error) {
    console.error('Failed to set light show:', error);
    res.status(500).json({ error: 'Failed to set light show', message: error.message });
  }
}