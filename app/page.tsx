'use client'

import { useState, useEffect, useRef } from 'react'
import { StoredEvent } from '@/lib/types'
import AddEventModal from '@/components/AddEventModal'
import SuggestEventModal from '@/components/SuggestEventModal'
import FeedbackModal from '@/components/FeedbackModal'
import { Toast, useToast } from '@/components/Toast'
import { gsap } from 'gsap'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showSuggestEventModal, setShowSuggestEventModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [error, setError] = useState('')
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const { toasts, showSuccess, showError, removeToast } = useToast()
  
  // Animation refs
  const eventsContainerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEvents()
    trackPageView()
    
    // Initial page animations
    const tl = gsap.timeline()
    tl.fromTo(headerRef.current, 
      { opacity: 0, y: -50 }, 
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
    )
    .fromTo(eventsContainerRef.current, 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 
      "-=0.4"
    )
    .fromTo(calendarRef.current, 
      { opacity: 0, scale: 0.95 }, 
      { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, 
      "-=0.3"
    )
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const trackPageView = async () => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'page_view', page: 'home' })
      })
    } catch (err) {
      // Analytics failure shouldn't break the app
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      setEvents(data.events || [])
      setError('')
      
      // Animate events when they load
      setTimeout(() => {
        const eventCards = document.querySelectorAll('.event-card')
        gsap.fromTo(eventCards, 
          { opacity: 0, y: 20, scale: 0.95 },
          { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            duration: 0.5, 
            stagger: 0.1, 
            ease: "power2.out" 
          }
        )
      }, 100)
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load events. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      }
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-NZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isEventToday = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }

  const isEventTomorrow = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return eventDate.toDateString() === tomorrow.toDateString()
  }

  const getRelativeDate = (dateStr: string) => {
    if (isEventToday(dateStr)) return 'Today'
    if (isEventTomorrow(dateStr)) return 'Tomorrow'
    return formatDate(dateStr)
  }

  const isEventThisWeek = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    return eventDate >= today && eventDate <= nextWeek
  }

  const getEventStatus = (event: StoredEvent) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const eventStart = new Date(event.start_date)
    eventStart.setHours(0, 0, 0, 0)
    
    const eventEnd = event.end_date ? new Date(event.end_date) : eventStart
    eventEnd.setHours(23, 59, 59, 999)
    
    if (today >= eventStart && today <= eventEnd) {
      return 'happening'
    } else if (eventStart > today) {
      return 'upcoming'
    } else {
      return 'past'
    }
  }

  const sortedEvents = events
    .filter(event => getEventStatus(event) !== 'past')
    .sort((a, b) => {
      const dateA = new Date(a.start_date)
      const dateB = new Date(b.start_date)
      return dateA.getTime() - dateB.getTime()
    })

  const happeningNowEvents = sortedEvents.filter(event => getEventStatus(event) === 'happening')
  const upcomingEvents = sortedEvents.filter(event => getEventStatus(event) === 'upcoming')

  const displayEvents = [...happeningNowEvents, ...upcomingEvents].slice(0, 10)

  const today = new Date()
  const upcomingEventsForTitle = events
    .filter(event => {
      const eventDate = new Date(event.start_date)
      const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 0 && daysDiff <= 7
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5)

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

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const dayEvents = events.filter(event => {
      const eventStart = event.start_date
      const eventEnd = event.end_date || event.start_date
      return dateStr >= eventStart && dateStr <= eventEnd
    })
    
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isToday = dateStr === todayStr

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
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* PWA Install Notification */}
      {showInstallPrompt && (
        <div className="fixed top-4 left-4 right-4 bg-purple-600 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center">
          <div>
            <p className="font-medium">Install School Events App</p>
            <p className="text-sm opacity-90">Get quick access and offline support</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-purple-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Install
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="text-white/80 hover:text-white px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            TK School Events
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Stay connected with all the exciting events happening at our school community
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => setShowAddEventModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg hover:shadow-purple-500/25"
            >
              Add Event
            </button>
            <button
              onClick={() => setShowSuggestEventModal(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Suggest Event
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Send Feedback
            </button>
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div ref={eventsContainerRef} className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            {upcomingEventsForTitle.length > 0 ? 'Next 7 Days' : 'Upcoming Events'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : !events.length ? (
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 text-center">
              <p className="text-blue-300">No upcoming events found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
              {displayEvents.map((event) => (
                <div
                  key={event.id}
                  className="event-card group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                            <span className="text-2xl">{getEventEmoji(event.title)}</span>
                            <h3 className="text-lg sm:text-xl font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                              {event.title}
                            </h3>
                            {getEventStatus(event) === 'happening' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700/50 mt-1 sm:mt-0">
                                Happening Now
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-slate-400 text-sm sm:text-base mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{getRelativeDate(event.start_date)}</span>
                          {event.start_time && (
                            <span className="text-slate-400">at {formatTime(event.start_time)}</span>
                          )}
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              ))}
            </div>
          )}
        </div>

        {/* Calendar Section */}
        <div ref={calendarRef} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Calendar</h2>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {currentMonth.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCalendar.map((day, index) => (
              <div
                key={index}
                className={`p-2 min-h-[60px] border border-slate-700/30 rounded-lg ${
                  day.isCurrentMonth 
                    ? day.isToday 
                      ? 'bg-purple-600/20 border-purple-500/50' 
                      : 'bg-slate-700/30 hover:bg-slate-700/50'
                    : 'bg-slate-800/30 opacity-50'
                } transition-colors cursor-pointer`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  day.isToday ? 'text-purple-300' : day.isCurrentMonth ? 'text-white' : 'text-slate-500'
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.events.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="text-xs bg-purple-600/30 text-purple-200 px-1 py-0.5 rounded truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 2 && (
                    <div className="text-xs text-slate-400">
                      +{day.events.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Subscription */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Subscribe to Calendar</h3>
          <p className="text-slate-300 mb-4">
            Add school events to your personal calendar app
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/calendar.ics"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Download Calendar
            </a>
            <a
              href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://school-events.vercel.app'}/calendar.ics`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.5 3h-3V1.5a.75.75 0 00-1.5 0V3h-6V1.5a.75.75 0 00-1.5 0V3h-3A2.5 2.5 0 001 5.5v13A2.5 2.5 0 003.5 21h16a2.5 2.5 0 002.5-2.5v-13A2.5 2.5 0 0019.5 3zM20.5 18.5a1 1 0 01-1 1h-15a1 1 0 01-1-1V9h17v9.5zM20.5 7.5h-17V5.5a1 1 0 011-1h3V6a.75.75 0 001.5 0V4.5h6V6a.75.75 0 001.5 0V4.5h3a1 1 0 011 1v2z"/>
              </svg>
              Add to Google Calendar
            </a>
            <a
              href="webcal://school-events.vercel.app/calendar.ics"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Subscribe (iOS/Mac)
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-400 text-sm">
          <p>Made by a TK Parent — <button onClick={() => setShowFeedbackModal(true)} className="text-purple-400 hover:text-purple-300 underline">Send feedback</button></p>
        </footer>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getEventEmoji(selectedEvent.title)}</span>
                  <h3 className="text-xl font-bold text-white">{selectedEvent.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedEvent.description && (
                <p className="text-slate-300 mb-4">{selectedEvent.description}</p>
              )}
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {formatDate(selectedEvent.start_date)}
                    {selectedEvent.start_time && ` at ${formatTime(selectedEvent.start_time)}`}
                  </span>
                </div>
                
                {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      Ends {formatDate(selectedEvent.end_date)}
                      {selectedEvent.end_time && ` at ${formatTime(selectedEvent.end_time)}`}
                    </span>
                  </div>
                )}
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
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
              setShowSuggestEventModal(false)
              showSuccess('Event Suggested', 'Your event suggestion has been submitted for review.')
            }}
          />
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <FeedbackModal 
            onClose={() => setShowFeedbackModal(false)}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}
      </div>
    </div>
  )
}
