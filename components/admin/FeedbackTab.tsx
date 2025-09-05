'use client'

interface MessageItem {
  id: string
  name: string
  email: string
  message: string
  timestamp: string
  userAgent: string
  platform: string
  language: string
  screenResolution: string
  viewport: string
  timezone: string
  ipAddress: string
  country: string
  city: string
  isRead: boolean
  created_at: string
}

interface MessagesTabProps {
  messages: MessageItem[]
  selectedMessages: string[]
  loading: boolean
  onRefresh: () => void
  onBulkDelete: () => void
  onToggleSelection: (messageId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onMarkAsRead: (messageId: string) => void
}

export default function MessagesTab({
  messages,
  selectedMessages,
  loading,
  onRefresh,
  onBulkDelete,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onMarkAsRead
}: MessagesTabProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Messages</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full sm:w-auto bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
          </svg>
          <p>No messages found</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-300">{messages.length} messages</span>
              {selectedMessages.length > 0 && (
                <span className="text-purple-400">{selectedMessages.length} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedMessages.length > 0 && (
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
            <div className="text-center py-8 text-slate-400">Loading messages...</div>
          ) : (
            <div className="space-y-3">
              {messages.map((item: MessageItem) => (
                <div
                  key={item.id}
                  onClick={() => onMarkAsRead(item.id)}
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors cursor-pointer ${
                    selectedMessages.includes(item.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : item.isRead 
                      ? 'border-slate-600 hover:border-slate-500'
                      : 'border-blue-500 bg-blue-900/20 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(item.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        onToggleSelection(item.id)
                      }}
                      className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`font-medium ${item.isRead ? 'text-gray-300' : 'text-white'}`}>
                          {item.name}
                        </h4>
                        {!item.isRead && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">New</span>
                        )}
                      </div>
                      <p className={`mb-2 ${item.isRead ? 'text-gray-400' : 'text-white'}`}>{item.message}</p>
                      <div className="text-sm text-slate-400 space-y-1">
                        <p>From: {item.email}</p>
                        <p>IP: {item.ipAddress} ({item.country}, {item.city})</p>
                        <p>Device: {item.platform} • {item.screenResolution} • {item.timezone}</p>
                        <p>Received: {new Date(item.created_at).toLocaleString()}</p>
                      </div>
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
