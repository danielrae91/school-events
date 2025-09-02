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
      month: 'short',
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
    return `${window.location.origin}/calendar`
  }

  const handleGoogleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    const webcalUrl = calendarUrl.replace(/^https?:\/\//, 'webcal://')
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${webcalUrl}`
    window.open(googleUrl, '_blank')
  }

  const handleAppleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    const webcalUrl = calendarUrl.replace(/^https?:\/\//, 'webcal://')
    window.open(webcalUrl, '_blank')
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

  console.log('Calendar debug:', { 
    totalEvents: events.length, 
    currentMonth: currentMonth.toISOString().split('T')[0].substring(0, 7),
    sampleEvents: events.slice(0, 3).map(e => ({ title: e.title, start: e.start_date, end: e.end_date }))
  })

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
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-white flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upcoming Events
          </h2>
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
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3 sm:space-x-4 mb-3">
                        <div className="text-2xl sm:text-3xl mt-1 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                          {getEventEmoji(event.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                              {event.title}
                            </h3>
                            {isMultiDayEvent(event) && (
                              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium mt-1 sm:mt-0 self-start">
                                Multi-day
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col space-y-1 sm:space-y-2 text-gray-300 text-sm">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">{formatEventDuration(event)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                        const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`
                        window.open(googleUrl, '_blank')
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-500 flex-shrink-0 ml-2"
                      title="Add to Calendar"
                    >
                      Add to Calendar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Calendar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl mb-8">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSuggestEventModal(true)}
                className="flex items-center justify-center w-8 h-8 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white mr-2"
                title="Suggest Event"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="flex items-center justify-center w-8 h-8 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="flex items-center justify-center w-8 h-8 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Calendar Grid - Now visible on all screen sizes */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-gray-400 text-sm font-medium py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {monthCalendar.map(({ date, dateStr, events, isCurrentMonth, isToday }) => (
                <div 
                  key={dateStr}
                  className={`
                    min-h-[50px] sm:min-h-[80px] p-1 sm:p-2 text-xs sm:text-sm border border-slate-700 rounded-lg
                    ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
                    ${isToday ? 'bg-purple-800 border-purple-600' : 'hover:bg-slate-700'}
                    ${events.length > 0 ? 'bg-slate-700' : ''}
                  `}
                >
                  <div className="h-full flex flex-col">
                    <div className="text-center mb-1 font-medium">{date.getDate()}</div>
                    {events.length > 0 && (
                      <div className="flex-1 flex flex-col gap-0.5">
                        {events.slice(0, 1).map((event, i) => (
                          <div
                            key={i}
                            className={`text-xs px-1 py-0.5 rounded cursor-pointer transition-colors overflow-hidden ${
                              isMultiDayEvent(event)
                                ? 'bg-orange-500 hover:bg-orange-400 text-white'
                                : 'bg-purple-500 hover:bg-purple-400 text-white'
                            }`}
                            onClick={() => setSelectedEvent(event)}
                            title={`${event.title}${isMultiDayEvent(event) ? ' (Multi-day)' : ''}${event.start_time ? ` at ${event.start_time}` : ''}`}
                          >
                            <div className="truncate font-medium leading-tight">{event.title}</div>
                            {event.start_time && (
                              <div className="text-xs opacity-75 leading-tight">{event.start_time}</div>
                            )}
                          </div>
                        ))}
                        {events.length > 1 && (
                          <div className="text-xs text-gray-400 text-center font-medium mt-1">
                            +{events.length - 1}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Subscription Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium mb-4 text-center text-white">📅 Subscribe to Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                const calendarUrl = `${window.location.origin}/calendar.ics`
                const webcalUrl = calendarUrl.replace(/^https?:\/\//, 'webcal://')
                const googleUrl = `https://calendar.google.com/calendar/r?cid=${webcalUrl}`
                window.open(googleUrl, '_blank')
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Add to Google Calendar
            </button>
            
            <button
              onClick={handleAppleCalendar}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Add to Apple Calendar
            </button>
            
            <button
              onClick={() => {
                const calendarUrl = `${window.location.origin}/calendar.ics`
                window.open(calendarUrl, '_blank')
              }}
              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Download ICS File
            </button>
            
            <button
              onClick={() => {
                const calendarUrl = `${window.location.origin}/calendar.ics`
                navigator.clipboard.writeText(calendarUrl)
                alert('Calendar URL copied to clipboard!')
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </button>
          </div>
        </div>


        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm flex items-center justify-center gap-4">
          <span>Made by a TK Parent</span>
          <button
            onClick={() => setShowSuggestEventModal(true)}
            className="text-purple-400 hover:text-purple-300 underline text-sm transition-colors"
          >
            Send feedback
          </button>
        </div>


        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl bg-white/20 p-2 rounded-xl">{getEventEmoji(selectedEvent.title)}</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                      <p className="text-purple-100 text-sm">{getDaysUntilEvent(selectedEvent.start_date)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-white hover:text-gray-300 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid gap-4">
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-300 font-medium">When</p>
                    </div>
                    <p className="text-white text-lg">{formatEventDuration(selectedEvent)}</p>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="bg-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-gray-300 font-medium">Location</p>
                      </div>
                      <p className="text-white">{selectedEvent.location}</p>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div className="bg-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-300 font-medium">Description</p>
                      </div>
                      <p className="text-gray-200">{selectedEvent.description}</p>
                    </div>
                  )}

                  {isMultiDayEvent(selectedEvent) && (
                    <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="text-orange-300 font-medium">Multi-day Event</p>
                          <p className="text-orange-200 text-sm">This event spans multiple days</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                      const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(selectedEvent.description || '')}&location=${encodeURIComponent(selectedEvent.location || '')}`
                      window.open(googleUrl, '_blank')
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-blue-500/25"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </button>
                  
                  {/* Share Buttons */}
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-gray-400 text-sm mb-3">Share this event</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const text = `${selectedEvent.title} - ${formatEventDuration(selectedEvent)}${selectedEvent.location ? ` at ${selectedEvent.location}` : ''}`
                          navigator.clipboard.writeText(text)
                          alert('Event details copied to clipboard!')
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                      
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: selectedEvent.title,
                              text: `${selectedEvent.title} - ${formatEventDuration(selectedEvent)}${selectedEvent.location ? ` at ${selectedEvent.location}` : ''}`,
                              url: window.location.origin
                            })
                          } else {
                            const text = `${selectedEvent.title} - ${formatEventDuration(selectedEvent)}${selectedEvent.location ? ` at ${selectedEvent.location}` : ''} ${window.location.origin}`
                            navigator.clipboard.writeText(text)
                            alert('Event details copied to clipboard!')
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Share
                      </button>
                    </div>
                  </div>
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
