export interface VesselPassage {
  mmsi: number
  vesselName: string
  timestamp: number
  type: 'enter' | 'exit'
  position?: { lat: number; lon: number } // Last known position (especially for exit events)
}

export interface VesselStats {
  mmsi: number
  vesselName: string
  passageCount: number
  lastSeen: number
}

export interface StationaryRecord {
  mmsi: number
  vesselName: string
  totalMinutesStationary: number // Total minutes spent stationary
  lastSeen: number
  lastPosition: { lat: number; lon: number }
}
