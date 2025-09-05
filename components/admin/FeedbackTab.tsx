'use client'

import { toast } from 'sonner'

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
            <h3 className="text-white font-semibold">Delete Selected Messages</h3>
            <p className="text-slate-300 text-sm">Are you sure you want to delete {selectedMessages.length} selected messages?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onBulkDelete()
              toast.dismiss(t)
              toast.success(`${selectedMessages.length} messages deleted successfully`)
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Messages</h2>
                <p className="text-slate-400 text-sm">User feedback and contact messages</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
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
            <p className="text-slate-300 font-medium">Loading messages...</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-slate-700/50 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Messages Found</h3>
            <p className="text-slate-400">No user messages or feedback received yet</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          {/* Stats and Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-slate-300 font-medium">{messages.length} messages</span>
              </div>
              {selectedMessages.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-purple-400 font-medium">{selectedMessages.length} selected</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">{messages.filter(m => !m.isRead).length} unread</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMessages.length > 0 && (
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

          {/* Messages Grid */}
          <div className="space-y-4">
            {messages.map((item: MessageItem) => (
              <div
                key={item.id}
                className={`relative group transition-all duration-300 cursor-pointer ${
                  selectedMessages.includes(item.id)
                    ? 'scale-[1.02]'
                    : 'hover:scale-[1.01]'
                }`}
                onClick={() => onMarkAsRead(item.id)}
              >
                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  selectedMessages.includes(item.id)
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-sm'
                    : !item.isRead
                    ? 'bg-gradient-to-r from-green-600/20 to-blue-600/20 blur-sm group-hover:from-green-500/30 group-hover:to-blue-500/30'
                    : 'bg-gradient-to-r from-slate-600/10 to-slate-700/10 blur-sm group-hover:from-slate-500/20 group-hover:to-slate-600/20'
                }`}></div>
                <div className={`relative bg-slate-800/60 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 ${
                  selectedMessages.includes(item.id)
                    ? 'border-purple-500/50 shadow-xl shadow-purple-500/10'
                    : !item.isRead
                    ? 'border-green-500/50 shadow-xl shadow-green-500/10'
                    : 'border-slate-700/50 group-hover:border-slate-600/50 shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          onToggleSelection(item.id)
                        }}
                        className="w-5 h-5 rounded-lg border-2 border-slate-500 bg-slate-700 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 transition-all duration-200"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className={`text-lg font-bold ${item.isRead ? 'text-slate-300' : 'text-white'} group-hover:text-purple-300 transition-colors`}>
                            {item.name}
                          </h4>
                          {!item.isRead && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/50 animate-pulse">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className={`text-base leading-relaxed ${item.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                          {item.message}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">Email:</span>
                            <span className="truncate">{item.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">Location:</span>
                            <span>{item.city}, {item.country}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">IP:</span>
                            <span>{item.ipAddress}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">Device:</span>
                            <span className="truncate">{item.platform}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            <span className="font-medium">Screen:</span>
                            <span>{item.screenResolution}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Timezone:</span>
                            <span>{item.timezone}</span>
                          </div>
                        </div>
                      </div>
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
