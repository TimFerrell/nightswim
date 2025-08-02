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

    const { poolId, chlorinatorId, isOn } = req.body;
    
    if (!poolId || !chlorinatorId || isOn === undefined) {
      return res.status(400).json({ error: 'poolId, chlorinatorId, and isOn are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setSuperChlorination(poolId, chlorinatorId, isOn);
    res.json({ success: true, message: 'Super chlorination toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle super chlorination:', error);
    res.status(500).json({ error: 'Failed to toggle super chlorination', message: error.message });
  }
}