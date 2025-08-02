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

    const { poolId, chlorinatorId, enable, timedPercent } = req.body;
    
    if (!poolId || !chlorinatorId || typeof enable !== 'boolean' || !timedPercent) {
      return res.status(400).json({ error: 'poolId, chlorinatorId, enable (boolean), and timedPercent are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    await omnilogic.login();
    
    await omnilogic.setChlorinatorSettings(poolId, chlorinatorId, enable, timedPercent);
    res.json({ success: true, message: 'Chlorinator settings updated successfully' });
  } catch (error) {
    console.error('Failed to set chlorinator settings:', error);
    res.status(500).json({ error: 'Failed to set chlorinator settings', message: error.message });
  }
}