export interface VesselPassage {
  mmsi: number
  vesselName: string
  timestamp: number
  type: 'enter' | 'exit'
}

export interface VesselStats {
  mmsi: number
  vesselName: string
  passageCount: number
  lastSeen: number
}
