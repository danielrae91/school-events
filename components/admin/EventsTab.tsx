'use client'

import { StoredEvent } from '@/lib/types'

interface EventsTabProps {
  events: StoredEvent[]
  selectedEvents: string[]
  loading: boolean
  onRefresh: () => void
  onAddEvent: () => void
  onEditEvent: (event: StoredEvent) => void
  onDeleteEvent: (eventId: string) => void
  onBulkDelete: () => void
  onToggleSelection: (eventId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
}

export default function EventsTab({
  events,
  selectedEvents,
  loading,
  onRefresh,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onBulkDelete,
  onToggleSelection,
  onSelectAll,
  onClearSelection
}: EventsTabProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Events Management</h2>
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
            onClick={onAddEvent}
            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>No events found</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-300">{events.length} events</span>
              {selectedEvents.length > 0 && (
                <span className="text-purple-400">{selectedEvents.length} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedEvents.length > 0 && (
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

            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors cursor-pointer ${
                    selectedEvents.includes(event.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => onToggleSelection(event.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          onToggleSelection(event.id)
                        }}
                        className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{event.title}</h3>
                        <div className="text-sm text-slate-400 space-y-1">
                          <div>
                            <span className="font-medium">Start:</span> {event.start_date} {event.start_time && `at ${event.start_time}`}
                          </div>
                          {event.end_date && (
                            <div>
                              <span className="font-medium">End:</span> {event.end_date} {event.end_time && `at ${event.end_time}`}
                            </div>
                          )}
                          {event.location && (
                            <div>
                              <span className="font-medium">Location:</span> {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div className="mt-2">
                              <span className="font-medium">Description:</span> {event.description}
                            </div>
                          )}
                          {event.requires_more_info && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                                ⚠️ Requires more information
                              </span>
                            </div>
                          )}
                          {event.information_found_in_hero && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                                ℹ️ Information found in hero
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditEvent(event)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteEvent(event.id)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
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
