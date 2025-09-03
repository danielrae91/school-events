'use client'

interface EmailLog {
  id: string
  subject: string
  status: string
  error?: string
  created_at: string
  processed_at?: string
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
  onDedupeEvents: () => void
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
  onCleanupRedis,
  onDedupeEvents
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Email Processing Logs</h2>
        <div className="flex gap-3">
          <button
            onClick={onCleanupRedis}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cleanup Redis
          </button>
          <button
            onClick={onDedupeEvents}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Dedupe Events
          </button>
          <button
            onClick={onRefresh}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {emailLogs.length === 0 ? (
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
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors ${
                    selectedLogs.includes(log.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLogs.includes(log.id)}
                      onChange={() => onToggleSelection(log.id)}
                      className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-white">{log.subject}</h3>
                        <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {log.error && (
                        <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                          <p className="text-red-300 text-sm">{log.error}</p>
                        </div>
                      )}
                      
                      <div className="text-sm text-slate-400">
                        <p>Created: {new Date(log.created_at).toLocaleString()}</p>
                        {log.processed_at && (
                          <p>Processed: {new Date(log.processed_at).toLocaleString()}</p>
                        )}
                      </div>
                      
                      {(log.status === 'failed' || log.status === 'error') && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleRetryEmail(log.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Retry Processing
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
