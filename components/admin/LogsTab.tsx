'use client'

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
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to retry email:', err)
    }
  }

  const handleBulkRetryLogs = async () => {
    if (!confirm('Are you sure you want to retry processing all stored emails? This may take several minutes.')) return
    
    try {
      const response = await fetch('/api/admin/bulk-retry', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        alert('Bulk retry started successfully')
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to start bulk retry:', err)
      alert('Failed to start bulk retry')
    }
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Email Processing Logs</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex-1 sm:flex-none bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry All
          </button>
          <button
            onClick={onCleanupRedis}
            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Cleanup Redis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading logs...</div>
      ) : emailLogs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No email logs found</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-300">{emailLogs.length} log entries</span>
              {selectedLogs.length > 0 && (
                <span className="text-purple-400">{selectedLogs.length} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedLogs.length > 0 && (
                <>
                  <button
                    onClick={onBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={onClearSelection}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Clear Selection
                  </button>
                </>
              )}
              <button
                onClick={onSelectAll}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Select All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading logs...</div>
          ) : (
            <div className="space-y-3">
              {emailLogs.map((log) => (
                <div
                  key={log.id}
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors cursor-pointer ${
                    selectedLogs.includes(log.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => onToggleSelection(log.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLogs.includes(log.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        onToggleSelection(log.id)
                      }}
                      className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-white">{log.subject}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getStatusColor(log.status)} flex items-center gap-1`}>
                            {log.status === 'processing' && (
                              <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent"></div>
                            )}
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {log.error && (
                        <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                          <p className="text-red-300 text-sm">{log.error}</p>
                        </div>
                      )}
                      
                      <div className="text-sm text-slate-400 space-y-1">
                        <p>Created: {new Date(log.created_at).toLocaleString()}</p>
                        {log.processed_at && (
                          <p>Processed: {new Date(log.processed_at).toLocaleString()}</p>
                        )}
                        {(log.eventsProcessed !== undefined || log.eventsSkipped !== undefined || log.eventsExtracted !== undefined) && (
                          <div className="mt-2 flex gap-4 text-xs">
                            {log.eventsExtracted !== undefined && (
                              <span className="text-blue-400">📧 {log.eventsExtracted} extracted</span>
                            )}
                            {log.eventsProcessed !== undefined && (
                              <span className="text-green-400">✅ {log.eventsProcessed} created</span>
                            )}
                            {log.eventsSkipped !== undefined && (
                              <span className="text-yellow-400">⏭️ {log.eventsSkipped} skipped</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {(log.status === 'failed' || log.status === 'error' || log.status === 'processing') && (
                        <div className="mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryEmail(log.id)
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            {log.status === 'processing' ? 'Force Retry (Stuck)' : 'Retry Processing'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
