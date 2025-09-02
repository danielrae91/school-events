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
    // Try the webcal protocol first for better mobile support
    const webcalUrl = calendarUrl.replace('https://', 'webcal://')
    
    // For mobile devices, try webcal first, fallback to Google Calendar
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      window.location.href = webcalUrl
      // Fallback to Google Calendar after a short delay
      setTimeout(() => {
        const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`
        window.open(googleUrl, '_blank')
      }, 1000)
    } else {
      const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`
      window.open(googleUrl, '_blank')
    }
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

        {/* Calendar Subscription Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 mb-6">
          <h2 className="text-sm font-medium mb-2 text-center text-gray-300">📅 Subscribe to Calendar</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGoogleCalendar}
              className="bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-slate-600 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            
            <button
              onClick={handleAppleCalendar}
              className="bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-slate-600 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
            
            <button
              onClick={handleOutlookCalendar}
              className="bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-slate-600 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Other
            </button>
            
            <button
              onClick={() => {
                const calendarUrl = getCalendarUrl()
                navigator.clipboard.writeText(calendarUrl)
                alert('Calendar URL copied to clipboard!')
              }}
              className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-slate-600 px-2 py-1.5 rounded text-xs transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
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
                  onClick={() => setSelectedEvent(event)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-3 sm:p-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="text-xl sm:text-2xl flex-shrink-0">{getEventEmoji(event.title)}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm sm:text-base leading-tight mb-1">{event.title}</h3>
                        {isMultiDayEvent(event) && (
                          <span className="inline-block bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full mb-1">
                            Multi-day
                          </span>
                        )}
                        {event.location && (
                          <p className="text-gray-400 text-xs sm:text-sm flex items-center gap-1 truncate">
                            📍 <span className="truncate">{event.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-purple-300 font-semibold text-xs sm:text-sm mb-1">
                        {getDaysUntilEvent(event.start_date)}
                      </div>
                      <div className="text-gray-300 text-xs sm:text-sm">
                        {formatDate(event.start_date)}
                      </div>
                      {event.start_time && (
                        <div className="text-gray-400 text-xs">
                          {formatTime(event.start_time)}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                          const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                          const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`
                          window.open(googleUrl, '_blank')
                        }}
                        className="mt-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                        title="Add to Calendar"
                      >
                        📅 Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl mb-8">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <button
              onClick={prevMonth}
              className="text-white hover:text-purple-400 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setShowSuggestEventModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Suggest
              </button>
            </div>
            
            <button
              onClick={nextMonth}
              className="text-white hover:text-purple-400 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {monthCalendar.map(({ date, dateStr, events, isCurrentMonth, isToday }) => (
                <div 
                  key={dateStr}
                  className={`
                    min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border border-slate-700 cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 text-gray-600'}
                    ${isToday ? 'bg-purple-900 border-purple-500' : ''}
                  `}
                >
                  <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? 'text-purple-300' : isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {events.slice(0, 3).map((event) => (
                      <div 
                        key={event.id}
                        className={`text-xs rounded px-1 py-0.5 truncate cursor-pointer transition-colors ${
                          isMultiDayEvent(event) 
                            ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                        title={`${event.title}${isMultiDayEvent(event) ? ' (Multi-day)' : ''}`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <span className="hidden sm:inline">{getEventEmoji(event.title)} </span>
                        <span className="text-xs">{event.title}</span>
                        {isMultiDayEvent(event) && <span className="ml-1 hidden sm:inline">📅</span>}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{events.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link
            href="/admin"
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            🔧 Admin Panel
          </Link>
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
