'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  title: string
  body: string
  eventId?: string
  eventTitle?: string
  eventDate?: string
  sentAt: string
  completedAt?: string
  recipientCount: number
  successCount: number
  failureCount: number
  status: string
}

interface NotificationsTabProps {
  adminToken: string
}

export default function NotificationsTab({ adminToken }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const fetchNotifications = async () => {
    try {
      if (!adminToken) {
        setError('No admin token found')
        return
      }

      const response = await fetch('/api/admin/notifications', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      if (!adminToken) {
        setError('No admin token found')
        return
      }

      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      if (response.ok) {
        // Refresh the notifications list after deletion
        refreshNotifications()
      } else {
        throw new Error('Failed to delete notification')
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }

  const sendTestNotification = async () => {
    setSending(true)
    setError(null)
    try {
      if (!adminToken) {
        setError('No admin token found')
        return
      }

      console.log('Sending test notification...')
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test push notification from TK Events admin panel',
          eventId: 'test',
          eventTitle: 'Test Event',
          eventDate: new Date().toISOString().split('T')[0]
        })
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        alert(`Test notification sent successfully! ${responseData.message || ''}`)
        fetchNotifications()
      } else {
        const errorMsg = responseData.error || 'Failed to send test notification'
        setError(errorMsg)
        alert(errorMsg)
      }
    } catch (err) {
      console.error('Failed to send test notification:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to send test notification'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [adminToken])

  const refreshNotifications = () => {
    fetchNotifications()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Push Notifications</h2>
        <button
          onClick={sendTestNotification}
          disabled={sending}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {sending ? 'Sending...' : 'Send Test'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">Notification History</h3>
          <p className="text-gray-400 text-sm mt-1">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} sent
          </p>
        </div>

        <div className="divide-y divide-slate-700">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No notifications sent yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-white">{notification.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        notification.status === 'completed' 
                          ? 'bg-green-900/50 text-green-300 border border-green-600'
                          : notification.status === 'sending'
                          ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-600'
                          : 'bg-red-900/50 text-red-300 border border-red-600'
                      }`}>
                        {notification.status}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{notification.body}</p>
                    
                    {notification.eventTitle && (
                      <div className="text-sm text-gray-400 mb-2">
                        <span className="font-medium">Event:</span> {notification.eventTitle}
                        {notification.eventDate && (
                          <span className="ml-2">on {new Date(notification.eventDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        Sent: {new Date(notification.sentAt).toLocaleString()}
                      </span>
                      <span>
                        Recipients: {notification.recipientCount || 0}
                      </span>
                      <span className="text-green-400">
                        ✓ {notification.successCount || 0}
                      </span>
                      {notification.failureCount > 0 && (
                        <span className="text-red-400">
                          ✗ {notification.failureCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="ml-4 text-red-400 hover:text-red-300 p-1 rounded"
                    title="Delete notification"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-medium text-white mb-2">Push Notification Setup</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• Push notifications work when the PWA is installed on user devices</p>
          <p>• Notifications are automatically sent when new events are added via email processing</p>
          <p>• Users must grant notification permission when they install the app</p>
          <p>• Test notifications help verify the system is working correctly</p>
        </div>
      </div>
    </div>
  )
}
