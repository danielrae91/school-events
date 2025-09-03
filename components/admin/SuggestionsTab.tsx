'use client'

interface Suggestion {
  id: string
  title: string
  description?: string
  location?: string
  start_date: string
  start_time?: string
  end_date?: string
  end_time?: string
  created_at: string
}

interface SuggestionsTabProps {
  suggestions: Suggestion[]
  loading: boolean
  adminToken: string
  onRefresh: () => void
  onEditSuggestion: (suggestionId: string) => void
  onApproveSuggestion: (suggestionId: string) => void
  onRejectSuggestion: (suggestionId: string) => void
}

export default function SuggestionsTab({
  suggestions,
  loading,
  adminToken,
  onRefresh,
  onEditSuggestion,
  onApproveSuggestion,
  onRejectSuggestion
}: SuggestionsTabProps) {
  const handleApprove = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          suggestionId
        })
      })
      if (response.ok) {
        onApproveSuggestion(suggestionId)
      }
    } catch (err) {
      console.error('Failed to approve suggestion:', err)
    }
  }

  const handleReject = async (suggestionId: string) => {
    if (!confirm('Are you sure you want to reject this suggestion?')) return
    
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          suggestionId
        })
      })
      if (response.ok) {
        onRejectSuggestion(suggestionId)
      }
    } catch (err) {
      console.error('Failed to reject suggestion:', err)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Event Suggestions</h2>
        <button
          onClick={onRefresh}
          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>No suggestions found</p>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <span className="text-slate-300">{suggestions.length} suggestions pending review</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading suggestions...</div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">{suggestion.title}</h3>
                      {suggestion.description && (
                        <p className="text-sm text-slate-300 mb-2">{suggestion.description}</p>
                      )}
                      <div className="text-sm text-slate-400">
                        <p>
                          {suggestion.start_date} {suggestion.start_time && `at ${suggestion.start_time}`}
                          {suggestion.end_date && suggestion.end_date !== suggestion.start_date && ` - ${suggestion.end_date}`}
                          {suggestion.end_time && ` ${suggestion.end_time}`}
                        </p>
                        {suggestion.location && <p>📍 {suggestion.location}</p>}
                        <p className="mt-1 text-xs">Submitted: {new Date(suggestion.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditSuggestion(suggestion.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit & Approve
                    </button>
                    <button
                      onClick={() => handleApprove(suggestion.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(suggestion.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Reject
                    </button>
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
