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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Events Management</h2>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onAddEvent}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Event
          </button>
        </div>
      </div>

      {events.length === 0 ? (
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

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading events...</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`bg-slate-700 rounded-lg p-4 border transition-colors ${
                    selectedEvents.includes(event.id)
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={() => onToggleSelection(event.id)}
                        className="rounded border-slate-500 bg-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <h3 className="font-medium text-white">{event.title}</h3>
                        <p className="text-sm text-slate-400">
                          {event.start_date} {event.start_time && `at ${event.start_time}`}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditEvent(event)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
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
