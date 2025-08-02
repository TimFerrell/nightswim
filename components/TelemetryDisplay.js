import { Thermometer, Droplets, Activity, Calendar } from 'lucide-react'

export default function TelemetryDisplay({ backyard, pools }) {
  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A'
    return new Date(dateTime).toLocaleString()
  }

  const getStatusColor = (status) => {
    if (status === '1' || status === 1) return 'status-online'
    if (status === '0' || status === 0) return 'status-offline'
    return 'status-warning'
  }

  return (
    <div className="space-y-4">
      {/* System Information */}
      <div className="bg-pool-50 rounded-lg p-4">
        <h3 className="font-medium text-pool-900 mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          System Information
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-pool-600">Status:</span>
            <span className={`equipment-status ml-2 ${getStatusColor(backyard.status)}`}>
              {backyard.status === '1' ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>
            <span className="text-pool-600">State:</span>
            <span className={`equipment-status ml-2 ${getStatusColor(backyard.state)}`}>
              {backyard.state === '1' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-pool-600">Version:</span>
            <span className="ml-2 text-pool-900">{backyard.mspVersion || 'N/A'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-pool-600 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Last Update:
            </span>
            <span className="ml-2 text-pool-900 text-xs">
              {formatDateTime(backyard.datetime)}
            </span>
          </div>
        </div>
      </div>

      {/* Temperature Readings */}
      <div className="bg-pool-50 rounded-lg p-4">
        <h3 className="font-medium text-pool-900 mb-3 flex items-center">
          <Thermometer className="w-4 h-4 mr-2" />
          Temperature Readings
        </h3>
        <div className="space-y-2">
          {backyard.airTemp && (
            <div className="flex justify-between items-center">
              <span className="text-pool-600 text-sm">Air Temperature:</span>
              <span className="font-medium text-pool-900">{backyard.airTemp}°F</span>
            </div>
          )}
          
          {pools.flat().map((pool, index) => {
            if (!pool || !pool.waterTemp || pool.waterTemp === '-1') return null
            
            return (
              <div key={index} className="flex justify-between items-center">
                <span className="text-pool-600 text-sm flex items-center">
                  <Droplets className="w-3 h-3 mr-1" />
                  {pool.systemId ? `Pool ${pool.systemId}` : 'Pool'} Water:
                </span>
                <span className="font-medium text-pool-900">{pool.waterTemp}°F</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Flow Status */}
      {pools.flat().some(pool => pool?.flow) && (
        <div className="bg-pool-50 rounded-lg p-4">
          <h3 className="font-medium text-pool-900 mb-3 flex items-center">
            <Droplets className="w-4 h-4 mr-2" />
            Flow Status
          </h3>
          <div className="space-y-2">
            {pools.flat().map((pool, index) => {
              if (!pool || pool.flow === undefined) return null
              
              return (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-pool-600 text-sm">
                    {pool.systemId ? `Pool ${pool.systemId}` : 'Pool'} Flow:
                  </span>
                  <span className={`equipment-status ${getStatusColor(pool.flow)}`}>
                    {pool.flow === '1' || pool.flow === 1 ? 'Flowing' : 'No Flow'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}