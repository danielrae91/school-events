'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StoredEvent } from '@/lib/types'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const getCalendarUrl = () => {
    return `${window.location.origin}/calendar`
  }

  const handleGoogleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    window.open(`https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(calendarUrl)}`, '_blank')
  }

  const handleAppleCalendar = () => {
    const calendarUrl = getCalendarUrl().replace('https://', 'webcal://')
    window.location.href = calendarUrl
  }

  const handleOutlookCalendar = () => {
    const calendarUrl = encodeURIComponent(getCalendarUrl())
    window.open(`https://outlook.live.com/calendar/0/addcalendar?url=${calendarUrl}`, '_blank')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = new Date()
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate >= today && eventDate <= sevenDaysFromNow
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  // Generate full month calendar
  const generateMonthCalendar = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday
    
    const days = []
    const current = new Date(startDate)
    
    // Generate 6 weeks (42 days) to cover full month
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0]
      const dayEvents = events.filter(event => event.start_date === dateStr)
      const isCurrentMonth = current.getMonth() === month
      const isToday = dateStr === today.toISOString().split('T')[0]
      
      days.push({ 
        date: new Date(current), 
        dateStr, 
        events: dayEvents,
        isCurrentMonth,
        isToday
      })
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const monthCalendar = generateMonthCalendar(currentMonth)
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const getEventEmoji = (title: string) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('sport') || titleLower.includes('game') || titleLower.includes('match')) return '⚽'
    if (titleLower.includes('assembly') || titleLower.includes('meeting')) return '🎤'
    if (titleLower.includes('concert') || titleLower.includes('music') || titleLower.includes('performance')) return '🎵'
    if (titleLower.includes('exam') || titleLower.includes('test') || titleLower.includes('assessment')) return '📝'
    if (titleLower.includes('holiday') || titleLower.includes('break') || titleLower.includes('closure')) return '🏖️'
    if (titleLower.includes('fundraiser') || titleLower.includes('fair') || titleLower.includes('market')) return '🎪'
    if (titleLower.includes('graduation') || titleLower.includes('ceremony')) return '🎓'
    if (titleLower.includes('trip') || titleLower.includes('excursion') || titleLower.includes('visit')) return '🚌'
    if (titleLower.includes('workshop') || titleLower.includes('training')) return '🛠️'
    if (titleLower.includes('parent') || titleLower.includes('family')) return '👨‍👩‍👧‍👦'
    if (titleLower.includes('photo') || titleLower.includes('picture')) return '📸'
    if (titleLower.includes('book') || titleLower.includes('reading') || titleLower.includes('library')) return '📚'
    if (titleLower.includes('art') || titleLower.includes('craft') || titleLower.includes('creative')) return '🎨'
    if (titleLower.includes('science') || titleLower.includes('experiment')) return '🔬'
    if (titleLower.includes('drama') || titleLower.includes('play') || titleLower.includes('theatre')) return '🎭'
    if (titleLower.includes('dance') || titleLower.includes('dancing')) return '💃'
    if (titleLower.includes('swimming') || titleLower.includes('pool')) return '🏊'
    if (titleLower.includes('mufti') || titleLower.includes('casual') || titleLower.includes('dress up')) return '👕'
    if (titleLower.includes('lunch') || titleLower.includes('food') || titleLower.includes('sausage')) return '🍽️'
    return '📅'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black text-gray-900 mb-6 tracking-tight">
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Te Kura O Take Kārara
            </span>
            <span className="block text-3xl text-gray-700 font-semibold mt-2">Upcoming Events</span>
          </h1>
        </div>

        {/* Full Calendar */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h2 className="text-3xl font-bold text-white">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              
              <button
                onClick={nextMonth}
                className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-3">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {monthCalendar.map(({ date, dateStr, events, isCurrentMonth, isToday }) => (
                <div 
                  key={dateStr}
                  className={`
                    min-h-[100px] p-2 border transition-all duration-200 cursor-pointer
                    ${isCurrentMonth ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-50 border-gray-100 text-gray-400'}
                    ${isToday ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                    ${events.length > 0 ? 'hover:shadow-md' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday ? 'text-indigo-900' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map((event) => (
                      <div 
                        key={event.id}
                        className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md px-2 py-1 truncate font-medium cursor-pointer hover:from-indigo-600 hover:to-purple-600"
                        title={event.title}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {getEventEmoji(event.title)} {event.title}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
            <h2 className="text-3xl font-bold text-white">Next 7 Days</h2>
            <p className="text-emerald-100 mt-2">
              {loading ? 'Loading events...' : `${upcomingEvents.length} upcoming events`}
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
                <p className="mt-6 text-gray-600 text-xl font-medium">Loading events...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-8xl mb-6 block">🌅</span>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">All caught up!</h3>
                <p className="text-gray-600 text-lg">No events in the next 7 days. Enjoy the break!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingEvents.map((event: StoredEvent, index: number) => (
                  <div 
                    key={event.id}
                    className="bg-gradient-to-r from-white via-gray-50 to-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:border-indigo-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-3xl">
                            {getEventEmoji(event.title)}
                          </span>
                          <h3 
                            className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.title}
                          </h3>
                          {event.needs_enrichment && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              📰 More information found in Hero
                            </span>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-gray-700 mb-6 leading-relaxed text-lg">{event.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center space-x-3 bg-blue-100 px-4 py-3 rounded-xl border border-blue-200">
                            <span className="text-blue-600 text-lg">📅</span>
                            <span className="font-semibold text-blue-900">
                              {formatDate(event.start_date)}
                              {event.end_date && event.end_date !== event.start_date && 
                                ` - ${formatDate(event.end_date)}`
                              }
                            </span>
                          </div>
                          
                          {event.start_time && (
                            <div className="flex items-center space-x-3 bg-green-100 px-4 py-3 rounded-xl border border-green-200">
                              <span className="text-green-600 text-lg">🕐</span>
                              <span className="font-semibold text-green-900">
                                {formatTime(event.start_time)}
                                {event.end_time && ` - ${formatTime(event.end_time)}`}
                              </span>
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center space-x-3 bg-purple-100 px-4 py-3 rounded-xl border border-purple-200">
                              <span className="text-purple-600 text-lg">📍</span>
                              <span className="font-semibold text-purple-900">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Subscription */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={handleGoogleCalendar}
              className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span className="text-2xl">📊</span>
              <span>Add to Google Calendar</span>
            </button>
            
            <button
              onClick={handleAppleCalendar}
              className="flex items-center justify-center space-x-3 bg-gray-800 hover:bg-gray-900 text-white px-8 py-6 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span className="text-2xl">🍎</span>
              <span>Add to Apple Calendar</span>
            </button>
            
            <button
              onClick={handleOutlookCalendar}
              className="flex items-center justify-center space-x-3 bg-blue-700 hover:bg-blue-800 text-white px-8 py-6 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span className="text-2xl">📧</span>
              <span>Add to Outlook</span>
            </button>
          </div>

          <div className="border-t pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Manual Subscription</h3>
            <div className="flex items-center space-x-4">
              <code className="flex-1 bg-gray-100 px-6 py-4 rounded-xl text-sm font-mono border">
                {typeof window !== 'undefined' ? getCalendarUrl() : '/calendar'}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(getCalendarUrl())}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-semibold whitespace-nowrap shadow-lg"
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Made by a TK Parent
          </p>
        </div>

        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{getEventEmoji(selectedEvent.title)}</span>
                    <h2 className="text-3xl font-bold text-white">{selectedEvent.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-8">
                {selectedEvent.needs_enrichment && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-amber-600 text-xl">📰</span>
                      <p className="text-amber-800 font-medium">
                        More information found in Hero newsletter
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed text-lg bg-gray-50 p-4 rounded-xl">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-blue-600 text-xl">📅</span>
                        <h4 className="font-semibold text-blue-900">Date</h4>
                      </div>
                      <p className="text-blue-800 font-medium">
                        {formatDate(selectedEvent.start_date)}
                        {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && 
                          ` - ${formatDate(selectedEvent.end_date)}`
                        }
                      </p>
                    </div>
                    
                    {selectedEvent.start_time && (
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-green-600 text-xl">🕐</span>
                          <h4 className="font-semibold text-green-900">Time</h4>
                        </div>
                        <p className="text-green-800 font-medium">
                          {formatTime(selectedEvent.start_time)}
                          {selectedEvent.end_time && ` - ${formatTime(selectedEvent.end_time)}`}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {selectedEvent.location && (
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-purple-600 text-xl">📍</span>
                          <h4 className="font-semibold text-purple-900">Location</h4>
                        </div>
                        <p className="text-purple-800 font-medium">{selectedEvent.location}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-gray-600 text-xl">🆔</span>
                        <h4 className="font-semibold text-gray-900">Event ID</h4>
                      </div>
                      <p className="text-gray-700 font-mono text-sm">{selectedEvent.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
