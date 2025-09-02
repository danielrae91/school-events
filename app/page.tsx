'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StoredEvent } from '@/lib/types'

export default function HomePage() {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      setEvents(data.events || [])
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

  const getCalendarUrl = () => {
    return `${window.location.origin}/calendar`
  }

  const handleGoogleCalendar = () => {
    const calendarUrl = getCalendarUrl()
    const googleUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(calendarUrl)}`
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Futuristic animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>
      
      <div className="relative z-10 min-h-screen px-3 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Te Kura O Take Kārara
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 font-light">School Events</p>
        </div>

        {/* Mobile-First Event Cards */}
        <div className="space-y-4 mb-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 text-center">
              <p className="text-red-300 font-medium">⚠️ {error}</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center">
              <p className="text-gray-300 text-lg">📅 No upcoming events in the next 7 days</p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:bg-black/40 hover:border-purple-400/50 active:scale-[0.98]"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-3xl sm:text-4xl flex-shrink-0">
                    {getEventEmoji(event.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg sm:text-xl mb-2 truncate">
                      {event.title}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-300 text-sm sm:text-base">
                        <span className="mr-2">📅</span>
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      {event.start_time && (
                        <div className="flex items-center text-gray-300 text-sm sm:text-base">
                          <span className="mr-2">⏰</span>
                          <span>{formatTime(event.start_time)}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-gray-300 text-sm sm:text-base">
                          <span className="mr-2">📍</span>
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        event.needs_enrichment 
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}>
                        {event.needs_enrichment ? '📰 More information found in Hero newsletter' : '✨ Enhanced'}
                      </span>
                      <div className="text-purple-300 text-sm font-medium">
                        Tap for details →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calendar Subscription Section */}
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-white text-xl font-bold mb-4 text-center">📱 Subscribe to Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={handleGoogleCalendar}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              📧 Google
            </button>
            <button
              onClick={handleAppleCalendar}
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              🍎 Apple
            </button>
            <button
              onClick={handleOutlookCalendar}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              📮 Outlook
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(getCalendarUrl())}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              📋 Copy URL
            </button>
          </div>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link
            href="/admin"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            🔧 Admin Panel
          </Link>
        </div>

        {/* Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getEventEmoji(selectedEvent.title)}</span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedEvent.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-white hover:text-pink-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4">
                    <h3 className="font-bold text-blue-300 mb-2 flex items-center text-sm">
                      <span className="mr-2">📅</span>
                      Date & Time
                    </h3>
                    <p className="text-white font-medium">{formatDate(selectedEvent.start_date)}</p>
                    {selectedEvent.start_time && (
                      <p className="text-gray-300 mt-1">{formatTime(selectedEvent.start_time)}</p>
                    )}
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
                      <h3 className="font-bold text-green-300 mb-2 flex items-center text-sm">
                        <span className="mr-2">📍</span>
                        Location
                      </h3>
                      <p className="text-white">{selectedEvent.location}</p>
                    </div>
                  )}
                </div>
                
                {selectedEvent.description && (
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-2xl p-4">
                    <h3 className="font-bold text-purple-300 mb-2 flex items-center text-sm">
                      <span className="mr-2">📝</span>
                      Description
                    </h3>
                    <p className="text-gray-200 whitespace-pre-wrap text-sm">{selectedEvent.description}</p>
                  </div>
                )}
                
                <div className="bg-gray-500/20 border border-gray-500/30 rounded-2xl p-4">
                  <h3 className="font-bold text-gray-300 mb-2 flex items-center text-sm">
                    <span className="mr-2">ℹ️</span>
                    Event Status
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    selectedEvent.needs_enrichment 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {selectedEvent.needs_enrichment ? '📰 More information found in Hero newsletter' : '✨ Enhanced with details'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
