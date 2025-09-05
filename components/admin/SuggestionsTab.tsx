'use client'

import { toast } from 'sonner'

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
        toast.success('Suggestion approved successfully')
      } else {
        toast.error('Failed to approve suggestion')
      }
    } catch (err) {
      console.error('Failed to approve suggestion:', err)
      toast.error('Failed to approve suggestion')
    }
  }

  const handleReject = async (suggestionId: string) => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Reject Suggestion</h3>
            <p className="text-sm text-slate-300">Are you sure you want to reject this suggestion?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
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
                  toast.success('Suggestion rejected successfully')
                } else {
                  toast.error('Failed to reject suggestion')
                }
              } catch (err) {
                console.error('Failed to reject suggestion:', err)
                toast.error('Failed to reject suggestion')
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Reject
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Event Suggestions</h2>
                <p className="text-slate-400 text-sm">Review and manage event suggestions from users</p>
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

      {loading ? (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <span className="text-slate-300">Loading suggestions...</span>
          </div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Suggestions Found</h3>
            <p className="text-slate-400">There are no event suggestions pending review at the moment.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-medium">{suggestions.length} suggestions pending review</span>
            </div>
          </div>

          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white text-lg">{suggestion.title}</h3>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-full border border-yellow-500/30">
                        Pending
                      </span>
                    </div>
                    {suggestion.description && (
                      <p className="text-slate-300 mb-3 leading-relaxed">{suggestion.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(suggestion.start_date).toLocaleDateString()} 
                          {suggestion.start_time && ` at ${suggestion.start_time}`}
                          {suggestion.end_date && suggestion.end_date !== suggestion.start_date && ` - ${new Date(suggestion.end_date).toLocaleDateString()}`}
                          {suggestion.end_time && ` ${suggestion.end_time}`}
                        </span>
                      </div>
                      {suggestion.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{suggestion.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Submitted: {new Date(suggestion.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => onEditSuggestion(suggestion.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit & Approve
                  </button>
                  <button
                    onClick={() => handleApprove(suggestion.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(suggestion.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
