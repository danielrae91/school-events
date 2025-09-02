'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StoredEvent } from '@/lib/types'
import AddEventModal from '@/components/AddEventModal'
import SuggestEventModal from '@/components/SuggestEventModal'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showSuggestEventModal, setShowSuggestEventModal] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const [eventsResponse, updateResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/last-update')
      ])
      
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events')
      }
      
      const eventsData = await eventsResponse.json()
      setEvents(eventsData.events || [])
      
      if (updateResponse.ok) {
        const updateData = await updateResponse.json()
        setLastUpdate(updateData.formatted)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatEventDuration = (event: StoredEvent) => {
    const startDate = formatDate(event.start_date)
    const endDate = event.end_date && event.end_date !== event.start_date 
      ? formatDate(event.end_date) 
      : null
    
    let timeStr = ''
    if (event.start_time) {
      timeStr = formatTime(event.start_time)
      if (event.end_time && event.end_time !== event.start_time) {
        timeStr += ` - ${formatTime(event.end_time)}`
      }
    }

    if (endDate) {
      return `${startDate} - ${endDate}${timeStr ? ` (${timeStr})` : ''}`
    } else {
      return `${startDate}${timeStr ? ` at ${timeStr}` : ''}`
    }
  }

  const getDaysUntilEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    eventDate.setHours(0, 0, 0, 0)
    
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 0) return `In ${diffDays} days`
    return 'Past'
  }

  const isMultiDayEvent = (event: StoredEvent) => {
    return event.end_date && event.end_date !== event.start_date
  }

  const getCalendarUrl = () => {
    return `${window.location.origin}/calendar.ics`
  }

  const handleGoogleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    const googleUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarUrl)}`
    window.open(googleUrl, '_blank')
  }

  const handleAppleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    window.open(calendarUrl, '_blank')
  }

  const handleOutlookCalendar = () => {
    const calendarUrl = getCalendarUrl()
    const outlookUrl = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(calendarUrl)}`
    window.open(outlookUrl, '_blank')
  }

  // Get upcoming events (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_date)
    return eventDate >= today && eventDate <= nextWeek
  }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  // Calendar state and functions
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Generate calendar days
  const monthCalendar = []
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const dateStr = date.toISOString().split('T')[0]
    // Include events that start on this day OR span across this day
    const dayEvents = events.filter(event => {
      const eventStart = event.start_date
      const eventEnd = event.end_date || event.start_date
      return dateStr >= eventStart && dateStr <= eventEnd
    })
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
    const isToday = dateStr === today.toISOString().split('T')[0]

    monthCalendar.push({
      date,
      dateStr,
      events: dayEvents,
      isCurrentMonth,
      isToday
    })
  }

  const getEventEmoji = (title: string) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('sport') || titleLower.includes('game') || titleLower.includes('match')) return '⚽'
    if (titleLower.includes('assembly') || titleLower.includes('meeting')) return '🏛️'
    if (titleLower.includes('concert') || titleLower.includes('music') || titleLower.includes('band')) return '🎵'
    if (titleLower.includes('art') || titleLower.includes('exhibition') || titleLower.includes('display')) return '🎨'
    if (titleLower.includes('trip') || titleLower.includes('excursion') || titleLower.includes('visit')) return '🚌'
    if (titleLower.includes('fundrais') || titleLower.includes('charity') || titleLower.includes('donation')) return '💝'
    if (titleLower.includes('graduation') || titleLower.includes('ceremony')) return '🎓'
    if (titleLower.includes('holiday') || titleLower.includes('break') || titleLower.includes('closure')) return '🏖️'
    if (titleLower.includes('parent') || titleLower.includes('family')) return '👨‍👩‍👧‍👦'
    if (titleLower.includes('book') || titleLower.includes('reading') || titleLower.includes('library')) return '📚'
    if (titleLower.includes('science') || titleLower.includes('experiment')) return '🔬'
    if (titleLower.includes('drama') || titleLower.includes('play') || titleLower.includes('theatre')) return '🎭'
    if (titleLower.includes('dance') || titleLower.includes('dancing')) return '💃'
    if (titleLower.includes('swimming') || titleLower.includes('pool')) return '🏊'
    if (titleLower.includes('mufti') || titleLower.includes('casual') || titleLower.includes('dress up')) return '👕'
    if (titleLower.includes('lunch') || titleLower.includes('food') || titleLower.includes('sausage')) return '🍽️'
    return '📅'
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Te Kura O Take Kārara
          </h1>
          <p className="text-gray-400">School Events</p>
          {lastUpdate && (
            <p className="text-gray-500 text-sm mt-2">
              Last updated: {lastUpdate}
            </p>
          )}
        </div>


        {/* Upcoming Events */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 text-center">
              <p className="text-blue-300">No upcoming events in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-slate-700 border border-slate-600 rounded-xl p-4 cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-600 rounded-lg flex items-center justify-center text-sm sm:text-lg flex-shrink-0">
                        {getEventEmoji(event.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm sm:text-base leading-tight mb-2 line-clamp-2">{event.title}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-400">
                          <span className="text-purple-400 font-medium">
                            {(() => {
                              const today = new Date()
                              const eventDate = new Date(event.start_date)
                              const diffTime = eventDate.getTime() - today.getTime()
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                              
                              if (diffDays === 0) return 'Today'
                              if (diffDays === 1) return 'Tomorrow'
                              if (diffDays > 1) return `In ${diffDays} days`
                              return 'Past'
                            })()}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatDate(event.start_date)} {event.start_time && `at ${event.start_time}`}</span>
                        </div>
                        {isMultiDayEvent(event) && (
                          <span className="inline-block bg-orange-400 text-orange-900 text-xs px-2 py-0.5 rounded-full mt-1">
                            Multi-day
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {event.location && (
                          <p className="text-gray-400 text-xs flex items-center gap-1 truncate">
                            📍 <span className="truncate">{event.location}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                          const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                          const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`
                          window.open(googleUrl, '_blank')
                        }}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors border border-slate-500 flex-shrink-0"
                        title="Add to Calendar"
                      >
                        Add to Calendar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Subscription Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 mb-6">
          <h2 className="text-sm font-medium mb-3 text-center text-gray-300">📅 Subscribe to Calendar</h2>
          <div className="flex flex-wrap justify-center gap-1">
            <button
              onClick={() => {
                const calendarUrl = getCalendarUrl()
                const googleUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarUrl)}`
                window.open(googleUrl, '_blank')
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              Add to Google
            </button>
            
            <button
              onClick={() => {
                const calendarUrl = getCalendarUrl()
                window.open(calendarUrl, '_blank')
              }}
              className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              Other Apps
            </button>
            
            <button
              onClick={() => {
                const calendarUrl = getCalendarUrl()
                navigator.clipboard.writeText(calendarUrl)
                alert('Calendar URL copied!')
              }}
              className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              Copy URL
            </button>
          </div>
        </div>

        {/* Suggest Event Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-8 text-center">
          <button
            onClick={() => setShowSuggestEventModal(true)}
            className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Suggest Event
          </button>
        </div>


        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-purple-600 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getEventEmoji(selectedEvent.title)}</span>
                    <h2 className="text-lg font-bold text-white">{selectedEvent.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-white hover:text-gray-300 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">When</p>
                    <p className="text-white">{formatEventDuration(selectedEvent)}</p>
                    <p className="text-purple-400 text-sm font-medium">{getDaysUntilEvent(selectedEvent.start_date)}</p>
                  </div>
                  
                  {selectedEvent.location && (
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="text-white">{selectedEvent.location}</p>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div>
                      <p className="text-gray-400 text-sm">Description</p>
                      <p className="text-gray-200 text-sm">{selectedEvent.description}</p>
                    </div>
                  )}

                  {isMultiDayEvent(selectedEvent) && (
                    <div className="bg-orange-900/30 border border-orange-600 rounded-lg p-3">
                      <p className="text-orange-300 text-sm font-medium">📅 Multi-day Event</p>
                      <p className="text-orange-200 text-xs">This event spans multiple days</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-700 pt-4">
                  <button
                    onClick={() => {
                      const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                      const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(selectedEvent.description || '')}&location=${encodeURIComponent(selectedEvent.location || '')}`
                      window.open(googleUrl, '_blank')
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Event Modal */}
        {showAddEventModal && (
          <AddEventModal 
            onClose={() => setShowAddEventModal(false)}
            onEventAdded={fetchEvents}
          />
        )}

        {/* Suggest Event Modal */}
        {showSuggestEventModal && (
          <SuggestEventModal 
            onClose={() => setShowSuggestEventModal(false)}
            onEventSuggested={() => {
              // Could show a success message here
              console.log('Event suggestion submitted')
            }}
          />
        )}
      </div>
    </div>
  )
}
