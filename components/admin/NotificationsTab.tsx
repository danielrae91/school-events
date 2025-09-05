'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface NotificationStats {
  history: NotificationLog[]
  subscriberCount: number
  totalSent: number
  totalSuccessful: number
  recentHistory: NotificationLog[]
}

interface NotificationLog {
  id: string
  timestamp: string
  title: string
  recipientCount: number
  successCount: number
  failureCount: number
}

interface Subscription {
  id: string
  endpoint: string
  userAgent: string
  createdAt: string
  lastNotificationStatus: string
  lastNotificationTime?: string
  lastNotificationTitle?: string
}

interface NotificationsTabProps {
  onRefresh: () => void
  loading: boolean
}

export default function NotificationsTab({ onRefresh, loading }: NotificationsTabProps) {
  const [stats, setStats] = useState<NotificationStats>({
    history: [],
    subscriberCount: 0,
    totalSent: 0,
    totalSuccessful: 0,
    recentHistory: []
  })
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'subscribers'>('overview')
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    if (activeTab === 'subscribers') {
      fetchSubscriptions()
    }
  }, [activeTab])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/admin/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error)
      toast.error('Failed to load notification stats')
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/push/subscriptions', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Failed to load subscriptions')
    }
  }

  const sendTestNotification = async () => {
    setLoadingAction('test')
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test notification from the admin panel',
          url: '/'
        })
      })

      if (response.ok) {
        toast.success('Test notification sent!')
        fetchStats()
      } else {
        toast.error('Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setLoadingAction(null)
    }
  }

  const clearAllSubscriptions = async () => {
    setLoadingAction('clear-subs')
    try {
      const response = await fetch('/api/admin/push/subscriptions', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || localStorage.getItem('adminToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Cleared ${data.deletedCount} subscriptions`)
        setSubscriptions([])
        fetchStats()
      } else {
        toast.error('Failed to clear subscriptions')
      }
    } catch (error) {
      console.error('Error clearing subscriptions:', error)
      toast.error('Failed to clear subscriptions')
    } finally {
      setLoadingAction(null)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Simple Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Active Subscribers</p>
              <p className="text-2xl font-bold text-white">{stats.subscriberCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Total Sent</p>
              <p className="text-2xl font-bold text-white">{stats.totalSent}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalSent > 0 ? ((stats.totalSuccessful / stats.totalSent) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Last 2 Notifications */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Notifications</h3>
        {stats.recentHistory.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No notifications sent yet</p>
        ) : (
          <div className="space-y-3">
            {stats.recentHistory.map((notification) => (
              <div key={notification.id} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{notification.title}</h4>
                    <p className="text-slate-400 text-sm">{new Date(notification.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">{notification.successCount}/{notification.recipientCount}</p>
                    <p className="text-slate-400 text-xs">delivered</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={sendTestNotification}
            disabled={loadingAction === 'test'}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            {loadingAction === 'test' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const renderHistory = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notification History</h3>
        {loadingStats ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <span className="ml-2 text-slate-300">Loading history...</span>
          </div>
        ) : stats.history.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No notification history available</p>
        ) : (
          <div className="space-y-4">
            {stats.history.map((notification) => (
              <div key={notification.id} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{notification.title}</h4>
                    <p className="text-slate-400 text-sm">{new Date(notification.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-green-400 font-medium">{notification.successCount}</p>
                      <p className="text-slate-500 text-xs">Success</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 font-medium">{notification.failureCount}</p>
                      <p className="text-slate-500 text-xs">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-300 font-medium">{notification.recipientCount}</p>
                      <p className="text-slate-500 text-xs">Total</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderSubscribers = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Push Subscribers ({subscriptions.length})</h3>
          <button
            onClick={clearAllSubscriptions}
            disabled={loadingAction === 'clear-subs' || subscriptions.length === 0}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            {loadingAction === 'clear-subs' ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Clearing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </>
            )}
          </button>
        </div>
        
        {subscriptions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No active subscribers</p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{sub.userAgent}</p>
                    <p className="text-slate-400 text-xs">Subscribed: {new Date(sub.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      sub.lastNotificationStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                      sub.lastNotificationStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {sub.lastNotificationStatus === 'success' ? '✓ Delivered' :
                       sub.lastNotificationStatus === 'failed' ? '✗ Failed' :
                       'No notifications'}
                    </div>
                    {sub.lastNotificationTime && (
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(sub.lastNotificationTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 blur-xl rounded-2xl"></div>
        <div className="relative bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h10V9H4v2zM4 7h12V5H4v2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Push Notifications</h2>
                <p className="text-slate-400 text-sm">Manage push notification system</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                onClick={() => { onRefresh(); fetchStats(); }}
                disabled={loading}
                className="flex-1 sm:flex-none bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-1">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'subscribers', label: 'Subscribers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'subscribers' && renderSubscribers()}
    </div>
  )
}
