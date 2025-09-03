'use client'

import { useState } from 'react'

interface Settings {
  prompt?: string
  stats?: any
}

interface SettingsTabProps {
  settings: Settings
  loading: boolean
  adminToken: string
  onRefresh: () => void
}

export default function SettingsTab({
  settings,
  loading,
  adminToken,
  onRefresh
}: SettingsTabProps) {
  const [prompt, setPrompt] = useState(settings.prompt || '')
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
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
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
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to reset stats:', err)
      alert('Failed to reset statistics')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <button
          onClick={onRefresh}
          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
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
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Prompt'}
              </button>
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

          {/* System Information */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <h3 className="text-lg font-medium text-white mb-4">System Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Environment:</span>
                <span className="text-white">{process.env.NODE_ENV || 'development'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Updated:</span>
                <span className="text-white">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
