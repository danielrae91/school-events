'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StoredEvent } from '@/lib/types'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

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
    window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`, '_blank')
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

  const today = new Date()
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  
  const sortedEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate >= today && eventDate <= fourteenDaysFromNow
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  // Generate calendar grid for next 14 days
  const generateCalendarDays = () => {
    const days = []
    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dayEvents = events.filter(event => event.start_date === dateStr)
      days.push({ date, dateStr, events: dayEvents })
    }
    return days
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            <span className="block">Te Kura O Take Kārara</span>
            <span className="block text-indigo-600 text-2xl">Upcoming Events</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Never miss an important school event. View upcoming events and subscribe to our calendar.
          </p>
        </div>

        {/* Quick Subscribe Buttons */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📅 Quick Calendar Subscription
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={handleGoogleCalendar}
              className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-xl">📊</span>
              <span>Add to Google Calendar</span>
            </button>
            
            <button
              onClick={handleAppleCalendar}
              className="flex items-center justify-center space-x-3 bg-gray-800 hover:bg-gray-900 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-xl">🍎</span>
              <span>Add to Apple Calendar</span>
            </button>
            
            <button
              onClick={handleOutlookCalendar}
              className="flex items-center justify-center space-x-3 bg-blue-700 hover:bg-blue-800 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-xl">📧</span>
              <span>Add to Outlook</span>
            </button>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Manual Subscription</h3>
            <div className="flex items-center space-x-3">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg text-sm font-mono">
                {typeof window !== 'undefined' ? getCalendarUrl() : '/calendar'}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(getCalendarUrl())}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-medium whitespace-nowrap"
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📅 Next 14 Days
          </h2>
          
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, dateStr, events }) => {
              const isToday = dateStr === today.toISOString().split('T')[0]
              const hasEvents = events.length > 0
              
              return (
                <div 
                  key={dateStr}
                  className={`
                    min-h-[80px] p-2 rounded-lg border transition-all duration-200
                    ${isToday ? 'bg-indigo-100 border-indigo-300' : 'bg-gray-50 border-gray-200'}
                    ${hasEvents ? 'hover:shadow-md cursor-pointer' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                  {events.map((event, idx) => (
                    <div 
                      key={event.id}
                      className="text-xs bg-indigo-600 text-white rounded px-1 py-0.5 mb-1 truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Events Display */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <h2 className="text-3xl font-bold text-white">Upcoming Events</h2>
            <p className="text-indigo-100 mt-2">
              {loading ? 'Loading events...' : `${sortedEvents.length} upcoming events`}
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading amazing events...</p>
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📅</span>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No upcoming events</h3>
                <p className="text-gray-600">Check back soon for new school events!</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {sortedEvents.map((event, index) => (
                  <div 
                    key={event.id}
                    className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">
                            {index === 0 ? '🔥' : index === 1 ? '⭐' : '📌'}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                          {event.needs_enrichment && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ✨ Needs Details
                            </span>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-gray-700 mb-4 leading-relaxed">{event.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                            <span className="text-blue-600">📅</span>
                            <span className="font-medium text-blue-900">
                              {formatDate(event.start_date)}
                              {event.end_date && event.end_date !== event.start_date && 
                                ` - ${formatDate(event.end_date)}`
                              }
                            </span>
                          </div>
                          
                          {event.start_time && (
                            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                              <span className="text-green-600">🕐</span>
                              <span className="font-medium text-green-900">
                                {formatTime(event.start_time)}
                                {event.end_time && ` - ${formatTime(event.end_time)}`}
                              </span>
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
                              <span className="text-purple-600">📍</span>
                              <span className="font-medium text-purple-900">{event.location}</span>
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

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Made by a TK Parent
          </p>
        </div>
      </div>
    </div>
  )
}
