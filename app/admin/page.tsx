'use client'

import { useState, useEffect } from 'react'
import { StoredEvent, Event } from '@/lib/types'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [suggestions, setSuggestions] = useState<StoredEvent[]>([])
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [editingEvent, setEditingEvent] = useState<StoredEvent | null>(null)
  const [editingSuggestion, setEditingSuggestion] = useState<StoredEvent | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [debugEmailData, setDebugEmailData] = useState<any>(null)
  const [adminToken, setAdminToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [gptPrompt, setGptPrompt] = useState('')
  const [feedback, setFeedback] = useState<any[]>([])

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setAdminToken(token)
      setIsAuthenticated(true)
      // Pass token directly to avoid state timing issues
      fetchEventsWithToken(token)
      fetchSuggestionsWithToken(token)
      fetchSettingsWithToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  // Logs functionality removed

  const fetchSuggestionsWithToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/suggestions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
    }
  }

  // Logs functionality removed

  const fetchSettings = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setGptPrompt(data.gptPrompt || '')
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const fetchSettingsWithToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setGptPrompt(data.gptPrompt || '')
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ gptPrompt })
      })
      if (response.ok) {
        alert('Settings saved successfully!')
      }
    } catch (err) {
      setError('Failed to save settings')
    }
  }

  const retryFailedEmail = async (logId: string) => {
    try {
      const response = await fetch('/api/admin/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ logId })
      })
      if (response.ok) {
        // Logs removed
        fetchEvents()
        alert('Email processing retried successfully!')
      }
    } catch (err) {
      setError('Failed to retry email processing')
    }
  }

  const deleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/logs/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        // Logs removed
        alert('Log deleted successfully!')
      }
    } catch (err) {
      setError('Failed to delete log')
    }
  }

  const debugRedisData = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/debug', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      console.log('Redis Debug Data:', data)
      alert(`Redis Debug: ${data.totalEventKeys} event keys found. Check console for details.`)
    } catch (err) {
      setError('Failed to debug Redis data')
    }
  }

  const cleanupRedis = async () => {
    if (!confirm('This will remove orphaned entries from Redis. Continue?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        alert(`Cleanup complete: ${data.orphanedEntriesRemoved} orphaned entries removed`)
        fetchEvents()
      }
    } catch (err) {
      setError('Failed to cleanup Redis data')
    }
  }

  const dedupeEvents = async () => {
    if (!confirm('This will remove duplicate events with same title and date. Continue?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/dedupe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        alert(`Deduplication complete: ${data.duplicatesRemoved} duplicate events removed from ${data.duplicateGroups} groups`)
        fetchEvents()
      }
    } catch (err) {
      setError('Failed to deduplicate events')
    }
  }

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents)
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId)
    } else {
      newSelection.add(eventId)
    }
    setSelectedEvents(newSelection)
  }

  const selectAllEvents = () => {
    setSelectedEvents(new Set(events.map(e => e.id)))
  }

  const clearSelection = () => {
    setSelectedEvents(new Set())
  }

  const bulkDeleteEvents = async () => {
    if (selectedEvents.size === 0) return
    if (!confirm(`Delete ${selectedEvents.size} selected events?`)) return

    try {
      const token = localStorage.getItem('admin_token')
      const deletePromises = Array.from(selectedEvents).map(eventId =>
        fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      )
      
      await Promise.all(deletePromises)
      setSelectedEvents(new Set())
      fetchEvents()
      alert(`${selectedEvents.size} events deleted successfully`)
    } catch (err) {
      setError('Failed to delete selected events')
    }
  }

  const handleLogin = () => {
    if (adminToken) {
      localStorage.setItem('admin_token', adminToken)
      setIsAuthenticated(true)
      fetchEvents()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setAdminToken('')
    setEvents([])
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchEventsWithToken = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/events', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      setEvents(events.filter(e => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  const handleSaveEvent = async (eventData: Partial<Event>, isNew: boolean = false) => {
    try {
      const url = isNew ? '/api/events' : `/api/events/${editingEvent?.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error('Failed to save event')
      }

      const data = await response.json()
      
      if (isNew) {
        setEvents([...events, data.event])
      } else {
        setEvents(events.map(e => e.id === editingEvent?.id ? data.event : e))
      }

      setEditingEvent(null)
      setShowAddForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Access
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter admin token to manage events
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Admin Token"
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Access Admin Panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'events' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Events ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'suggestions' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Suggestions ({suggestions.length})
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'messages' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'settings' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'suggestions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Event Suggestions</h2>
                <button
                  onClick={() => fetchSuggestionsWithToken(adminToken)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Refresh
                </button>
              </div>

              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending suggestions
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{suggestion.title}</h3>
                          <p className="text-sm text-gray-600">
                            Suggested on {new Date(suggestion.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                          Suggestion
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <strong>Date:</strong> {suggestion.start_date}
                          {suggestion.start_time && ` at ${suggestion.start_time}`}
                        </div>
                        {suggestion.location && (
                          <div>
                            <strong>Location:</strong> {suggestion.location}
                          </div>
                        )}
                      </div>
                      
                      {suggestion.description && (
                        <div className="mb-3">
                          <strong>Description:</strong>
                          <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSuggestion(suggestion)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit & Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Approve this suggestion as-is and create event?')) {
                              try {
                                const response = await fetch('/api/admin/suggestions', {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${adminToken}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    action: 'approve',
                                    suggestionId: suggestion.id,
                                    eventData: suggestion
                                  })
                                })
                                if (response.ok) {
                                  await fetchSuggestionsWithToken(adminToken)
                                  await fetchEventsWithToken(adminToken)
                                  alert('Suggestion approved and event created!')
                                } else {
                                  const error = await response.json()
                                  alert(`Failed to approve suggestion: ${error.error}`)
                                }
                              } catch (err) {
                                console.error('Failed to approve suggestion:', err)
                              }
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Reject this suggestion?')) {
                              try {
                                const response = await fetch('/api/admin/suggestions', {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${adminToken}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    action: 'reject',
                                    suggestionId: suggestion.id
                                  })
                                })
                                if (response.ok) {
                                  fetchSuggestionsWithToken(adminToken)
                                }
                              } catch (err) {
                                console.error('Failed to reject suggestion:', err)
                              }
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
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

          {/* Edit Suggestion Modal */}
          {editingSuggestion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-medium mb-4">Edit Suggestion Before Approval</h3>
                {(() => {
                  const suggestion = editingSuggestion
                  if (!suggestion) return null
                  
                  return (
                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      const formData = new FormData(e.target as HTMLFormElement)
                      const editedData = {
                        title: formData.get('title'),
                        description: formData.get('description'),
                        location: formData.get('location'),
                        start_date: formData.get('start_date'),
                        start_time: formData.get('start_time'),
                        end_date: formData.get('end_date'),
                        end_time: formData.get('end_time')
                      }
                      
                      try {
                        const response = await fetch('/api/admin/suggestions', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            action: 'approve',
                            suggestionId: suggestion.id,
                            eventData: editedData
                          })
                        })
                        if (response.ok) {
                          setEditingSuggestion(null)
                          await fetchSuggestionsWithToken(adminToken)
                          await fetchEventsWithToken(adminToken)
                          alert('Suggestion approved and event created!')
                        } else {
                          const error = await response.json()
                          alert(`Failed to approve suggestion: ${error.error}`)
                        }
                      } catch (err) {
                        console.error('Failed to approve edited suggestion:', err)
                      }
                    }}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            name="title"
                            type="text"
                            defaultValue={suggestion.title}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            name="description"
                            defaultValue={suggestion.description || ''}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            name="location"
                            type="text"
                            defaultValue={suggestion.location || ''}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              name="start_date"
                              type="date"
                              defaultValue={suggestion.start_date}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              name="start_time"
                              type="time"
                              defaultValue={suggestion.start_time || ''}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              name="end_date"
                              type="date"
                              defaultValue={suggestion.end_date || ''}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              name="end_time"
                              type="time"
                              defaultValue={suggestion.end_time || ''}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                        >
                          Approve & Create Event
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSuggestion(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )
                })()}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Events</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Add Event
                  </button>
                  <button
                    onClick={fetchEvents}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/debug-email', {
                          headers: { 'Authorization': `Bearer ${adminToken}` }
                        })
                        const data = await response.json()
                        console.log('Email Debug Data:', data)
                        alert(`Email Debug:\n- Recent logs: ${data.totalLogKeys}\n- GPT prompt exists: ${data.gptPromptExists}\n- OpenAI key exists: ${data.openaiKeyExists}\nCheck console for details.`)
                      } catch (err) {
                        console.error('Debug failed:', err)
                        alert('Debug failed - check console')
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Debug Email
                  </button>
                </div>
              </div>
              
              {events.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        Total Events: {events.length}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        Needs Enrichment: {events.filter(e => e.needs_enrichment).length}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        User Suggested: {events.filter(e => e.source === 'suggestion').length}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        Email Generated: {events.filter(e => e.source !== 'suggestion').length}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={selectAllEvents}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded"
                      >
                        Clear
                      </button>
                      {selectedEvents.size > 0 && (
                        <button
                          onClick={bulkDeleteEvents}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          Delete Selected ({selectedEvents.size})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading events...</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {events.length === 0 ? (
                      <li className="px-6 py-8 text-center text-gray-500">
                        No events found. Add some events to get started.
                      </li>
                    ) : (
                      events.map((event) => (
                        <EventListItem
                          key={event.id}
                          event={event}
                          onEdit={setEditingEvent}
                          onDelete={handleDeleteEvent}
                          isSelected={selectedEvents.has(event.id)}
                          onToggleSelect={() => toggleEventSelection(event.id)}
                        />
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Logs section removed */}
          {false && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Email Processing Logs</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => {}}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={debugRedisData}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Debug Redis
                  </button>
                  <button
                    onClick={cleanupRedis}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    Cleanup Redis
                  </button>
                  <button
                    onClick={dedupeEvents}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Remove Duplicates
                  </button>
                </div>
              </div>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {[].length === 0 ? (
                    <li className="px-6 py-8 text-center text-gray-500">
                      No email processing logs found.
                    </li>
                  ) : (
                    [].map((log: any, index: number) => (
                      <li key={index} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'error' ? 'bg-red-100 text-red-800' :
                                log.status === 'processing_gpt' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'processing_events' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {log.status === 'processing_gpt' ? 'GPT Processing' :
                                 log.status === 'processing_events' ? 'Storing Events' :
                                 log.status}
                              </span>
                              <h3 className="ml-3 text-sm font-medium text-gray-900">{log.subject}</h3>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              <p>From: {log.from}</p>
                              <p>Received: {new Date(log.timestamp).toLocaleString()}</p>
                              {log.error && (
                                <div className="mt-2 p-2 bg-red-50 rounded border">
                                  <p className="text-red-600 font-medium">Error: {log.error}</p>
                                  {log.errorDetails && (
                                    <details>
                                      <summary className="text-red-500 cursor-pointer text-xs">Stack trace</summary>
                                      <pre className="text-xs text-red-400 mt-1 whitespace-pre-wrap">{log.errorDetails}</pre>
                                    </details>
                                  )}
                                </div>
                              )}
                              {log.eventsProcessed && <p>Events processed: {log.eventsProcessed}</p>}
                              {log.eventsExtracted && <p>Events extracted by GPT: {log.eventsExtracted}</p>}
                              {log.processingStarted && <p>Processing started: {new Date(log.processingStarted).toLocaleString()}</p>}
                              {log.gptCompleted && <p>GPT completed: {new Date(log.gptCompleted).toLocaleString()}</p>}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {(log.status === 'error' || log.status === 'processing' || log.status === 'processing_gpt' || log.status === 'processing_events') && (
                              <button
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Retry
                              </button>
                            )}
                            <button
                              onClick={() => deleteLog(log.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">User Feedback</h2>
              </div>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-6 py-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    Feedback and messages from users will appear here.
                  </p>
                </div>
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No feedback yet</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
              
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">GPT Event Extraction Prompt</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Customize the prompt used to extract events from newsletter emails.</p>
                  </div>
                  <div className="mt-5">
                    <textarea
                      value={gptPrompt}
                      onChange={(e) => setGptPrompt(e.target.value)}
                      rows={10}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                      placeholder="Enter the GPT prompt for event extraction..."
                    />
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={saveSettings}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Save Prompt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {(editingEvent || showAddForm) && (
            <EventForm
              event={editingEvent}
              onSave={handleSaveEvent}
              onCancel={() => {
                setEditingEvent(null)
                setShowAddForm(false)
              }}
              isNew={showAddForm}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function EventListItem({ 
  event, 
  onEdit, 
  onDelete,
  isSelected,
  onToggleSelect
}: { 
  event: StoredEvent
  onEdit: (event: StoredEvent) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        {onToggleSelect && (
          <div className="mr-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
            {event.needs_enrichment && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Needs Enrichment
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            <p>{event.description}</p>
            <div className="mt-2 flex space-x-4">
              <span>📅 {event.start_date}{event.end_date && event.end_date !== event.start_date ? ` - ${event.end_date}` : ''}</span>
              {event.start_time && <span>🕐 {event.start_time}{event.end_time && event.end_time !== event.start_time ? ` - ${event.end_time}` : ''}</span>}
              {event.location && <span>📍 {event.location}</span>}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(event)}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

function EventForm({ 
  event, 
  onSave, 
  onCancel, 
  isNew 
}: { 
  event: StoredEvent | null
  onSave: (data: Partial<Event>, isNew: boolean) => void
  onCancel: () => void
  isNew: boolean
}) {
  const [formData, setFormData] = useState<Partial<Event>>({
    title: event?.title || '',
    description: event?.description || '',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    start_time: event?.start_time || '',
    end_time: event?.end_time || '',
    location: event?.location || '',
    needs_enrichment: event?.needs_enrichment || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData, isNew)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isNew ? 'Add New Event' : 'Edit Event'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={formData.start_time || ''}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.needs_enrichment}
              onChange={(e) => setFormData({...formData, needs_enrichment: e.target.checked})}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Needs enrichment
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {isNew ? 'Add Event' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
