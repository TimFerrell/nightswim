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
    await omnilogic.login();
    
    // Get configuration to return user's pool info
    const config = await omnilogic.getMspConfig();
    
    res.json({
      success: true,
      user: {
        username,
        systemId: omnilogic.mspSystemId,
        userId: omnilogic.userId
      },
      config
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(401).json({ 
      error: 'Login failed', 
      message: error.message 
    });
  }
}