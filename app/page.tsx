'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StoredEvent } from '@/lib/types'
import AddEventModal from '@/components/AddEventModal'
import SuggestEventModal from '@/components/SuggestEventModal'
import FeedbackModal from '@/components/FeedbackModal'
import { toast, Toaster } from 'sonner'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showSuggestEventModal, setShowSuggestEventModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [showHowModal, setShowHowModal] = useState(false)
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    fetchEvents()
    trackPageView()
    fetchStats()
    
    // Check if running in PWA mode
    const checkPWAMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true
      setIsPWA(isStandalone)
    }
    
    checkPWAMode()
  }, [])

  // Handle deep links when events are loaded
  useEffect(() => {
    if (events.length === 0) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const eventId = urlParams.get('event')
    const action = urlParams.get('action')
    
    if (eventId) {
      // Find and show the specific event
      const event = events.find(e => e.id === eventId)
      if (event) {
        setSelectedEvent(event)
      }
    } else if (action) {
      switch (action) {
        case 'suggest':
          setShowSuggestEventModal(true)
          break
        case 'contact':
          setShowFeedbackModal(true)
          break
        case 'how':
          setShowHowModal(true)
          break
      }
    }
    
    // Clean up URL after handling deep link
    if (eventId || action) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [events])

  useEffect(() => {
    // PWA install prompt detection
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Check if user has dismissed the prompt recently
      const dismissed = localStorage.getItem('pwa-dismissed')
      const dismissedTime = dismissed ? parseInt(dismissed) : 0
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      if (!isStandalone && (!dismissed || daysSinceDismissed > 7)) {
        setShowInstallPrompt(true)
      }
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false)
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Close dropdown when clicking outside
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
      // Get visitor ID from localStorage or create new one
      let visitorId = localStorage.getItem('visitor_id')
      if (!visitorId) {
        visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem('visitor_id', visitorId)
      }

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'page_view',
          visitorId 
        })
      })
    } catch (error) {
      // Silently fail tracking
    }
  }

  const trackAddToCalendar = async () => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_to_calendar_click',
          visitorId: localStorage.getItem('visitor_id') || 'anonymous'
        })
      })
    } catch (error) {
      console.error('Failed to track add to calendar:', error)
    }
  }

  const trackCalendarSubscription = async () => {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calendar_subscription', visitorId: localStorage.getItem('visitor_id') })
    })
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log('PWA install outcome:', outcome)
        if (outcome === 'accepted') {
          console.log('PWA installed successfully')
        }
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      } catch (error) {
        console.error('Error installing PWA:', error)
      }
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    // Store dismissal to avoid showing again for a while
    localStorage.setItem('pwa-dismissed', Date.now().toString())
  }

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

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const formatEventDate = (startDate: string, endDate?: string, startTime?: string, endTime?: string) => {
    const start = new Date(startDate + 'T00:00:00+12:00')
    const end = endDate ? new Date(endDate + 'T00:00:00+12:00') : start
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      })
    }
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }
    
    let dateStr = formatDate(start)
    if (endDate && startDate !== endDate) {
      dateStr += ` - ${formatDate(end)}`
    }
    
    if (startTime) {
      const timeStr = formatTime(startTime)
      if (endTime && endTime !== startTime) {
        dateStr += ` (${timeStr} - ${formatTime(endTime)})`
      } else {
        dateStr += ` (${timeStr})`
      }
    }
    
    return dateStr
  }

  const formatEventDuration = (event: StoredEvent) => {
    return formatEventDate(event.start_date, event.end_date, event.start_time, event.end_time)
  }

  const getDaysUntilEvent = (dateStr: string, timeStr?: string) => {
    const eventDate = new Date(dateStr + (timeStr ? `T${timeStr}:00+12:00` : 'T00:00:00+12:00'))
    const now = new Date()
    
    const diffTime = eventDate.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    // Check if it's a full day event happening today
    const today = new Date()
    const eventDateOnly = new Date(dateStr + 'T00:00:00+12:00')
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const isToday = eventDateOnly.getTime() === todayDateOnly.getTime()
    
    if (diffMinutes < 0 && !timeStr && isToday) return 'All Day Today'
    if (diffMinutes < 0 && isToday) return 'Happening Today'
    if (diffMinutes < 0) return 'Past'
    if (diffMinutes < 60) return `In ${diffMinutes} minutes`
    if (diffHours < 24) return `In ${diffHours} hours`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `In ${diffDays} days`
    return `In ${diffDays} days`
  }

  const isMultiDayEvent = (event: StoredEvent) => {
    return event.end_date && event.end_date !== event.start_date
  }

  const getCalendarUrl = () => {
    return `${window.location.origin}/calendar`
  }

  const handleGoogleCalendar = () => {
    const googleUrl = `https://calendar.google.com/calendar/u/0?cid=ODIwMTQ2NjNlZGZjN2ZlNzNlZTkzMGU4MDg5OWQ1ZWZhZjIwNTQ2ZTM4ZWE0Yzc4MmMwMjBjYjkwMzM5Y2VjNkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t`
    window.open(googleUrl, '_blank')
  }

  const handleAppleCalendar = () => {
    const calendarUrl = `https://tkevents.nz/calendar.ics`
    const webcalUrl = calendarUrl.replace(/^https?:\/\//, 'webcal://')
    window.location.href = webcalUrl
  }

  const handleOutlookCalendar = () => {
    const calendarUrl = `https://tkevents.nz/calendar.ics`
    const outlookUrl = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(calendarUrl)}`
    window.location.href = outlookUrl
  }

  // Get upcoming events - show next 5 upcoming events regardless of date
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  nextWeek.setHours(23, 59, 59, 999) // End of the 7th day

  // Get events in next 7 days for title display
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_date)
    eventDate.setHours(0, 0, 0, 0) // Normalize to start of day for comparison
    
    return eventDate >= today && eventDate <= nextWeek
  }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  
  // Always show next 5 upcoming events regardless of date range
  const fallbackEvents = events.filter(event => new Date(event.start_date) >= today)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5)

  // Calendar state and functions 
  const [currentDate, setCurrentDate] = useState(new Date()) // Start with current month
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

    // Use local date string for NZ timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Include events that start on this day OR span across this day
    const dayEvents = events.filter(event => {
      const eventStart = event.start_date
      const eventEnd = event.end_date || event.start_date
      // Check if current day falls within event date range
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

  // Show loading screen while events are loading
  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading TK Events</h2>
          <p className="text-gray-400">Getting the latest school events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
        <Toaster />
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-medium">Install TK Events</p>
              <p className="text-sm text-purple-100">Add to your home screen for quick access</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleInstallPWA}
              className="bg-white text-purple-600 px-4 py-2 rounded font-medium text-sm hover:bg-purple-50 transition-colors"
            >
              Install
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="text-white/80 hover:text-white px-3 py-1 rounded text-xs transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-3xl font-bold text-white mb-2">TK Events</h1>
          <p className="text-gray-400">Te Kura o Take Karara Events</p>
          {lastUpdate && (
            <p className="text-gray-500 text-sm mt-2">
              Last updated: {lastUpdate}
            </p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
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
          ) : !fallbackEvents.length ? (
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 text-center">
              <p className="text-blue-300">No upcoming events found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
              {fallbackEvents.map((event) => (
                <div
                  key={event.id}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event)
                    window.history.pushState({}, '', `/?event=${event.id}`)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-purple-300 transition-colors break-words">
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
                              <p className="font-medium">{formatEventDate(event.start_date, event.end_date || undefined, event.start_time || undefined, event.end_time || undefined)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium text-orange-300">{getDaysUntilEvent(event.start_date, event.start_time)}</span>
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
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const formattedDate = formatEventDate(event.start_date, event.end_date || undefined, event.start_time || undefined, event.end_time || undefined)
                          const eventUrl = `${window.location.origin}/?event=${event.id}`
                          const shareText = `Event: ${event.title} - When: ${formattedDate}${event.location ? ` - Where: ${event.location}` : ''} - View details: ${eventUrl}`
                          
                          const shareData = {
                            title: event.title,
                            text: shareText,
                            url: eventUrl
                          }
                          if (navigator.share) {
                            navigator.share(shareData)
                          } else {
                            navigator.clipboard.writeText(shareText)
                            // Toast will be shown by the system
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-purple-500 flex items-center gap-1"
                        title="Share Event"
                      >
                        <span className="hidden sm:inline">Share</span>
                        <span className="sm:hidden">Share</span>
                        <svg className="w-3 h-3 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      </button>
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDropdownOpen(dropdownOpen === event.id ? null : event.id)
                          }}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-500 flex items-center gap-1"
                          title="Add to Calendar"
                        >
                          <span className="hidden sm:inline">Add to Calendar</span>
                          <span className="sm:hidden">+</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      {dropdownOpen === event.id && (
                        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[70]">
                          <div className="py-1">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setDropdownOpen(null)
                                await fetch('/api/track', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                                })
                                const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                                const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                                const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`
                                window.open(googleUrl, '_blank')
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Add to Google
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setDropdownOpen(null)
                                await fetch('/api/track', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                                })
                                const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                                const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                                const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`
                                window.open(outlookUrl, '_blank')
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 18h10V6H7v12zM21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                              </svg>
                              Add to Outlook
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                setDropdownOpen(null)
                                await fetch('/api/track', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                                })
                                const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                                const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                                const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//School Events//EN
BEGIN:VEVENT
UID:${event.id}@${window.location.hostname}
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT
END:VCALENDAR`
                                const blob = new Blob([icsContent], { type: 'text/calendar' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                              Add to Apple
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDropdownOpen(null)
                                const eventUrl = `${window.location.origin}/?event=${event.id}`
                                navigator.clipboard.writeText(eventUrl)
                                toast.success('Event link copied to clipboard!')
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Copy Event Link
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDropdownOpen(null)
                                const icsUrl = `${window.location.origin}/api/events/${event.id}/ics`
                                navigator.clipboard.writeText(icsUrl)
                                toast.success('Event subscription URL copied!')
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Subscribe to Event
                            </button>
                          </div>
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



        {/* Mobile Compact Events List */}
        <div className="md:hidden bg-slate-800 border border-slate-700 rounded-xl mb-8">
          <div className="p-3 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">All Future Events</h2>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event)
                  window.history.pushState({}, '', `/?event=${event.id}`)
                }}
                className="bg-slate-700/30 rounded-lg p-2 cursor-pointer hover:bg-slate-700/50 transition-colors border border-slate-600/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm flex-shrink-0">{event.title.match(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/) ? event.title.match(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/)![0] : getEventEmoji(event.title)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-xs truncate">{event.title.replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/, '')}</h3>
                      <div className="text-xs text-gray-400 truncate">
                        {formatEventDate(event.start_date, event.end_date || undefined, event.start_time || undefined, event.end_time || undefined)}
                        {event.location && ` • ${event.location}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const eventUrl = `${window.location.origin}/?event=${event.id}`
                      const shareText = `Event: ${event.title} - When: ${formatEventDate(event.start_date, event.end_date || undefined, event.start_time || undefined, event.end_time || undefined)}${event.location ? ` - Where: ${event.location}` : ''} - View details: ${eventUrl}`
                      
                      if (navigator.share) {
                        navigator.share({
                          title: event.title,
                          text: shareText,
                          url: eventUrl
                        })
                      } else {
                        navigator.clipboard.writeText(shareText)
                        toast.success('Event details copied!')
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-1 rounded text-xs transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No upcoming events</p>
              </div>
            )}
          </div>
          
          {/* Mobile Calendar Subscription */}
          <div className="border-t border-slate-700 p-3">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-2">Subscribe to your personal calendar</p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    trackCalendarSubscription()
                    handleGoogleCalendar()
                  }}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  Google
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    trackCalendarSubscription()
                    handleAppleCalendar()
                  }}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Apple
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    trackCalendarSubscription()
                    handleOutlookCalendar()
                  }}
                  className="text-gray-400 hover:text-orange-400 transition-colors"
                >
                  Outlook
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    trackCalendarSubscription()
                    const icsUrl = `${window.location.origin}/calendar.ics`
                    navigator.clipboard.writeText(icsUrl)
                    toast.success('Calendar URL copied to clipboard!')
                  }}
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Calendar */}
        <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-xl mb-8">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSuggestEventModal(true)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  const url = `${window.location.origin}/?action=suggest`
                  if (navigator.share) {
                    navigator.share({
                      title: 'TK Events - Suggest Event',
                      url: url
                    })
                  } else {
                    navigator.clipboard.writeText(url)
                    toast.success('Link copied to clipboard!')
                  }
                }}
                className="flex items-center justify-center w-8 h-8 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white mr-2"
                title="Left-click to suggest event, right-click to share"
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
                        {events.map((event, i) => (
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Calendar Subscription Footer - Hidden in PWA mode */}
          {!isPWA && (
            <div className="border-t border-slate-700 px-4 py-3">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">Stay up to date with all events by adding them to your personal calendar</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      trackCalendarSubscription()
                      handleGoogleCalendar()
                    }}
                    className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      trackCalendarSubscription()
                      handleAppleCalendar()
                    }}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Apple
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      trackCalendarSubscription()
                      handleOutlookCalendar()
                    }}
                    className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Outlook
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      trackCalendarSubscription()
                      const icsUrl = `${window.location.origin}/calendar.ics`
                      navigator.clipboard.writeText(icsUrl)
                      toast.success('Calendar URL copied to clipboard!')
                    }}
                    className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Stats Section */}
        {stats && (
          <div className="mb-8 mt-16">
            <h2 className="text-2xl font-bold mb-6 text-center text-white flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Site Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-4 text-center">
                <div className="text-blue-400 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-white">{stats.pageViews?.toLocaleString() || '0'}</p>
                <p className="text-blue-300 text-sm">Page Views</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-green-400 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-white">{stats.uniqueViews?.toLocaleString() || '0'}</p>
                <p className="text-green-300 text-sm">Unique Visitors</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-4 text-center">
                <div className="text-purple-400 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-white">{stats.subscribeClicks?.toLocaleString() || '0'}</p>
                <p className="text-purple-300 text-sm">Subscribe Clicks</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-xl p-4 text-center">
                <div className="text-orange-400 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-white">{stats.addToCalendarClicks?.toLocaleString() || '0'}</p>
                <p className="text-orange-300 text-sm">Calendar Adds</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm flex items-center justify-center gap-4">
          <span>Made by a TK Parent</span>
          <span>—</span>
          <button
            onClick={() => setShowHowModal(true)}
            onContextMenu={(e) => {
              e.preventDefault()
              const url = `${window.location.origin}/?action=how`
              if (navigator.share) {
                navigator.share({
                  title: 'TK Events - How/Why',
                  url: url
                })
              } else {
                navigator.clipboard.writeText(url)
                toast.success('Link copied to clipboard!')
              }
            }}
            className="text-purple-400 hover:text-purple-300 underline text-sm transition-colors"
            title="Right-click to open directly, left-click to share"
          >
            How/Why
          </button>
          <span>—</span>
          <button
            onClick={() => setShowFeedbackModal(true)}
            onContextMenu={(e) => {
              e.preventDefault()
              const url = `${window.location.origin}/?action=contact`
              if (navigator.share) {
                navigator.share({
                  title: 'TK Events - Contact',
                  url: url
                })
              } else {
                navigator.clipboard.writeText(url)
                toast.success('Link copied to clipboard!')
              }
            }}
            className="text-purple-400 hover:text-purple-300 underline text-sm transition-colors"
            title="Right-click to open directly, left-click to share"
          >
            Contact
          </button>
        </div>


        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-modal-in">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl bg-white/20 p-2 rounded-xl">{selectedEvent.title.match(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/) ? selectedEvent.title.match(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/)![0] : getEventEmoji(selectedEvent.title)}</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedEvent.title.replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/, '').trim()}</h2>
                      <p className="text-purple-100 text-sm">{getDaysUntilEvent(selectedEvent.start_date)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEvent(null)
                      window.history.pushState({}, '', '/')
                    }}
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
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === 'modal' ? null : 'modal')}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                      </svg>
                      Add to Calendar
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {dropdownOpen === 'modal' && (
                      <div className="absolute left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                        <div className="py-1">
                          <button
                            onClick={async () => {
                              setDropdownOpen(null)
                              await fetch('/api/track', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                              })
                              const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                              const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                              const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(selectedEvent.description || '')}&location=${encodeURIComponent(selectedEvent.location || '')}`
                              window.open(googleUrl, '_blank')
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                            </svg>
                            Google Calendar
                          </button>
                          <button
                            onClick={async () => {
                              setDropdownOpen(null)
                              await fetch('/api/track', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                              })
                              const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                              const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                              const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(selectedEvent.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(selectedEvent.description || '')}&location=${encodeURIComponent(selectedEvent.location || '')}`
                              window.open(outlookUrl, '_blank')
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7 18h10V6H7v12zM21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                            </svg>
                            Outlook
                          </button>
                          <button
                            onClick={async () => {
                              setDropdownOpen(null)
                              await fetch('/api/track', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                              })
                              const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                              const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                              const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//School Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@${window.location.hostname}
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z
SUMMARY:${selectedEvent.title}
DESCRIPTION:${selectedEvent.description || ''}
LOCATION:${selectedEvent.location || ''}
END:VEVENT
END:VCALENDAR`
                              const blob = new Blob([icsContent], { type: 'text/calendar' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${selectedEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                            </svg>
                            Apple Calendar / Other
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Share Buttons */}
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-gray-400 text-sm mb-3">Share this event</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const eventUrl = `${window.location.origin}/?event=${selectedEvent.id}`
                          const shareText = `Event: ${selectedEvent.title} - When: ${formatEventDuration(selectedEvent)}${selectedEvent.location ? ` - Where: ${selectedEvent.location}` : ''} - View details: ${eventUrl}`
                          navigator.clipboard.writeText(shareText)
                          toast.success('Event details copied to clipboard!')
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Details
                      </button>
                      
                      <button
                        onClick={() => {
                          const eventUrl = `${window.location.origin}/?event=${selectedEvent.id}`
                          const shareText = `Event: ${selectedEvent.title} - When: ${formatEventDuration(selectedEvent)}${selectedEvent.location ? ` - Where: ${selectedEvent.location}` : ''} - View details: ${eventUrl}`
                          
                          if (navigator.share) {
                            navigator.share({
                              title: selectedEvent.title,
                              text: shareText,
                              url: eventUrl
                            })
                          } else {
                            navigator.clipboard.writeText(shareText)
                            toast.success('Event details copied to clipboard!')
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Share Event
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

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="animate-fade-in">
            <FeedbackModal 
              onClose={() => setShowFeedbackModal(false)}
            />
          </div>
        )}

        {/* Suggest Event Modal */}
        {showSuggestEventModal && (
          <div className="animate-fade-in">
            <SuggestEventModal 
              onClose={() => setShowSuggestEventModal(false)}
              onEventSuggested={() => {
                // Could show a success message here
              }}
            />
          </div>
        )}

        {/* How/Why Modal */}
        {showHowModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-modal-in">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">How TK Events Works</h2>
                  <button
                    onClick={() => setShowHowModal(false)}
                    className="text-white hover:text-gray-300 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-6">
                  <p className="text-gray-300 text-lg leading-relaxed">
                    TK Events automatically converts school newsletter emails into a clean, accessible event calendar using AI technology.
                  </p>
                </div>

                {/* Process Steps */}
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Newsletter Email Received</h3>
                      <p className="text-gray-300 mb-3">
                        School newsletters are automatically forwarded to our system via email. These contain event information scattered throughout the text.
                      </p>
                      <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-blue-300 font-medium">Raw Newsletter Content</span>
                        </div>
                        <p className="text-gray-400 text-sm">Unstructured text with dates, times, and event details mixed in with other school information.</p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">AI Processing & Extraction</h3>
                      <p className="text-gray-300 mb-3">
                        OpenAI GPT-4 analyzes the newsletter content and intelligently extracts event information, dates, times, and locations.
                      </p>
                      <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="text-green-300 font-medium">Smart Event Recognition</span>
                        </div>
                        <p className="text-gray-400 text-sm">AI identifies patterns, extracts dates/times, and structures event data automatically.</p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Event Storage & Organization</h3>
                      <p className="text-gray-300 mb-3">
                        Extracted events are stored in our database with proper formatting, duplicate detection, and timezone handling for New Zealand.
                      </p>
                      <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-orange-500">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          <span className="text-orange-300 font-medium">Structured Data Storage</span>
                        </div>
                        <p className="text-gray-400 text-sm">Events are organized, deduplicated, and stored with proper NZ timezone information.</p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">Beautiful Calendar Display</h3>
                      <p className="text-gray-300 mb-3">
                        Events appear instantly on this website and can be subscribed to in Google Calendar, Apple Calendar, or Outlook.
                      </p>
                      <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-purple-500">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-purple-300 font-medium">Accessible Calendar</span>
                        </div>
                        <p className="text-gray-400 text-sm">Clean, mobile-friendly calendar that syncs with your favorite calendar app.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Why This Approach?</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">⚡ Automatic Updates</h4>
                      <p className="text-gray-300 text-sm">No manual entry needed - events appear as soon as newsletters are sent.</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">📱 Mobile Friendly</h4>
                      <p className="text-gray-300 text-sm">Works perfectly on phones, tablets, and can be installed as a PWA.</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">🔄 Calendar Sync</h4>
                      <p className="text-gray-300 text-sm">Subscribe once and events automatically appear in your calendar app.</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">🎯 Accurate Parsing</h4>
                      <p className="text-gray-300 text-sm">AI understands context and extracts the right information from complex text.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <FeedbackModal 
            onClose={() => setShowFeedbackModal(false)}
          />
        )}
      </div>
    </div>
  )
}
