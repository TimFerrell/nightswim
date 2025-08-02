const express = require('express');
const router = express.Router();
const OmniLogic = require('../lib/omnilogic');

// Middleware to create OmniLogic instance
const createOmniLogicInstance = (req, res, next) => {
  const { username, password } = req.headers;
  
  if (!username || !password) {
    return res.status(401).json({ error: 'Authentication headers required' });
  }

  req.omnilogic = new OmniLogic(username, password);
  next();
};

// Get pool configuration
router.get('/config', createOmniLogicInstance, async (req, res) => {
  try {
    const config = await req.omnilogic.getMspConfig();
    res.json(config);
  } catch (error) {
    console.error('Failed to get config:', error);
    res.status(500).json({ error: 'Failed to get configuration', message: error.message });
  }
});

// Get telemetry data
router.get('/telemetry', createOmniLogicInstance, async (req, res) => {
  try {
    const telemetry = await req.omnilogic.getTelemetryData();
    res.json(telemetry);
  } catch (error) {
    console.error('Failed to get telemetry:', error);
    res.status(500).json({ error: 'Failed to get telemetry data', message: error.message });
  }
});

// Get alarms
router.get('/alarms', createOmniLogicInstance, async (req, res) => {
  try {
    const alarms = await req.omnilogic.getAlarmList();
    res.json(alarms);
  } catch (error) {
    console.error('Failed to get alarms:', error);
    res.status(500).json({ error: 'Failed to get alarms', message: error.message });
  }
});

// Set heater temperature
router.post('/heater/temperature', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, heaterId, temperature } = req.body;
    
    if (!poolId || !heaterId || !temperature) {
      return res.status(400).json({ error: 'poolId, heaterId, and temperature are required' });
    }

    await req.omnilogic.setHeaterTemperature(poolId, heaterId, temperature);
    res.json({ success: true, message: 'Heater temperature set successfully' });
  } catch (error) {
    console.error('Failed to set heater temperature:', error);
    res.status(500).json({ error: 'Failed to set heater temperature', message: error.message });
  }
});

// Set heater on/off
router.post('/heater/toggle', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, heaterId, enable } = req.body;
    
    if (!poolId || !heaterId || typeof enable !== 'boolean') {
      return res.status(400).json({ error: 'poolId, heaterId, and enable (boolean) are required' });
    }

    await req.omnilogic.setHeaterOnOff(poolId, heaterId, enable);
    res.json({ success: true, message: 'Heater toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle heater:', error);
    res.status(500).json({ error: 'Failed to toggle heater', message: error.message });
  }
});

// Set pump speed
router.post('/pump/speed', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, pumpId, speed } = req.body;
    
    if (!poolId || !pumpId || speed === undefined) {
      return res.status(400).json({ error: 'poolId, pumpId, and speed are required' });
    }

    await req.omnilogic.setPumpSpeed(poolId, pumpId, speed);
    res.json({ success: true, message: 'Pump speed set successfully' });
  } catch (error) {
    console.error('Failed to set pump speed:', error);
    res.status(500).json({ error: 'Failed to set pump speed', message: error.message });
  }
});

// Set relay/valve
router.post('/relay/toggle', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, equipmentId, onOff } = req.body;
    
    if (!poolId || !equipmentId || onOff === undefined) {
      return res.status(400).json({ error: 'poolId, equipmentId, and onOff are required' });
    }

    await req.omnilogic.setRelayValve(poolId, equipmentId, onOff);
    res.json({ success: true, message: 'Relay/valve toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle relay/valve:', error);
    res.status(500).json({ error: 'Failed to toggle relay/valve', message: error.message });
  }
});

// Set light show
router.post('/lights/show', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, lightId, showId, speed = 1, brightness = 100 } = req.body;
    
    if (!poolId || !lightId || showId === undefined) {
      return res.status(400).json({ error: 'poolId, lightId, and showId are required' });
    }

    await req.omnilogic.setLightShow(poolId, lightId, showId, speed, brightness);
    res.json({ success: true, message: 'Light show set successfully' });
  } catch (error) {
    console.error('Failed to set light show:', error);
    res.status(500).json({ error: 'Failed to set light show', message: error.message });
  }
});

// Set chlorinator settings
router.post('/chlorinator/settings', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, chlorinatorId, enable, timedPercent } = req.body;
    
    if (!poolId || !chlorinatorId || typeof enable !== 'boolean' || !timedPercent) {
      return res.status(400).json({ error: 'poolId, chlorinatorId, enable (boolean), and timedPercent are required' });
    }

    await req.omnilogic.setChlorinatorSettings(poolId, chlorinatorId, enable, timedPercent);
    res.json({ success: true, message: 'Chlorinator settings updated successfully' });
  } catch (error) {
    console.error('Failed to set chlorinator settings:', error);
    res.status(500).json({ error: 'Failed to set chlorinator settings', message: error.message });
  }
});

// Set super chlorination
router.post('/chlorinator/super', createOmniLogicInstance, async (req, res) => {
  try {
    const { poolId, chlorinatorId, isOn } = req.body;
    
    if (!poolId || !chlorinatorId || isOn === undefined) {
      return res.status(400).json({ error: 'poolId, chlorinatorId, and isOn are required' });
    }

    await req.omnilogic.setSuperChlorination(poolId, chlorinatorId, isOn);
    res.json({ success: true, message: 'Super chlorination toggled successfully' });
  } catch (error) {
    console.error('Failed to toggle super chlorination:', error);
    res.status(500).json({ error: 'Failed to toggle super chlorination', message: error.message });
  }
});

module.exports = router;