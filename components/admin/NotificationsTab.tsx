'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface NotificationsTabProps {
  adminToken: string | null
}

interface NotificationStats {
  totalSubscriptions: number
  activeSubscriptions: number
  totalNotificationsSent: number
  successRate: number
  averageDeliveryTime: number
}

interface PushSubscription {
  id: string
  endpoint: string
  userAgent?: string
  createdAt: string
  lastUsed?: string
  active: boolean
}

interface NotificationLog {
  id: string
  title: string
  body: string
  eventId: string
  sentAt: string
  recipientCount: number
  successCount: number
  failureCount: number
  status: 'pending' | 'sending' | 'completed' | 'failed'
}

interface DebugInfo {
  vapidKeysConfigured: {
    public: boolean
    private: boolean
    nextPublic: boolean
  }
  redisConnection: boolean
  subscriptions: {
    total: number
    activeCount: number
    inactiveCount: number
  }
}

type TabType = 'overview' | 'subscriptions' | 'history' | 'settings'

export default function NotificationsTab({ adminToken }: NotificationsTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([])
  
  // Data states
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([])
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const fetchNotifications = async () => {
    if (!adminToken) return
    
    try {
      setLoading(true)
      setError(null)

      // Fetch notifications
      const notificationsResponse = await fetch('/api/admin/notifications', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.notifications || [])
      }

      // Fetch stats
      const statsResponse = await fetch('/api/admin/notifications/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/admin/push/subscriptions', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.subscriptions || [])
      }

    } catch (err) {
      console.error('Failed to fetch notifications data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const fetchDebugInfo = async () => {
    if (!adminToken) return
    
    try {
      const response = await fetch('/api/push/debug', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      }
    } catch (err) {
      console.error('Failed to fetch debug info:', err)
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

      const responseData = await response.json()

      if (response.ok) {
        toast.success(`Test notification sent successfully! ${responseData.message || ''}`)
        fetchNotifications()
      } else {
        const errorMsg = responseData.error || 'Failed to send test notification'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      console.error('Failed to send test notification:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to send test notification'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSending(false)
    }
  }

  const deregisterSubscription = async (subscriptionId: string) => {
    try {
      if (!adminToken) {
        setError('No admin token found')
        return
      }

      const response = await fetch(`/api/admin/push/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      if (response.ok) {
        toast.success('Subscription deregistered successfully')
        fetchNotifications()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to deregister subscription')
      }
    } catch (err) {
      console.error('Failed to deregister subscription:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to deregister subscription')
    }
  }

  const bulkDeleteSubscriptions = async (subscriptionIds: string[]) => {
    try {
      if (!adminToken) {
        setError('No admin token found')
        return
      }

      const response = await fetch('/api/admin/push/subscriptions/bulk-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionIds })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.deletedCount} subscriptions deleted successfully`)
        setSelectedSubscriptions([])
        fetchNotifications()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete subscriptions')
      }
    } catch (err) {
      console.error('Failed to bulk delete subscriptions:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete subscriptions')
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
        toast.success('Notification deleted successfully')
        fetchNotifications()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete notification')
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchDebugInfo()
  }, [adminToken])

  const refreshNotifications = () => {
    fetchNotifications()
    fetchDebugInfo()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="h-24 bg-slate-700 rounded"></div>
            <div className="h-24 bg-slate-700 rounded"></div>
            <div className="h-24 bg-slate-700 rounded"></div>
            <div className="h-24 bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-700 rounded"></div>
            <div className="h-16 bg-slate-700 rounded"></div>
            <div className="h-16 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Push Notifications</h2>
        <div className="flex flex-wrap gap-2">
          {(['overview', 'subscriptions', 'history', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Subscribers</p>
                <p className="text-2xl font-bold text-white">{stats.totalSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Subscribers</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-purple-400">{stats.successRate?.toFixed(1) || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Sent</p>
                <p className="text-2xl font-bold text-orange-400">{stats.totalNotificationsSent}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h10V9H4v2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={sendTestNotification}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                Send Test Notification
              </button>
              <button
                onClick={fetchDebugInfo}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Debug Info
              </button>
              <button
                onClick={refreshNotifications}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">VAPID Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Public Key:</span>
                      <span className={debugInfo.vapidKeysConfigured?.public ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.vapidKeysConfigured?.public ? '✓ Configured' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Private Key:</span>
                      <span className={debugInfo.vapidKeysConfigured?.private ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.vapidKeysConfigured?.private ? '✓ Configured' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client Key:</span>
                      <span className={debugInfo.vapidKeysConfigured?.nextPublic ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.vapidKeysConfigured?.nextPublic ? '✓ Configured' : '✗ Missing'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Database</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Redis Connection:</span>
                      <span className={debugInfo.redisConnection ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.redisConnection ? '✓ Connected' : '✗ Disconnected'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Subscriptions:</span>
                      <span className="text-blue-400">{debugInfo.subscriptions?.activeCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white">Subscription Management</h3>
              {selectedSubscriptions.length > 0 && (
                <button
                  onClick={() => bulkDeleteSubscriptions(selectedSubscriptions)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedSubscriptions.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
