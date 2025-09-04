'use client'

import { useState } from 'react'

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
        alert('Settings saved successfully')
        // Settings saved successfully
      } else {
        const errorData = await response.json()
        alert(`Failed to save settings: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreDefault = () => {
    if (confirm('Are you sure you want to restore the default prompt? This will overwrite your current prompt.')) {
      setPrompt(defaultPrompt)
    }
  }

  const handleResetStats = async () => {
    if (!confirm('Are you sure you want to reset all usage statistics?')) return
    
    try {
      const response = await fetch('/api/admin/reset-stats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        alert('Statistics reset successfully')
        // Settings saved successfully
      }
    } catch (err) {
      console.error('Failed to reset stats:', err)
      alert('Failed to reset statistics')
    }
  }

  const handleBulkRetry = async () => {
    if (!confirm('Are you sure you want to retry processing all stored emails? This may take several minutes.')) return
    
    try {
      const response = await fetch('/api/admin/bulk-retry', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        alert('Bulk retry started successfully')
        // Settings saved successfully
      }
    } catch (err) {
      console.error('Failed to start bulk retry:', err)
      alert('Failed to start bulk retry')
    }
  }

  const handleDeleteAllEvents = async () => {
    if (!confirm('Are you sure you want to delete ALL events and reparse all stored emails? This action cannot be undone.')) return
    
    try {
      const response = await fetch('/api/admin/delete-all-events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        alert('All events deleted and reparse started successfully')
        // Settings saved successfully
      }
    } catch (err) {
      console.error('Failed to delete events:', err)
      alert('Failed to delete all events')
    }
  }

  const handleManualCalendarSync = async () => {
    if (!confirm('Are you sure you want to manually sync all events to Google Calendar? This will check for duplicates and update the calendar.')) return
    
    try {
      const response = await fetch('/api/admin/manual-sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        const result = await response.json()
        alert(`Calendar sync completed successfully. ${result.message || 'Events synced to Google Calendar.'}`)
        // Settings saved successfully
      } else {
        const errorData = await response.json()
        alert(`Failed to sync calendar: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to sync calendar:', err)
      alert('Failed to sync calendar')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading settings...</div>
      ) : (
        <div className="space-y-6">
          {/* GPT Prompt Settings */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <h3 className="text-lg font-medium text-white mb-4">GPT Event Extraction Prompt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  System Prompt for Event Extraction
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 h-32 text-white text-sm font-mono"
                  placeholder="Enter the system prompt for GPT event extraction..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Prompt'}
                </button>
                <button
                  onClick={handleRestoreDefault}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Usage Statistics</h3>
                <button
                  onClick={handleResetStats}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Reset Stats
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(settings.stats).map(([key, value]) => (
                  <div key={key} className="bg-slate-800 rounded-lg p-3">
                    <div className="text-slate-400 text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white text-lg font-semibold">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Operations */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <h3 className="text-lg font-medium text-white mb-4">Bulk Operations</h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBulkRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry All Stored Emails
                </button>
                <button
                  onClick={handleDeleteAllEvents}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All Events & Reparse
                </button>
                <button
                  onClick={handleManualCalendarSync}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sync to Google Calendar
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
