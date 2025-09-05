'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StoredEvent } from '@/lib/types'
import EventForm from '@/components/admin/EventForm'
import EventsTab from '@/components/admin/EventsTab'
import SuggestionsTab from '@/components/admin/SuggestionsTab'
import MessagesTab from '@/components/admin/FeedbackTab'
import LogsTab from '@/components/admin/LogsTab'
import SettingsTab from '@/components/admin/SettingsTab'
import NotificationsTab from '@/components/admin/NotificationsTab'
import { gsap } from 'gsap'
import { toast } from 'sonner'

interface Suggestion {
  id: string
  title: string
  description?: string
  location?: string
  start_date: string
  start_time?: string
  end_date?: string
  end_time?: string
  created_at: string
}

interface MessageItem {
  id: string
  name: string
  email: string
  message: string
  timestamp: string
  userAgent: string
  platform: string
  language: string
  screenResolution: string
  viewport: string
  timezone: string
  ipAddress: string
  country: string
  city: string
  isRead: boolean
  created_at: string
}

interface EmailLog {
  id: string
  subject: string
  status: string
  error?: string
  created_at: string
  processed_at?: string
}

function AdminPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminToken, setAdminToken] = useState('')
  const [loginToken, setLoginToken] = useState('')
  
  // UI state
  const [activeTab, setActiveTab] = useState<'events' | 'suggestions' | 'messages' | 'logs' | 'settings' | 'notifications'>('events')
  const [loading, setLoading] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Data state
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [settings, setSettings] = useState<any>({})
  
  // Selection state
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [selectedLogs, setSelectedLogs] = useState<string[]>([])
  
  // Modal state
  const [editingEvent, setEditingEvent] = useState<StoredEvent | null>(null)
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditSuggestionModal, setShowEditSuggestionModal] = useState(false)
  
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check URL params for tab
    const tab = searchParams.get('tab')
    if (tab && ['events', 'suggestions', 'messages', 'logs', 'settings', 'notifications'].includes(tab)) {
      setActiveTab(tab as any)
    }
    
    const token = localStorage.getItem('admin_token')
    if (token) {
      setAdminToken(token)
      setIsAuthenticated(true)
      fetchEventsWithToken(token)
    }
  }, [searchParams])

  useEffect(() => {
    // Initial admin panel animations - only run when authenticated and refs are available
    if (isAuthenticated && headerRef.current && tabsRef.current && contentRef.current) {
      const tl = gsap.timeline()
      tl.fromTo(headerRef.current, 
        { opacity: 0, y: -30 }, 
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      )
      .fromTo(tabsRef.current, 
        { opacity: 0, x: -50 }, 
        { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 
        "-=0.3"
      )
      .fromTo(contentRef.current, 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 
        "-=0.2"
      )
    }
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    setError('')
    
    // Simple validation first
    if (!loginToken.trim()) {
      setError('Please enter admin token')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: loginToken })
      })
      
      if (response.ok) {
        localStorage.setItem('admin_token', loginToken)
        setAdminToken(loginToken)
        setIsAuthenticated(true)
        fetchEventsWithToken(loginToken)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError('Invalid token')
      }
    } catch (err) {
      console.error('Network or other error during login:', err)
      setError('Login failed - network error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setAdminToken('')
    setLoginToken('')
  }

  // Data fetching functions
  const fetchEventsWithToken = async (token: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestionsWithToken = async (token: string) => {
    setSuggestionsLoading(true)
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
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const fetchMessagesWithToken = async (token: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch('/api/admin/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const fetchLogsWithToken = async (token: string) => {
    setLogsLoading(true)
    try {
      const response = await fetch('/api/admin/email-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEmailLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchSettingsWithToken = async (token: string) => {
    setSettingsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Event handlers
  const handleSaveEvent = async (eventData: Partial<StoredEvent>) => {
    try {
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : '/api/admin/events'
      const method = editingEvent ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })
      
      if (response.ok) {
        setEditingEvent(null)
        setShowAddForm(false)
        fetchEventsWithToken(adminToken)
      }
    } catch (err) {
      console.error('Failed to save event:', err)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!adminToken) return
    
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'delete', eventId })
      })
      
      if (response.ok) {
        fetchEventsWithToken(adminToken)
      }
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }

  const deleteSelectedEvents = async () => {
    if (!adminToken || selectedEvents.length === 0) return
    
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'bulk_delete', eventIds: selectedEvents })
      })
      setSelectedEvents([])
      fetchEventsWithToken(adminToken)
    } catch (err) {
      console.error('Failed to bulk delete events:', err)
    }
  }

  const bulkDeleteMessages = async () => {
    toast.promise(
      (async () => {
        const response = await fetch('/api/admin/messages', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messageIds: selectedMessages })
        })
        
        if (!response.ok) throw new Error('Failed to delete messages')
        
        setSelectedMessages([])
        fetchMessagesWithToken(adminToken)
        return `Deleted ${selectedMessages.length} message items`
      })(),
      {
        loading: `Deleting ${selectedMessages.length} message items...`,
        success: (message) => message,
        error: 'Failed to delete message items'
      }
    )
  }

  const bulkDeleteLogs = async () => {
    toast.promise(
      (async () => {
        await Promise.all(selectedLogs.map(id => 
          fetch(`/api/admin/logs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
          })
        ))
        setSelectedLogs([])
        fetchLogsWithToken(adminToken)
        return `Deleted ${selectedLogs.length} log entries`
      })(),
      {
        loading: `Deleting ${selectedLogs.length} log entries...`,
        success: (message) => message,
        error: 'Failed to delete log entries'
      }
    )
  }

  const cleanupRedis = async () => {
    toast.promise(
      (async () => {
        const response = await fetch('/api/admin/cleanup', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })
        if (!response.ok) throw new Error('Cleanup failed')
        return 'Redis cleanup completed successfully'
      })(),
      {
        loading: 'Cleaning up Redis cache...',
        success: (message) => message,
        error: 'Failed to cleanup Redis cache'
      }
    )
  }


  // Selection handlers
  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    )
  }

  const toggleLogSelection = (logId: string) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    )
  }

  const selectAllEvents = () => {
    setSelectedEvents(events.map(e => e.id))
  }

  const selectAllMessages = () => {
    setSelectedMessages(messages.map(f => f.id))
  }

  const selectAllLogs = () => {
    setSelectedLogs(emailLogs.map(l => l.id))
  }

  const clearSelection = () => {
    setSelectedEvents([])
    setSelectedMessages([])
    setSelectedLogs([])
  }

  const approveSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'approve', suggestionId })
      })
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (err) {
      console.error('Failed to approve suggestion:', err)
    }
  }

  const rejectSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reject', suggestionId })
      })
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (err) {
      console.error('Failed to reject suggestion:', err)
    }
  }

  const editSuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      setEditingSuggestion(suggestion)
      setShowEditSuggestionModal(true)
    }
  }

  // Tab change handler
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    clearSelection()
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin?${params.toString()}`, { scroll: false })
    
    if (tab === 'suggestions' && suggestions.length === 0) {
      fetchSuggestionsWithToken(adminToken)
    } else if (tab === 'messages' && messages.length === 0) {
      fetchMessagesWithToken(adminToken)
    } else if (tab === 'logs' && emailLogs.length === 0) {
      fetchLogsWithToken(adminToken)
    } else if (tab === 'settings' && !settings.prompt) {
      fetchSettingsWithToken(adminToken)
    }
  }

  // Suggestion handlers
  const handleEditSuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      setEditingSuggestion(suggestion)
      setShowEditSuggestionModal(true)
    }
  }

  const handleApproveSuggestion = (suggestionId: string) => {
    fetchSuggestionsWithToken(adminToken)
    fetchEventsWithToken(adminToken)
  }

  const handleRejectSuggestion = (suggestionId: string) => {
    fetchSuggestionsWithToken(adminToken)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="password"
              value={loginToken}
              onChange={(e) => setLoginToken(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Password"
              required
            />
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                if (!loginToken.trim()) {
                  e.preventDefault()
                  setError('Please enter admin token')
                  return
                }
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Simplified Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <a 
              href="/" 
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </a>
            <h1 className="text-xl font-semibold text-white">Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            Logout
          </button>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-center">
            <div className="bg-slate-800/50 rounded-xl p-2 border border-slate-700/50">
              <div className="flex gap-1">
                {(['events', 'logs', 'messages', 'suggestions', 'notifications', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm ${
                      activeTab === tab
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {tab === 'events' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {tab === 'suggestions' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                    {tab === 'messages' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {tab === 'logs' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {tab === 'notifications' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l10.586 10.586c.781.781 2.047.781 2.828 0l1.414-1.414c.781-.781.781-2.047 0-2.828L9.07 2.758c-.781-.781-2.047-.781-2.828 0L4.828 4.172c-.781.781-.781 2.047 0 2.828z" />
                      </svg>
                    )}
                    {tab === 'settings' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <span className="capitalize">{tab}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="bg-slate-800/50 rounded-xl p-2 border border-slate-700/50">
              <div className="grid grid-cols-3 gap-1">
                {(['events', 'logs', 'messages', 'suggestions', 'notifications', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-2 py-3 rounded-lg font-medium transition-all duration-200 flex flex-col items-center gap-1 text-xs ${
                      activeTab === tab
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {tab === 'events' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {tab === 'logs' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {tab === 'messages' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {tab === 'logs' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {tab === 'notifications' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l10.586 10.586c.781.781 2.047.781 2.828 0l1.414-1.414c.781-.781.781-2.047 0-2.828L9.07 2.758c-.781-.781-2.047-.781-2.828 0L4.828 4.172c-.781.781-.781 2.047 0 2.828z" />
                      </svg>
                    )}
                    {tab === 'settings' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <span className="capitalize">{tab === 'messages' ? 'msgs' : tab === 'notifications' ? 'notifs' : tab}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div ref={contentRef} className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl"></div>
          <div className="relative p-8 rounded-3xl">
          {activeTab === 'events' && (
            <EventsTab
              events={events}
              selectedEvents={selectedEvents}
              loading={loading}
              onRefresh={() => fetchEventsWithToken(adminToken)}
              onAddEvent={() => setShowAddForm(true)}
              onEditEvent={setEditingEvent}
              onDeleteEvent={deleteEvent}
              onBulkDelete={deleteSelectedEvents}
              onToggleSelection={toggleEventSelection}
              onSelectAll={selectAllEvents}
              onClearSelection={clearSelection}
            />
          )}

          {activeTab === 'suggestions' && (
            <SuggestionsTab
              suggestions={suggestions}
              loading={suggestionsLoading}
              adminToken={adminToken}
              onRefresh={() => fetchSuggestionsWithToken(adminToken)}
              onEditSuggestion={editSuggestion}
              onApproveSuggestion={approveSuggestion}
              onRejectSuggestion={rejectSuggestion}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesTab
              messages={messages}
              selectedMessages={selectedMessages}
              loading={messagesLoading}
              onRefresh={() => fetchMessagesWithToken(adminToken)}
              onBulkDelete={bulkDeleteMessages}
              onToggleSelection={toggleMessageSelection}
              onSelectAll={selectAllMessages}
              onClearSelection={clearSelection}
              onMarkAsRead={(messageId: string) => {
                // Extract just the ID part if it includes the prefix
                const cleanId = messageId.startsWith('message:') ? messageId.substring(8) : messageId
                fetch(`/api/admin/messages/${cleanId}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ isRead: true })
                }).then(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, isRead: true } : msg
                  ))
                }).catch(console.error)
              }}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab
              emailLogs={emailLogs}
              selectedLogs={selectedLogs}
              loading={logsLoading}
              adminToken={adminToken}
              onRefresh={() => fetchLogsWithToken(adminToken)}
              onBulkDelete={bulkDeleteLogs}
              onToggleSelection={toggleLogSelection}
              onSelectAll={selectAllLogs}
              onClearSelection={clearSelection}
              onCleanupRedis={cleanupRedis}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab adminToken={adminToken} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              loading={settingsLoading}
              adminToken={adminToken}
            />
          )}
          </div>
        </div>

        {/* Modals */}
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

        {/* Edit Suggestion Modal */}
        {showEditSuggestionModal && editingSuggestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              <h3 className="text-lg font-medium mb-4 text-white">Edit Suggestion Before Approval</h3>
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
                        setShowEditSuggestionModal(false)
                        fetchSuggestionsWithToken(adminToken)
                        fetchEventsWithToken(adminToken)
                      }
                    } catch (err) {
                      console.error('Failed to approve edited suggestion:', err)
                    }
                  }}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                        <input
                          name="title"
                          type="text"
                          defaultValue={suggestion.title}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={suggestion.description || ''}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 h-24 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                        <input
                          name="location"
                          type="text"
                          defaultValue={suggestion.location || ''}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                          <input
                            name="start_date"
                            type="date"
                            defaultValue={suggestion.start_date}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                          <input
                            name="start_time"
                            type="time"
                            defaultValue={suggestion.start_time || ''}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                          <input
                            name="end_date"
                            type="date"
                            defaultValue={suggestion.end_date || ''}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                          <input
                            name="end_time"
                            type="time"
                            defaultValue={suggestion.end_time || ''}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Approve & Create Event
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSuggestion(null)
                          setShowEditSuggestionModal(false)
                        }}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
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
        
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPageContent />
    </Suspense>
  )
}
