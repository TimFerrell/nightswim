import { useState } from 'react'
import { 
  Settings, Thermometer, Lightbulb, Droplets, 
  Fan, Zap, Play, Pause, Plus, Minus 
} from 'lucide-react'

export default function ControlPanel({ credentials, config, onUpdate }) {
  const [loading, setLoading] = useState({})
  const [error, setError] = useState('')

  const makeRequest = async (endpoint, data, equipmentId = null) => {
    const loadingKey = equipmentId || endpoint
    setLoading(prev => ({ ...prev, [loadingKey]: true }))
    setError('')

    try {
      const response = await fetch(`/api/pool/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': credentials.username,
          'password': credentials.password,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Operation failed')
      }

      onUpdate() // Refresh data
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const LightShowSelector = ({ poolId, lightId }) => {
    const lightShows = [
      { id: 0, name: 'Voodoo Lounge', color: 'purple' },
      { id: 1, name: 'Deep Blue Sea', color: 'blue' },
      { id: 2, name: 'Royal Blue', color: 'blue' },
      { id: 3, name: 'Afternoon Skies', color: 'cyan' },
      { id: 4, name: 'Aqua Green', color: 'green' },
      { id: 5, name: 'Emerald', color: 'green' },
      { id: 6, name: 'Cloud White', color: 'gray' },
      { id: 7, name: 'Warm Red', color: 'red' },
      { id: 8, name: 'Flamingo', color: 'pink' },
      { id: 9, name: 'Vivid Violet', color: 'purple' },
      { id: 10, name: 'Sangria', color: 'red' },
      { id: 11, name: 'Twilight', color: 'purple' },
      { id: 12, name: 'Tranquility', color: 'blue' },
      { id: 13, name: 'Gemstone', color: 'multicolor' },
      { id: 14, name: 'USA', color: 'multicolor' },
      { id: 15, name: 'Mardi Gras', color: 'multicolor' },
      { id: 16, name: 'Cool Cabaret', color: 'blue' },
    ]

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-pool-900 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2" />
          Light Shows
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {lightShows.map((show) => (
            <button
              key={show.id}
              onClick={() => makeRequest('lights/show', {
                poolId,
                lightId,
                showId: show.id,
                speed: 1,
                brightness: 100
              }, `light-${lightId}`)}
              disabled={loading[`light-${lightId}`]}
              className="text-xs p-2 bg-pool-100 hover:bg-pool-200 text-pool-700 rounded transition-colors disabled:opacity-50"
            >
              {show.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const TemperatureControl = ({ poolId, heaterId, currentTemp, label }) => {
    const [temp, setTemp] = useState(currentTemp || 78)

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-pool-900 flex items-center">
          <Thermometer className="w-4 h-4 mr-2" />
          {label} Temperature
        </h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const newTemp = Math.max(65, temp - 1)
              setTemp(newTemp)
              makeRequest('heater/temperature', {
                poolId,
                heaterId,
                temperature: newTemp
              }, `heater-${heaterId}`)
            }}
            disabled={loading[`heater-${heaterId}`]}
            className="p-1 bg-pool-100 hover:bg-pool-200 rounded"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-mono text-lg font-semibold text-pool-900 min-w-[3rem] text-center">
            {temp}°F
          </span>
          <button
            onClick={() => {
              const newTemp = Math.min(104, temp + 1)
              setTemp(newTemp)
              makeRequest('heater/temperature', {
                poolId,
                heaterId,
                temperature: newTemp
              }, `heater-${heaterId}`)
            }}
            disabled={loading[`heater-${heaterId}`]}
            className="p-1 bg-pool-100 hover:bg-pool-200 rounded"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => makeRequest('heater/toggle', {
              poolId,
              heaterId,
              enable: true
            }, `heater-toggle-${heaterId}`)}
            disabled={loading[`heater-toggle-${heaterId}`]}
            className="flex-1 pool-button text-sm py-1"
          >
            Turn On
          </button>
          <button
            onClick={() => makeRequest('heater/toggle', {
              poolId,
              heaterId,
              enable: false
            }, `heater-toggle-${heaterId}`)}
            disabled={loading[`heater-toggle-${heaterId}`]}
            className="flex-1 pool-button-secondary text-sm py-1"
          >
            Turn Off
          </button>
        </div>
      </div>
    )
  }

  const PumpControl = ({ poolId, pumpId, currentSpeed, label }) => {
    const [speed, setSpeed] = useState(currentSpeed || 0)

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-pool-900 flex items-center">
          <Fan className="w-4 h-4 mr-2" />
          {label} Pump
        </h4>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-pool-600">
            <span>0%</span>
            <span className="font-semibold">{speed}%</span>
            <span>100%</span>
          </div>
        </div>
        <button
          onClick={() => makeRequest('pump/speed', {
            poolId,
            pumpId,
            speed
          }, `pump-${pumpId}`)}
          disabled={loading[`pump-${pumpId}`]}
          className="w-full pool-button text-sm py-1"
        >
          Set Speed
        </button>
      </div>
    )
  }

  const ChlorinatorControl = ({ poolId, chlorinatorId, currentPercent, enabled }) => {
    const [percent, setPercent] = useState(currentPercent || 0)

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-pool-900 flex items-center">
          <Droplets className="w-4 h-4 mr-2" />
          Chlorinator
        </h4>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={percent}
            onChange={(e) => setPercent(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-pool-600">
            <span>0%</span>
            <span className="font-semibold">{percent}%</span>
            <span>100%</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => makeRequest('chlorinator/settings', {
              poolId,
              chlorinatorId,
              enable: true,
              timedPercent: percent
            }, `chlor-${chlorinatorId}`)}
            disabled={loading[`chlor-${chlorinatorId}`]}
            className="flex-1 pool-button text-sm py-1"
          >
            Enable
          </button>
          <button
            onClick={() => makeRequest('chlorinator/settings', {
              poolId,
              chlorinatorId,
              enable: false,
              timedPercent: percent
            }, `chlor-${chlorinatorId}`)}
            disabled={loading[`chlor-${chlorinatorId}`]}
            className="flex-1 pool-button-secondary text-sm py-1"
          >
            Disable
          </button>
        </div>
        <button
          onClick={() => makeRequest('chlorinator/super', {
            poolId,
            chlorinatorId,
            isOn: 1
          }, `super-chlor-${chlorinatorId}`)}
          disabled={loading[`super-chlor-${chlorinatorId}`]}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded"
        >
          Super Chlorinate
        </button>
      </div>
    )
  }

  const RelayControl = ({ poolId, equipmentId, label, state }) => {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-pool-900 flex items-center">
          <Zap className="w-4 h-4 mr-2" />
          {label}
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={() => makeRequest('relay/toggle', {
              poolId,
              equipmentId,
              onOff: 1
            }, `relay-${equipmentId}`)}
            disabled={loading[`relay-${equipmentId}`]}
            className="flex-1 pool-button text-sm py-1"
          >
            Turn On
          </button>
          <button
            onClick={() => makeRequest('relay/toggle', {
              poolId,
              equipmentId,
              onOff: 0
            }, `relay-${equipmentId}`)}
            disabled={loading[`relay-${equipmentId}`]}
            className="flex-1 pool-button-secondary text-sm py-1"
          >
            Turn Off
          </button>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="pool-card p-6">
        <div className="text-center text-pool-600">
          <Settings className="w-8 h-8 mx-auto mb-2" />
          <p>Loading controls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="pool-card p-6">
        <h2 className="text-lg font-semibold text-pool-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Equipment Controls
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Example controls - these would be populated based on actual config */}
          <TemperatureControl 
            poolId={1} 
            heaterId={4} 
            currentTemp={78} 
            label="Pool" 
          />
          
          <PumpControl 
            poolId={1} 
            pumpId={3} 
            currentSpeed={75} 
            label="Filter" 
          />
          
          <ChlorinatorControl 
            poolId={1} 
            chlorinatorId={6} 
            currentPercent={30} 
            enabled={true} 
          />
          
          <LightShowSelector 
            poolId={1} 
            lightId={23} 
          />
          
          <RelayControl 
            poolId={1} 
            equipmentId={14} 
            label="Spa Blower" 
            state={0} 
          />
        </div>
      </div>
    </div>
  )
}