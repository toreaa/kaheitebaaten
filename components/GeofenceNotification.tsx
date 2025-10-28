'use client'

import { useEffect, useState } from 'react'

export type NotificationType = 'enter' | 'exit'

export interface VesselNotification {
  id: string
  type: NotificationType
  vesselName: string
  mmsi: number
  timestamp: number
}

interface GeofenceNotificationProps {
  notification: VesselNotification | null
}

export default function GeofenceNotification({ notification }: GeofenceNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<VesselNotification | null>(null)

  useEffect(() => {
    if (notification) {
      setCurrentNotification(notification)
      setVisible(true)

      // Play sound
      const audio = new Audio(notification.type === 'enter'
        ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjeJ0fPTgjMGHm7A7+OZURE='
        : 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjeJ0fPTgjMGHm7A7+OZURE=')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore if autoplay is blocked

      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [notification])

  if (!visible || !currentNotification) {
    return null
  }

  const isEntering = currentNotification.type === 'enter'

  return (
    <div
      style={{
        position: 'fixed',
        top: 70,
        right: 20,
        zIndex: 2000,
        background: isEntering ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '300px',
        animation: 'slideIn 0.3s ease-out',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>
          {isEntering ? '🚢 ➡️' : '🚢 ⬅️'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
            {isEntering ? 'Fartøy inn i området' : 'Fartøy ut av området'}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {currentNotification.vesselName}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
            MMSI: {currentNotification.mmsi}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
