export interface AISVessel {
  mmsi: number
  name: string
  latitude: number
  longitude: number
  speed: number
  course: number
  heading: number
  timestamp: string
  shipType?: string
  destination?: string
  eta?: string
}

export interface AISResponse {
  vessels: AISVessel[]
  source: 'live' | 'mock'
  timestamp: string
}
