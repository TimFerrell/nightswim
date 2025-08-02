const axios = require('axios');
const xml2js = require('xml2js');

class OmniLogic {
  constructor(username, password, apiUrl = 'https://app1.haywardomnilogic.com/HAAPI/HomeAutomation/API.ash') {
    this.username = username;
    this.password = password;
    this.apiUrl = apiUrl;
    this.token = null;
    this.tokenExpiry = null;
    this.mspSystemId = null;
    this.parser = new xml2js.Parser({ explicitArray: false });
    this.builder = new xml2js.Builder({ headless: true });
  }

  // Login and get authentication token
  async login() {
    try {
      const loginXml = this.builder.buildObject({
        Request: {
          Name: 'Login',
          Parameters: {
            Parameter: [
              { $: { name: 'UserName', dataType: 'String' }, _: this.username },
              { $: { name: 'Password', dataType: 'String' }, _: this.password }
            ]
          }
        }
      });

      const response = await axios.post(this.apiUrl, loginXml, {
        headers: { 'Content-Type': 'application/xml' }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.Response && result.Response.Parameters && result.Response.Parameters.Parameter) {
        const params = Array.isArray(result.Response.Parameters.Parameter) 
          ? result.Response.Parameters.Parameter 
          : [result.Response.Parameters.Parameter];
        
        const tokenParam = params.find(p => p.$.name === 'Token');
        const userIdParam = params.find(p => p.$.name === 'UserID');
        
        if (tokenParam && userIdParam) {
          this.token = tokenParam._;
          this.userId = userIdParam._;
          this.tokenExpiry = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
          return true;
        }
      }
      
      throw new Error('Invalid login response');
    } catch (error) {
      console.error('Login failed:', error.message);
      throw new Error('Login failed: ' + error.message);
    }
  }

  // Check if token is valid
  isTokenValid() {
    return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  // Ensure we have a valid token
  async ensureToken() {
    if (!this.isTokenValid()) {
      await this.login();
    }
  }

  // Make API request with token
  async makeRequest(requestName, parameters = []) {
    await this.ensureToken();

    const requestXml = this.builder.buildObject({
      Request: {
        Name: requestName,
        Parameters: {
          Parameter: [
            { $: { name: 'Token', dataType: 'String' }, _: this.token },
            ...parameters.map(p => ({
              $: { name: p.name, dataType: p.dataType },
              _: p.value
            }))
          ]
        }
      }
    });

    try {
      const response = await axios.post(this.apiUrl, requestXml, {
        headers: { 'Content-Type': 'application/xml' }
      });

      return await this.parser.parseStringPromise(response.data);
    } catch (error) {
      console.error('API request failed:', error.message);
      throw new Error('API request failed: ' + error.message);
    }
  }

  // Get MSP configuration
  async getMspConfig() {
    const result = await this.makeRequest('RequestMspConfigFile');
    
    if (result.Response && result.Response.Parameters && result.Response.Parameters.Parameter) {
      const params = Array.isArray(result.Response.Parameters.Parameter) 
        ? result.Response.Parameters.Parameter 
        : [result.Response.Parameters.Parameter];
      
      const configParam = params.find(p => p.$.name === 'ConfigFile');
      if (configParam) {
        const configData = await this.parser.parseStringPromise(configParam._);
        
        // Extract MspSystemID
        if (configData.Backyard && configData.Backyard.$.systemId) {
          this.mspSystemId = parseInt(configData.Backyard.$.systemId);
        }
        
        return configData;
      }
    }
    
    throw new Error('No configuration data received');
  }

  // Get telemetry data
  async getTelemetryData() {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    const result = await this.makeRequest('RequestTelemetryData', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId }
    ]);

    if (result.Response && result.Response.Parameters && result.Response.Parameters.Parameter) {
      const params = Array.isArray(result.Response.Parameters.Parameter) 
        ? result.Response.Parameters.Parameter 
        : [result.Response.Parameters.Parameter];
      
      const statusParam = params.find(p => p.$.name === 'StatusData');
      if (statusParam) {
        return await this.parser.parseStringPromise(statusParam._);
      }
    }
    
    throw new Error('No telemetry data received');
  }

  // Get alarm list
  async getAlarmList() {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    const result = await this.makeRequest('RequestAlarmList', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId }
    ]);

    if (result.Response && result.Response.Parameters && result.Response.Parameters.Parameter) {
      const params = Array.isArray(result.Response.Parameters.Parameter) 
        ? result.Response.Parameters.Parameter 
        : [result.Response.Parameters.Parameter];
      
      const alarmParam = params.find(p => p.$.name === 'AlarmList');
      if (alarmParam) {
        return await this.parser.parseStringPromise(alarmParam._);
      }
    }
    
    return { alarms: [] };
  }

  // Set heater temperature
  async setHeaterTemperature(poolId, heaterId, temperature) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIHeaterCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'HeaterID', dataType: 'int', value: heaterId },
      { name: 'Temp', dataType: 'int', value: temperature }
    ]);

    return true;
  }

  // Set heater on/off
  async setHeaterOnOff(poolId, heaterId, enable) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetHeaterEnableCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'HeaterID', dataType: 'int', value: heaterId },
      { name: 'HeaterEnable', dataType: 'bool', value: enable }
    ]);

    return true;
  }

  // Set pump speed
  async setPumpSpeed(poolId, pumpId, speed) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIEquipmentCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'EquipmentID', dataType: 'int', value: pumpId },
      { name: 'IsOn', dataType: 'int', value: speed },
      { name: 'IsCountDownTimer', dataType: 'bool', value: false },
      { name: 'StartTimeHours', dataType: 'int', value: 0 },
      { name: 'StartTimeMinutes', dataType: 'int', value: 0 },
      { name: 'EndTimeHours', dataType: 'int', value: 0 },
      { name: 'EndTimeMinutes', dataType: 'int', value: 0 },
      { name: 'DaysActive', dataType: 'int', value: 0 },
      { name: 'Recurring', dataType: 'bool', value: false }
    ]);

    return true;
  }

  // Set relay/valve
  async setRelayValve(poolId, equipmentId, onOff) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIEquipmentCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'EquipmentID', dataType: 'int', value: equipmentId },
      { name: 'IsOn', dataType: 'int', value: onOff },
      { name: 'IsCountDownTimer', dataType: 'bool', value: false },
      { name: 'StartTimeHours', dataType: 'int', value: 0 },
      { name: 'StartTimeMinutes', dataType: 'int', value: 0 },
      { name: 'EndTimeHours', dataType: 'int', value: 0 },
      { name: 'EndTimeMinutes', dataType: 'int', value: 0 },
      { name: 'DaysActive', dataType: 'int', value: 0 },
      { name: 'Recurring', dataType: 'bool', value: false }
    ]);

    return true;
  }

  // Set light show
  async setLightShow(poolId, lightId, showId, speed = 1, brightness = 100) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIColorLogicLightCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'LightID', dataType: 'int', value: lightId },
      { name: 'ShowID', dataType: 'int', value: showId },
      { name: 'Speed', dataType: 'int', value: speed },
      { name: 'Brightness', dataType: 'int', value: brightness }
    ]);

    return true;
  }

  // Set chlorinator settings
  async setChlorinatorSettings(poolId, chlorinatorId, enable, timedPercent) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIChlorCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'ChlorID', dataType: 'int', value: chlorinatorId },
      { name: 'Enable', dataType: 'bool', value: enable },
      { name: 'TimedPercent', dataType: 'int', value: timedPercent }
    ]);

    return true;
  }

  // Set super chlorination
  async setSuperChlorination(poolId, chlorinatorId, isOn) {
    if (!this.mspSystemId) {
      await this.getMspConfig();
    }

    await this.makeRequest('SetUIChlorSuperCmd', [
      { name: 'MspSystemID', dataType: 'int', value: this.mspSystemId },
      { name: 'PoolID', dataType: 'int', value: poolId },
      { name: 'ChlorID', dataType: 'int', value: chlorinatorId },
      { name: 'IsOn', dataType: 'int', value: isOn }
    ]);

    return true;
  }
}

module.exports = OmniLogic;