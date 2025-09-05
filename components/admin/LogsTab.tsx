'use client'

import { toast } from 'sonner'

interface EmailLog {
  id: string
  subject: string
  status: string
  error?: string
  created_at: string
  processed_at?: string
  eventsProcessed?: number
  eventsSkipped?: number
  eventsExtracted?: number
}

interface LogsTabProps {
  emailLogs: EmailLog[]
  selectedLogs: string[]
  loading: boolean
  adminToken: string
  onRefresh: () => void
  onBulkDelete: () => void
  onToggleSelection: (logId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onCleanupRedis: () => void
}

export default function LogsTab({
  emailLogs,
  selectedLogs,
  loading,
  adminToken,
  onRefresh,
  onBulkDelete,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onCleanupRedis
}: LogsTabProps) {
  const handleRetryEmail = async (logId: string) => {
    try {
      const response = await fetch('/api/admin/retry', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logId })
      })
      if (response.ok) {
        toast.success('Email retry started successfully')
        onRefresh()
      } else {
        toast.error('Failed to retry email processing')
      }
    } catch (err) {
      toast.error('Failed to retry email processing')
    }
  }

  const handleBulkRetryLogs = async () => {
    toast.custom((t) => (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">Retry All Email Processing</h3>
            <p className="text-slate-300 text-sm">This will retry processing all stored emails. This may take several minutes.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/bulk-retry', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  toast.dismiss(t)
                  toast.success('Bulk retry started successfully')
                  onRefresh()
                } else {
                  toast.dismiss(t)
                  toast.error('Failed to start bulk retry')
                }
              } catch (err) {
                toast.dismiss(t)
                toast.error('Failed to start bulk retry')
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Start Retry
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleBulkDelete = () => {
    toast.custom((t) => (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">Delete Selected Logs</h3>
            <p className="text-slate-300 text-sm">Are you sure you want to delete {selectedLogs.length} selected log entries?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onBulkDelete()
              toast.dismiss(t)
              toast.success(`${selectedLogs.length} log entries deleted successfully`)
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Delete All
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleCleanupRedis = () => {
    toast.custom((t) => (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">Cleanup Redis Cache</h3>
            <p className="text-slate-300 text-sm">This will clear Redis cache and temporary data. Are you sure?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onCleanupRedis()
              toast.dismiss(t)
              toast.success('Redis cleanup completed successfully')
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cleanup
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-400'
      case 'failed':
      case 'error':
        return 'text-red-400'
      case 'processing':
      case 'pending':
        return 'text-yellow-400'
      default:
        return 'text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'processing':
      case 'pending':
        return (
          <svg className="animate-spin w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Email Processing Logs</h2>
                <p className="text-slate-400 text-sm">Monitor email processing status and retry failed operations</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex-1 sm:flex-none bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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
              <button
                onClick={handleBulkRetryLogs}
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry All
              </button>
              <button
                onClick={handleCleanupRedis}
                className="flex-1 sm:flex-none bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Cleanup Redis
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-slate-300 font-medium">Loading logs...</p>
          </div>
        </div>
      ) : emailLogs.length === 0 ? (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-slate-700/50 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Email Logs Found</h3>
            <p className="text-slate-400">No email processing logs available yet</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          {/* Stats and Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-slate-300 font-medium">{emailLogs.length} log entries</span>
              </div>
              {selectedLogs.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-purple-400 font-medium">{selectedLogs.length} selected</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">{emailLogs.filter(log => log.status === 'completed' || log.status === 'success').length} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-red-400 font-medium">{emailLogs.filter(log => log.status === 'failed' || log.status === 'error').length} failed</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLogs.length > 0 && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={onClearSelection}
                    className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Clear Selection
                  </button>
                </>
              )}
              <button
                onClick={onSelectAll}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Select All
              </button>
            </div>
          </div>

          {/* Logs Grid */}
          <div className="space-y-4">
            {emailLogs.map((log) => (
              <div
                key={log.id}
                className={`relative group transition-all duration-300 cursor-pointer ${
                  selectedLogs.includes(log.id)
                    ? 'scale-[1.02]'
                    : 'hover:scale-[1.01]'
                }`}
                onClick={() => onToggleSelection(log.id)}
              >
                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  selectedLogs.includes(log.id)
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-sm'
                    : log.status === 'failed' || log.status === 'error'
                    ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20 blur-sm group-hover:from-red-500/30 group-hover:to-orange-500/30'
                    : log.status === 'completed' || log.status === 'success'
                    ? 'bg-gradient-to-r from-green-600/20 to-blue-600/20 blur-sm group-hover:from-green-500/30 group-hover:to-blue-500/30'
                    : 'bg-gradient-to-r from-slate-600/10 to-slate-700/10 blur-sm group-hover:from-slate-500/20 group-hover:to-slate-600/20'
                }`}></div>
                <div className={`relative bg-slate-800/60 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 ${
                  selectedLogs.includes(log.id)
                    ? 'border-purple-500/50 shadow-xl shadow-purple-500/10'
                    : log.status === 'failed' || log.status === 'error'
                    ? 'border-red-500/50 shadow-xl shadow-red-500/10'
                    : log.status === 'completed' || log.status === 'success'
                    ? 'border-green-500/50 shadow-xl shadow-green-500/10'
                    : 'border-slate-700/50 group-hover:border-slate-600/50 shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          onToggleSelection(log.id)
                        }}
                        className="w-5 h-5 rounded-lg border-2 border-slate-500 bg-slate-700 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 transition-all duration-200"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors truncate">{log.subject}</h3>
                        <div className="flex items-center gap-2 ml-4">
                          {getStatusIcon(log.status)}
                          <span className={`text-sm font-semibold ${getStatusColor(log.status)} uppercase tracking-wide`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                      
                      {log.error && (
                        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 mb-4">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <h4 className="text-red-300 font-semibold text-sm mb-1">Error Details</h4>
                              <p className="text-red-200 text-sm leading-relaxed">{log.error}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Created:</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          {log.processed_at && (
                            <div className="flex items-center gap-2 text-slate-300">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">Processed:</span>
                              <span>{new Date(log.processed_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        
                        {(log.eventsProcessed !== undefined || log.eventsSkipped !== undefined || log.eventsExtracted !== undefined) && (
                          <div className="space-y-2">
                            {log.eventsExtracted !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-blue-400 font-medium">{log.eventsExtracted} extracted</span>
                              </div>
                            )}
                            {log.eventsProcessed !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-green-400 font-medium">{log.eventsProcessed} created</span>
                              </div>
                            )}
                            {log.eventsSkipped !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                <span className="text-yellow-400 font-medium">{log.eventsSkipped} skipped</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {(log.status === 'failed' || log.status === 'error' || log.status === 'processing') && (
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryEmail(log.id)
                            }}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {log.status === 'processing' ? 'Force Retry (Stuck)' : 'Retry Processing'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
