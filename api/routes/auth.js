const express = require('express');
const router = express.Router();
const OmniLogic = require('../lib/omnilogic');

// Test connection to Hayward OmniLogic
router.post('/test-connection', async (req, res) => {
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
});

// Validate credentials and return user info
router.post('/login', async (req, res) => {
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
});

module.exports = router;