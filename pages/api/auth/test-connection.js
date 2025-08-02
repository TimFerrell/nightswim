const OmniLogic = require('../../../api/lib/omnilogic');

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const omnilogic = new OmniLogic(username, password);
    
    // Test login
    await omnilogic.login();
    
    // Get basic config to verify connection
    const config = await omnilogic.getMspConfig();
    
    res.json({ 
      success: true, 
      message: 'Connection successful',
      systemId: omnilogic.mspSystemId,
      hasConfig: !!config
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(401).json({ 
      error: 'Connection failed', 
      message: error.message 
    });
  }
}