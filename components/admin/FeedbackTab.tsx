'use client'

interface FeedbackItem {
  id: string
  message: string
  email?: string
  created_at: string
}

interface FeedbackTabProps {
  feedback: FeedbackItem[]
  selectedFeedback: string[]
  loading: boolean
  onRefresh: () => void
  onBulkDelete: () => void
  onToggleSelection: (feedbackId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
}

export default function FeedbackTab({
  feedback,
  selectedFeedback,
  loading,
  onRefresh,
  onBulkDelete,
  onToggleSelection,
  onSelectAll,
  onClearSelection
}: FeedbackTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Contact Messages</h2>
        <button
          onClick={onRefresh}
          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading messages...</div>
      ) : feedback.length === 0 ? (
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
              <span className="text-slate-300">{feedback.length} feedback items</span>
              {selectedFeedback.length > 0 && (
                <span className="text-purple-400">{selectedFeedback.length} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedFeedback.length > 0 && (
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
            <div className="text-center py-8 text-slate-400">Loading feedback...</div>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors ${
                    selectedFeedback.includes(item.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFeedback.includes(item.id)}
                      onChange={() => onToggleSelection(item.id)}
                      className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-white mb-2">{item.message}</p>
                      <div className="text-sm text-slate-400">
                        {item.email && <p>From: {item.email}</p>}
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
