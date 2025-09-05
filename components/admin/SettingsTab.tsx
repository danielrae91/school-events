'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Settings {
  gptPrompt?: string
  stats?: any
}

interface SettingsTabProps {
  settings: Settings
  loading: boolean
  adminToken: string
}

export default function SettingsTab({
  settings,
  loading,
  adminToken
}: SettingsTabProps) {
  const defaultPrompt = `You are an expert at extracting school events from newsletter content. Extract ALL date-based events from the provided newsletter text.

For each event, provide:
- title: Start with a relevant emoji, then short, clear event name (e.g., "🏃 Athletics Day", "📚 Book Fair", "🎭 School Play")
- description: Include all relevant details (dress code, items to bring, cost, etc.)
- start_date: YYYY-MM-DD format
- end_date: Only if multi-day event, YYYY-MM-DD format
- start_time: HH:MM format (24-hour) if time is mentioned
- end_time: HH:MM format (24-hour) if end time is mentioned
- location: If specified (e.g., "School Hall", "Library", "Playground")
- needs_enrichment: true if information is missing, vague, or references "Hero", "TBD", or similar placeholders

Emoji guidelines for titles:
- Sports/Athletics: 🏃 ⚽ 🏊 🏀 🎾 🏐 🏑 🏓
- Academic/Learning: 📚 📖 🔬 🧮 ✏️ 🎓 📝
- Arts/Performance: 🎭 🎨 🎵 🎪 🎬 🎤 🎸
- Social/Community: 🎉 🎈 🍕 🎂 👥 🤝 💬
- Meetings/Admin: 📋 👔 📊 🏛️ 📅 💼
- Special Days: 🎊 🌟 ⭐ 🎁 🎀 🏆 🥇
- Food/Lunch: 🍽️ 🥪 🍕 🌭 🧁 🍎
- Dress Up/Mufti: 👕 👗 🎭 🦸 👑 🎪
- Swimming: 🏊 💦 🌊 🏖️
- Default: 📅

Important rules:
1. ALWAYS start titles with an appropriate emoji
2. Only extract events with specific dates (not "next week" or "soon")
3. Convert relative dates to absolute dates based on newsletter context
4. Mark needs_enrichment=true for incomplete information
5. Include recurring events as separate entries if dates are specified
6. Be conservative - only extract clear, actionable events
7. Convert 12-hour times to 24-hour format (e.g., "2:30pm" becomes "14:30")
8. Extract location even if it's just "School" or general areas

Return ONLY valid JSON in this format:
{
  "events": [
    {
      "title": "🏃 Athletics Day",
      "description": "Annual school athletics competition. Wear house colors and bring water bottle.",
      "start_date": "2024-03-15",
      "start_time": "09:00",
      "end_time": "15:00",
      "location": "School Grounds",
      "needs_enrichment": false
    }
  ]
}`

  const [prompt, setPrompt] = useState(settings.gptPrompt || defaultPrompt)
  const [saving, setSaving] = useState(false)

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      })
      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        const errorData = await response.json()
        toast.error(`Failed to save settings: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreDefault = () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Restore Default Prompt</h3>
            <p className="text-sm text-slate-300">This will overwrite your current prompt with the default settings.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t)
              setPrompt(defaultPrompt)
              toast.success('Default prompt restored')
            }}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Restore
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleResetStats = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Reset Statistics</h3>
            <p className="text-sm text-slate-300">Are you sure you want to reset all usage statistics? This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
              try {
                const response = await fetch('/api/admin/reset-stats', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  toast.success('Statistics reset successfully')
                } else {
                  toast.error('Failed to reset statistics')
                }
              } catch (err) {
                console.error('Failed to reset stats:', err)
                toast.error('Failed to reset statistics')
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Reset
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleBulkRetry = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Bulk Retry Processing</h3>
            <p className="text-sm text-slate-300">This will retry processing all stored emails. This may take several minutes.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
              try {
                const response = await fetch('/api/admin/bulk-retry', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  toast.success('Bulk retry started successfully')
                } else {
                  toast.error('Failed to start bulk retry')
                }
              } catch (err) {
                console.error('Failed to start bulk retry:', err)
                toast.error('Failed to start bulk retry')
              }
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Start Retry
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleDeleteAllEvents = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Delete All Events</h3>
            <p className="text-sm text-slate-300">This will delete ALL events and reparse all stored emails. This action cannot be undone!</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
              try {
                const response = await fetch('/api/admin/delete-all-events', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  toast.success('All events deleted and reparse started successfully')
                } else {
                  toast.error('Failed to delete all events')
                }
              } catch (err) {
                console.error('Failed to delete events:', err)
                toast.error('Failed to delete all events')
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Delete All
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleDedupeEvents = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Remove Duplicate Events</h3>
            <p className="text-sm text-slate-300">This will find and delete similar events with 80%+ title similarity on the same date.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
              try {
                const response = await fetch('/api/admin/dedupe-events', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  const result = await response.json()
                  toast.success(`Deduplication completed: ${result.eventsDeleted} duplicate events removed`)
                } else {
                  toast.error('Failed to remove duplicate events')
                }
              } catch (err) {
                console.error('Failed to dedupe events:', err)
                toast.error('Failed to remove duplicate events')
              }
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Remove Duplicates
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleManualCalendarSync = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Sync to Google Calendar</h3>
            <p className="text-sm text-slate-300">This will manually sync all events to Google Calendar and check for duplicates.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t)
              try {
                const response = await fetch('/api/admin/manual-sync', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                })
                if (response.ok) {
                  const result = await response.json()
                  toast.success(`Calendar sync completed successfully. ${result.message || 'Events synced to Google Calendar.'}`)
                } else {
                  toast.error('Failed to sync calendar')
                }
              } catch (err) {
                console.error('Failed to sync calendar:', err)
                toast.error('Failed to sync calendar')
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Sync Calendar
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 mt-1">Configure system settings and manage bulk operations</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <span className="text-slate-300">Loading settings...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* GPT Prompt Settings */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              GPT Event Extraction Prompt
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  System Prompt for Event Extraction
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-3 h-32 text-white text-sm font-mono focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Enter the system prompt for GPT event extraction..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {saving ? 'Saving...' : 'Save Prompt'}
                </button>
                <button
                  onClick={handleRestoreDefault}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore Default
                </button>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          {settings.stats && (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Usage Statistics
                </h3>
                <button
                  onClick={handleResetStats}
                  className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Reset Stats
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(settings.stats).map(([key, value]) => (
                  <div key={key} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                    <div className="text-slate-400 text-sm capitalize font-medium">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white text-xl font-bold mt-1">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Operations */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                </svg>
              </div>
              Bulk Operations
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={handleBulkRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry All Emails
                </button>
                <button
                  onClick={handleDedupeEvents}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Remove Duplicates
                </button>
                <button
                  onClick={handleDeleteAllEvents}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All & Reparse
                </button>
                <button
                  onClick={handleManualCalendarSync}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sync Calendar
                </button>
              </div>
              <div className="text-sm text-slate-400">
                <p><strong>Retry All:</strong> Reprocess all stored emails to extract events</p>
                <p><strong>Delete & Reparse:</strong> Remove all events and reprocess all stored emails from scratch</p>
                <p><strong>Sync to Google Calendar:</strong> Manually sync all events to Google Calendar with deduplication</p>
              </div>
            </div>
          </div>

          {/* Statistics Management */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Statistics Management</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleResetStats}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Statistics
                </button>
              </div>
              <div className="text-sm text-slate-400">
                <p><strong>Clear Statistics:</strong> Reset all usage statistics and tracking data</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
