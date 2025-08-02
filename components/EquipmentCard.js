import { 
  Zap, Lightbulb, Thermometer, Droplets, 
  Fan, Settings, AlertTriangle, CheckCircle,
  Activity, Gauge
} from 'lucide-react'

export default function EquipmentCard({ equipment }) {
  const getEquipmentIcon = (type) => {
    switch (type) {
      case 'Filter':
        return <Fan className="w-5 h-5" />
      case 'Heater':
      case 'VirtualHeater':
        return <Thermometer className="w-5 h-5" />
      case 'ColorLogic-Light':
        return <Lightbulb className="w-5 h-5" />
      case 'Chlorinator':
        return <Droplets className="w-5 h-5" />
      case 'Relay':
        return <Zap className="w-5 h-5" />
      case 'Pump':
        return <Activity className="w-5 h-5" />
      default:
        return <Settings className="w-5 h-5" />
    }
  }

  const getStatusColor = (value, type = 'state') => {
    if (value === undefined || value === null) return 'status-warning'
    
    if (type === 'state') {
      if (value === '1' || value === 1 || value === true || value === 'yes') return 'status-online'
      if (value === '0' || value === 0 || value === false || value === 'no') return 'status-offline'
    }
    
    return 'status-warning'
  }

  const formatEquipmentName = (type) => {
    switch (type) {
      case 'ColorLogic-Light':
        return 'Pool Light'
      case 'VirtualHeater':
        return 'Heater'
      default:
        return type
    }
  }

  const renderEquipmentDetails = () => {
    const { type } = equipment
    
    switch (type) {
      case 'Filter':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">State:</span>
              <span className={`equipment-status ${getStatusColor(equipment.filterState)}`}>
                {equipment.filterState === '1' ? 'Running' : 
                 equipment.filterState === '2' ? 'Priming' : 'Off'}
              </span>
            </div>
            {equipment.filterSpeed && (
              <div className="flex justify-between">
                <span className="text-pool-600">Speed:</span>
                <span className="font-medium">{equipment.filterSpeed}%</span>
              </div>
            )}
            {equipment.lastSpeed && (
              <div className="flex justify-between">
                <span className="text-pool-600">Last Speed:</span>
                <span className="font-medium">{equipment.lastSpeed}%</span>
              </div>
            )}
            {equipment.valvePosition && (
              <div className="flex justify-between">
                <span className="text-pool-600">Valve Position:</span>
                <span className="font-medium">{equipment.valvePosition}</span>
              </div>
            )}
          </div>
        )

      case 'Heater':
      case 'VirtualHeater':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">Enabled:</span>
              <span className={`equipment-status ${getStatusColor(equipment.enable)}`}>
                {equipment.enable === 'yes' || equipment.enable === 'true' ? 'Yes' : 'No'}
              </span>
            </div>
            {equipment['Current-Set-Point'] && (
              <div className="flex justify-between">
                <span className="text-pool-600">Set Point:</span>
                <span className="font-medium">{equipment['Current-Set-Point']}°F</span>
              </div>
            )}
            {equipment.SolarSetPoint && (
              <div className="flex justify-between">
                <span className="text-pool-600">Solar Set Point:</span>
                <span className="font-medium">{equipment.SolarSetPoint}°F</span>
              </div>
            )}
            {equipment.heaterState !== undefined && (
              <div className="flex justify-between">
                <span className="text-pool-600">State:</span>
                <span className={`equipment-status ${getStatusColor(equipment.heaterState)}`}>
                  {equipment.heaterState === '1' ? 'Heating' : 'Idle'}
                </span>
              </div>
            )}
          </div>
        )

      case 'ColorLogic-Light':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">State:</span>
              <span className={`equipment-status ${getStatusColor(equipment.lightState)}`}>
                {equipment.lightState === '1' ? 'On' : 'Off'}
              </span>
            </div>
            {equipment.currentShow !== undefined && (
              <div className="flex justify-between">
                <span className="text-pool-600">Show:</span>
                <span className="font-medium">{equipment.currentShow}</span>
              </div>
            )}
            {equipment.brightness && (
              <div className="flex justify-between">
                <span className="text-pool-600">Brightness:</span>
                <span className="font-medium">{equipment.brightness}%</span>
              </div>
            )}
            {equipment.speed && (
              <div className="flex justify-between">
                <span className="text-pool-600">Speed:</span>
                <span className="font-medium">{equipment.speed}</span>
              </div>
            )}
          </div>
        )

      case 'Chlorinator':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">Enabled:</span>
              <span className={`equipment-status ${getStatusColor(equipment.enable)}`}>
                {equipment.enable === '1' ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-pool-600">Operating:</span>
              <span className={`equipment-status ${getStatusColor(equipment.operatingState)}`}>
                {equipment.operatingState === '2' ? 'Generating' : 
                 equipment.operatingState === '1' ? 'Standby' : 'Off'}
              </span>
            </div>
            {equipment['Timed-Percent'] && (
              <div className="flex justify-between">
                <span className="text-pool-600">Output:</span>
                <span className="font-medium">{equipment['Timed-Percent']}%</span>
              </div>
            )}
            {equipment.avgSaltLevel && equipment.avgSaltLevel !== '0' && (
              <div className="flex justify-between">
                <span className="text-pool-600">Salt Level:</span>
                <span className="font-medium">{equipment.avgSaltLevel} ppm</span>
              </div>
            )}
            {equipment.operatingMode && (
              <div className="flex justify-between">
                <span className="text-pool-600">Mode:</span>
                <span className="font-medium">
                  {equipment.operatingMode === '1' ? 'Timed' : 
                   equipment.operatingMode === '2' ? 'ORP' : 'Manual'}
                </span>
              </div>
            )}
          </div>
        )

      case 'Relay':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">State:</span>
              <span className={`equipment-status ${getStatusColor(equipment.relayState)}`}>
                {equipment.relayState === '1' ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        )

      case 'Pump':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pool-600">State:</span>
              <span className={`equipment-status ${getStatusColor(equipment.pumpState || equipment.filterState)}`}>
                {(equipment.pumpState || equipment.filterState) === '1' ? 'Running' : 'Off'}
              </span>
            </div>
            {equipment.speed && (
              <div className="flex justify-between">
                <span className="text-pool-600">Speed:</span>
                <span className="font-medium">{equipment.speed}%</span>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-sm text-pool-600">
            System ID: {equipment.systemId || 'N/A'}
          </div>
        )
    }
  }

  return (
    <div className="bg-pool-50 rounded-lg p-4 border border-pool-200/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-pool-500">
            {getEquipmentIcon(equipment.type)}
          </div>
          <h3 className="font-medium text-pool-900">
            {formatEquipmentName(equipment.type)}
          </h3>
        </div>
        {equipment.systemId && (
          <span className="text-xs text-pool-500 bg-pool-100 px-2 py-1 rounded">
            ID: {equipment.systemId}
          </span>
        )}
      </div>
      
      {renderEquipmentDetails()}
    </div>
  )
}