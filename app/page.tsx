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
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null)
  const [modalDropdownOpen, setModalDropdownOpen] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showSuggestEventModal, setShowSuggestEventModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [showHowModal, setShowHowModal] = useState(false)
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    fetchEvents()
    trackPageView()
    fetchStats()
    
    // Register service worker and set up push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      let serviceWorkerRegistration: ServiceWorkerRegistration | null = null
      
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
          serviceWorkerRegistration = registration
          setPushSupported(true)
          
          // Check if already subscribed
          return registration.pushManager.getSubscription()
        })
        .then((subscription) => {
          if (subscription) {
            setPushSubscribed(true)
          }
          
          // Check notification permission and prompt if needed
          const checkNotificationPermission = () => {
            // Only prompt on mobile devices or PWA
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isPWAMode = window.matchMedia('(display-mode: standalone)').matches
            
            if (!isMobile && !isPWAMode) {
              return // Don't prompt on desktop browsers
            }
            
            if (Notification.permission === 'default') {
              // Show a friendly prompt after a short delay
              setTimeout(() => {
                if (confirm('Would you like to receive notifications about new events and updates?')) {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      console.log('Push notification permission granted')
                      // Try to subscribe to push notifications
                      if (serviceWorkerRegistration && !subscription) {
                        subscribeToPushNotifications()
                      }
                    }
                  })
                }
              }, 3000)
            } else if (Notification.permission === 'granted' && !subscription) {
              // Permission granted but not subscribed, try to subscribe
              subscribeToPushNotifications()
            }
          }
          
          // Check permission on app open
          checkNotificationPermission()
          
          // Also check when app becomes standalone (PWA install)
          if (window.matchMedia('(display-mode: standalone)').matches) {
            setTimeout(checkNotificationPermission, 2000)
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
    
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
      
      // Only show PWA prompt on mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (!isMobile) {
        return // Don't show PWA prompt on desktop
      }
      
      // Check if user has dismissed the prompt or installed the app
      const dismissed = localStorage.getItem('pwa-dismissed')
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      if (!isStandalone && !dismissed) {
        setShowInstallPrompt(true)
      }
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWA(true)
      // Track PWA install
      fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pwa_install' })
      }).catch(() => {}) // Silent fail
      setShowInstallPrompt(false)
    } else {
      // Fallback for incognito mode or when beforeinstallprompt doesn't fire
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        // Use a timeout to ensure localStorage is accessible
        setTimeout(() => {
          try {
            const dismissed = localStorage.getItem('pwa-dismissed')
            if (!dismissed) {
              setShowInstallPrompt(true)
            }
          } catch (e) {
            // In incognito mode, localStorage might throw errors, so show prompt anyway
            setShowInstallPrompt(true)
          }
        }, 1000)
      }
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
      if (modalDropdownOpen && !(event.target as Element).closest('.modal-dropdown-container')) {
        setModalDropdownOpen(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, modalDropdownOpen])

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
          setIsPWA(true)
          setShowInstallPrompt(false)
          setDeferredPrompt(null)
          // Track PWA install
          fetch('/api/admin/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'pwa_install' })
          }).catch(() => {}) // Silent fail
          
          // Request push notification permission after PWA install
          setTimeout(async () => {
            if ('Notification' in window && Notification.permission === 'default') {
              const permission = await Notification.requestPermission()
              if (permission === 'granted') {
                subscribeToPushNotifications()
              }
            }
          }, 1000) // Small delay to ensure PWA is fully installed
        }
        setShowInstallPrompt(false)
        // Mark as permanently dismissed after install
        try {
          localStorage.setItem('pwa-dismissed', 'permanent')
        } catch (e) {
          // Ignore localStorage errors in incognito mode
        }
      } catch (error) {
        console.error('Error installing PWA:', error)
      }
    } else {
      // Fallback for incognito mode - show manual install instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      
      let instructions = ''
      if (isIOS) {
        instructions = 'To install: Tap the Share button in Safari, then "Add to Home Screen"'
      } else if (isAndroid) {
        instructions = 'To install: Tap the menu (⋮) in your browser, then "Add to Home screen" or "Install app"'
      } else {
        instructions = 'To install: Look for "Add to Home Screen" or "Install" option in your browser menu'
      }
      
      alert(instructions)
      setShowInstallPrompt(false)
      try {
        localStorage.setItem('pwa-dismissed', 'permanent')
      } catch (e) {
        // Ignore localStorage errors in incognito mode
      }
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    // Remember dismissal permanently - never show again
    try {
      localStorage.setItem('pwa-dismissed', 'permanent')
    } catch (e) {
      // Ignore localStorage errors in incognito mode
    }
  }

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeToPushNotifications = async () => {
    try {
      // First check if permission is granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.log('Push notification permission denied')
          return
        }
      }

      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setPushSubscribed(true)
        console.log('Already subscribed to push notifications')
        return
      }
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured')
      }
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      })

      setPushSubscribed(true)
      console.log('Push notification subscription successful')
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
    }
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

  const handleYahooCalendar = () => {
    const calendarUrl = `https://tkevents.nz/calendar.ics`
    const yahooUrl = `https://calendar.yahoo.com/?v=60&url=${encodeURIComponent(calendarUrl)}`
    window.open(yahooUrl, '_blank')
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
  
  // Get today's events
  const todaysEvents = events.filter(event => {
    const eventDate = new Date(event.start_date)
    eventDate.setHours(0, 0, 0, 0)
    const todayDate = new Date(today)
    todayDate.setHours(0, 0, 0, 0)
    return eventDate.getTime() === todayDate.getTime()
  }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  // Get upcoming events (excluding today's events)
  const fallbackEvents = events.filter(event => {
    const eventDate = new Date(event.start_date)
    eventDate.setHours(0, 0, 0, 0)
    const todayDate = new Date(today)
    todayDate.setHours(0, 0, 0, 0)
    return eventDate.getTime() > todayDate.getTime()
  })
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



  // Skeleton component for loading states
  const SkeletonCard = () => (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 animate-pulse">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-5 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
        <Toaster />
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 text-slate-200 p-4 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-medium text-white">Install TK Events App</p>
                <p className="text-sm text-slate-400">Get quick access and notifications</p>
              </div>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={handleInstallPWA}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Install App
          </button>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-left mb-8">
          <h1 className="text-4xl sm:text-3xl font-bold text-white mb-2">TK Events</h1>
          <p className="text-gray-400">Te Kura o Take Karara Events</p>
          {lastUpdate && (
            <p className="text-gray-500 text-sm mt-2">
              Last updated: {lastUpdate}
            </p>
          )}
        </div>

        {/* Today's Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Today's Events
          </h2>
          <div className="grid gap-4 grid-cols-1">
            {loading && events.length === 0 ? (
              <SkeletonCard />
            ) : todaysEvents.length > 0 ? (
              todaysEvents.map((event) => (
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
                          <div className="flex flex-col mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-purple-300 transition-colors break-words text-left">
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
                    <div className="flex flex-col gap-2 flex-shrink-0 ml-2 ">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDropdownOpen(dropdownOpen === event.id ? null : event.id)
                          }}
                          className="w-full bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-500 flex items-center justify-center gap-1"
                          title="Add to Calendar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="hidden sm:inline">Calendar</span>
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
                                  <path d="M7 22h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2zM9 4h6v2H9V4zm0 4h6v2H9V8zm0 4h6v2H9v-2z"/>
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
PRODID:-//TK Events//EN
BEGIN:VEVENT
UID:${event.id}@tkevents.nz
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
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
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  URL.revokeObjectURL(url)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download .ics
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setDropdownOpen(null)
                                  const icsUrl = `${window.location.origin}/api/event-ics/${event.id}`
                                  navigator.clipboard.writeText(icsUrl)
                                  toast.success('ICS URL copied to clipboard!')
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy Event Link
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
                          }
                        }}
                        className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-sm hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 flex items-center gap-1 self-end sm:self-auto"
                        title="Share Event"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-2 text-center">
                <div className="text-blue-400 mb-1">
                  <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No events today</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Upcoming Events
          </h2>
          {loading && events.length === 0 ? (
            <div className="grid gap-4 grid-cols-1">
              {[...Array(5)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
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
            <div className="grid gap-4 grid-cols-1">
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
                          <div className="flex flex-col mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-purple-300 transition-colors break-words text-left">
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
                    <div className="flex flex-col gap-2 flex-shrink-0 ml-2 ">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDropdownOpen(dropdownOpen === event.id ? null : event.id)
                          }}
                          className="w-full bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-500 flex items-center justify-center gap-1"
                          title="Add to Calendar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="hidden sm:inline">Calendar</span>
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
                                  <path d="M7 22h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2zM9 4h6v2H9V4zm0 4h6v2H9V8zm0 4h6v2H9v-2z"/>
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
PRODID:-//TK Events//EN
BEGIN:VEVENT
UID:${event.id}@tkevents.nz
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
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
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  URL.revokeObjectURL(url)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download .ics
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setDropdownOpen(null)
                                  const icsUrl = `${window.location.origin}/api/event-ics/${event.id}`
                                  navigator.clipboard.writeText(icsUrl)
                                  toast.success('ICS URL copied to clipboard!')
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy Event Link
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
                        className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-sm hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 flex items-center gap-1 self-end sm:self-auto"
                        title="Share Event"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span className="hidden sm:inline">Share</span>
                      </button>
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
          <div className="p-2">
            {(() => {
              // Filter out past events for mobile view
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const futureEvents = events.filter(event => {
                const eventDate = new Date(event.start_date)
                return eventDate >= today
              })
              
              // Group events by month
              const eventsByMonth = futureEvents.reduce((acc, event) => {
                const eventDate = new Date(event.start_date)
                const monthKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}`
                const monthName = eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                
                if (!acc[monthKey]) {
                  acc[monthKey] = {
                    monthName,
                    events: []
                  }
                }
                acc[monthKey].events.push(event)
                return acc
              }, {} as Record<string, { monthName: string; events: typeof events }>)

              return Object.entries(eventsByMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([monthKey, { monthName, events: monthEvents }]) => (
                  <div key={monthKey} className="mb-4">
                    <h3 className="text-sm font-semibold text-purple-300 mb-2 px-2">{monthName}</h3>
                    <div className="space-y-2">
                      {monthEvents.map((event) => (
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
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-white text-xs truncate text-left">{event.title}</h3>
                                <div className="text-xs text-gray-400 truncate">
                                  {formatEventDate(event.start_date, event.end_date || undefined, event.start_time || undefined, event.end_time || undefined)}
                                  {event.location && ` • ${event.location}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMobileDropdownOpen(mobileDropdownOpen === event.id ? null : event.id)
                                  }}
                                  className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded text-xs transition-colors flex-shrink-0 border border-slate-500"
                                  title="Add to Calendar"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="hidden">Calendar</span>
                                </button>
                                {mobileDropdownOpen === event.id && (
                                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[70]">
                                    <div className="py-1">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          setMobileDropdownOpen(null)
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
                                          setMobileDropdownOpen(null)
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
                                          <path d="M7 22h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2zM9 4h6v2H9V4zm0 4h6v2H9V8zm0 4h6v2H9v-2z"/>
                                        </svg>
                                        Add to Outlook
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          setMobileDropdownOpen(null)
                                          await fetch('/api/track', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                                          })
                                          const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
                                          const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))
                                          const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TK Events//EN
BEGIN:VEVENT
UID:${event.id}@tkevents.nz
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
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
                                          document.body.appendChild(a)
                                          a.click()
                                          document.body.removeChild(a)
                                          URL.revokeObjectURL(url)
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                        </svg>
                                        Add to Apple
                                      </button>
                                      <hr className="my-1 border-gray-200" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setMobileDropdownOpen(null)
                                          const eventUrl = `${window.location.origin}/?event=${event.id}`
                                          navigator.clipboard.writeText(eventUrl)
                                          toast.success('Event link copied to clipboard!')
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy Event Link
                                      </button>
                                    </div>
                                  </div>
                                )}
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
                                className="bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm text-blue-200 border border-blue-400/30 p-1 rounded text-xs transition-all duration-200 flex-shrink-0"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            })()}
          </div>
        </div>

        {/* Full Calendar Grid - Hidden on mobile */}
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
        </div>

        {/* Standalone Calendar Subscription Section */}
        {!isPWA && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl mb-8">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white text-center">Subscribe to Calendar</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm mb-4 text-center">Stay up to date with all events by adding them to your personal calendar</p>
              
              {/* Calendar Subscription */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
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
        )}

        {/* Stats Section */}
        {stats && (
          <div className="mb-8 mt-16">
            <h2 className="text-xl font-medium mb-4 text-center text-gray-400 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Usage Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-300">{stats.pageViews?.toLocaleString() || '0'}</p>
                <p className="text-slate-500 text-xs">Page Views</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-300">{stats.uniqueViews?.toLocaleString() || '0'}</p>
                <p className="text-slate-500 text-xs">Unique Visitors</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-300">{stats.subscribeClicks?.toLocaleString() || '0'}</p>
                <p className="text-slate-500 text-xs">Calendar Subscribers</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-300">{stats.pwaInstalls?.toLocaleString() || '0'}</p>
                <p className="text-slate-500 text-xs">App Installs</p>
              </div>
            </div>
          </div>
        )}



        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-modal-in">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                      <p className="text-purple-100 text-sm">{getDaysUntilEvent(selectedEvent.start_date, selectedEvent.start_time)}</p>
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
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <div className="relative flex-1">
                      <button
                        onClick={() => setModalDropdownOpen(modalDropdownOpen === 'calendar' ? null : 'calendar')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300 rounded-lg hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Calendar</span>
                      </button>
                      {modalDropdownOpen === 'calendar' && (
                        <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[70]">
                          <div className="py-1">
                            <button
                              onClick={async () => {
                                setModalDropdownOpen(null)
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
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Add to Google
                            </button>
                            <button
                              onClick={async () => {
                                setModalDropdownOpen(null)
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
                                <path d="M7 22h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2zM9 4h6v2H9V4zm0 4h6v2H9V8zm0 4h6v2H9v-2z"/>
                              </svg>
                              Add to Outlook
                            </button>
                            <button
                              onClick={async () => {
                                setModalDropdownOpen(null)
                                await fetch('/api/track', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'add_to_calendar_click', visitorId: localStorage.getItem('visitor_id') })
                                })
                                const startDate = new Date(selectedEvent.start_date + (selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T00:00'))
                                const endDate = new Date((selectedEvent.end_date || selectedEvent.start_date) + (selectedEvent.end_time ? `T${selectedEvent.end_time}` : selectedEvent.start_time ? `T${selectedEvent.start_time}` : 'T23:59'))
                                const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TK Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@tkevents.nz
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
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
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                              Add to Apple
                            </button>
                            <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => {
                                setModalDropdownOpen(null)
                                const eventUrl = `${window.location.origin}/?event=${selectedEvent.id}`
                                navigator.clipboard.writeText(eventUrl)
                                toast.success('Event link copied to clipboard!')
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy Event Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        const eventUrl = `${window.location.origin}/?event=${selectedEvent.id}`
                        navigator.clipboard.writeText(eventUrl)
                        toast.success('Event link copied to clipboard!')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300 rounded-lg hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300 rounded-lg hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
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

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm flex items-center justify-center gap-4">
          <span>Made by a TK Parent</span>
          <span>—</span>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="hover:text-gray-300 transition-colors"
          >
            Send a message
          </button>
        </div>
      </div>

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
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">📧 Email Parsing</h4>
                  <p className="text-gray-300 text-sm">TK Events automatically reads school newsletters and extracts event information using AI. No manual entry needed!</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">📱 Mobile First</h4>
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
      )}

    </div>
  )
}
