import { useState, useEffect } from 'react'
import { LogOut, RefreshCw, AlertTriangle, Settings, Thermometer, Waves } from 'lucide-react'
import EquipmentCard from './EquipmentCard'
import TelemetryDisplay from './TelemetryDisplay'
import ControlPanel from './ControlPanel'

export default function Dashboard({ credentials, onLogout }) {
  const [config, setConfig] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setRefreshing(!showLoading)
    setError('')

    try {
      const headers = {
        'Content-Type': 'application/json',
        'username': credentials.username,
        'password': credentials.password,
      }

      // Fetch configuration
      const configResponse = await fetch('/api/pool/config', { headers })
      if (!configResponse.ok) throw new Error('Failed to fetch configuration')
      const configData = await configResponse.json()
      setConfig(configData)

      // Fetch telemetry
      const telemetryResponse = await fetch('/api/pool/telemetry', { headers })
      if (!telemetryResponse.ok) throw new Error('Failed to fetch telemetry')
      const telemetryData = await telemetryResponse.json()
      setTelemetry(telemetryData)

      // Fetch alarms
      const alarmsResponse = await fetch('/api/pool/alarms', { headers })
      if (!alarmsResponse.ok) throw new Error('Failed to fetch alarms')
      const alarmsData = await alarmsResponse.json()
      setAlarms(alarmsData.alarms || [])

    } catch (error) {
      console.error('Failed to fetch data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(false), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pool-500 mx-auto mb-4"></div>
          <p className="text-pool-600">Loading pool data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full pool-card p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="pool-button mr-2"
          >
            Retry
          </button>
          <button
            onClick={onLogout}
            className="pool-button-secondary"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  const backyard = telemetry?.STATUS?.Backyard || {}
  const pools = []
  const equipment = []

  // Parse telemetry data to extract pools and equipment
  if (telemetry?.STATUS) {
    Object.keys(telemetry.STATUS).forEach(key => {
      const item = telemetry.STATUS[key]
      if (key === 'BodyOfWater') {
        pools.push(Array.isArray(item) ? item : [item])
      } else if (key !== 'Backyard') {
        equipment.push({ type: key, ...item })
      }
    })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pool-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Waves className="w-8 h-8 text-pool-500" />
              <div>
                <h1 className="text-xl font-semibold text-pool-900">Pool Manager</h1>
                <p className="text-sm text-pool-600">System ID: {backyard.systemId}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchData(false)}
                disabled={refreshing}
                className="p-2 rounded-lg bg-pool-100 hover:bg-pool-200 text-pool-600 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 pool-button-secondary"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - System Status */}
          <div className="space-y-6">
            <div className="pool-card p-6">
              <h2 className="text-lg font-semibold text-pool-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                System Status
              </h2>
              <TelemetryDisplay backyard={backyard} pools={pools} />
            </div>

            {/* Alarms */}
            {alarms.length > 0 && (
              <div className="pool-card p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Active Alarms
                </h2>
                <div className="space-y-2">
                  {alarms.map((alarm, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{alarm}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Column - Equipment */}
          <div className="space-y-6">
            <div className="pool-card p-6">
              <h2 className="text-lg font-semibold text-pool-900 mb-4">Equipment Status</h2>
              <div className="space-y-4">
                {equipment.map((item, index) => (
                  <EquipmentCard key={index} equipment={item} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            <ControlPanel credentials={credentials} config={config} onUpdate={() => fetchData(false)} />
          </div>
        </div>
      </main>
    </div>
  )
}