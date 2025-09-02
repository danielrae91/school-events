'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface EmailLog {
  id: string
  timestamp: string
  status: string
  error?: string
  emailSubject?: string
  emailFrom?: string
  createdEventsArray?: any[]
  createdEventTitlesArray?: string[]
  rawEmail?: string
  gptResponse?: string
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setAdminToken(token)
      setIsAuthenticated(true)
      fetchLogs(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchLogs = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch email logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email logs')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const token = formData.get('token') as string

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        localStorage.setItem('admin_token', token)
        setAdminToken(token)
        setIsAuthenticated(true)
        fetchLogs(token)
      } else {
        alert('Invalid admin token')
      }
    } catch (error) {
      alert('Authentication failed')
    }
  }

  const retryLog = async (logId: string) => {
    try {
      const response = await fetch('/api/admin/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ logId })
      })
      
      if (response.ok) {
        alert('Email processing retried successfully!')
        fetchLogs(adminToken)
      } else {
        alert('Failed to retry email processing')
      }
    } catch (err) {
      alert('Failed to retry email processing')
    }
  }

  const deleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return
    
    try {
      const response = await fetch(`/api/admin/email-logs/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })
      
      if (response.ok) {
        alert('Log deleted successfully!')
        fetchLogs(adminToken)
      } else {
        alert('Failed to delete log')
      }
    } catch (err) {
      alert('Failed to delete log')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Email Logs</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Token
              </label>
              <input
                type="password"
                id="token"
                name="token"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter admin token"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">📧 Email Processing Logs</h1>
          <div className="flex gap-4">
            <button
              onClick={() => fetchLogs(adminToken)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh
            </button>
            <Link
              href="/admin"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Admin Panel
            </Link>
            <Link
              href="/"
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Calendar
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-6 text-center">
            <p className="text-blue-300">No email logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div
                key={log.id || index}
                className={`bg-slate-800 border rounded-lg p-6 ${
                  log.status === 'error' 
                    ? 'border-red-500/50 bg-red-900/20' 
                    : log.status === 'success'
                    ? 'border-green-500/50 bg-green-900/20'
                    : 'border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'error' 
                          ? 'bg-red-500 text-white' 
                          : log.status === 'success'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {log.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No timestamp'}
                      </span>
                    </div>
                    
                    {log.emailSubject && (
                      <div className="mb-2">
                        <span className="text-purple-300 font-medium">Subject: </span>
                        <span className="text-white">{log.emailSubject}</span>
                      </div>
                    )}
                    
                    {log.emailFrom && (
                      <div className="mb-2">
                        <span className="text-blue-300 font-medium">From: </span>
                        <span className="text-white">{log.emailFrom}</span>
                      </div>
                    )}
                    
                    {log.createdEventTitlesArray && log.createdEventTitlesArray.length > 0 && (
                      <div className="mb-2">
                        <span className="text-green-300 font-medium">Created Events: </span>
                        <span className="text-white">{log.createdEventTitlesArray.join(', ')}</span>
                      </div>
                    )}
                    
                    {log.error && (
                      <div className="mb-2">
                        <span className="text-red-300 font-medium">Error: </span>
                        <span className="text-red-200">{log.error}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      View Details
                    </button>
                    {log.status === 'error' && (
                      <button
                        onClick={() => retryLog(log.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Email Log Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-white hover:text-gray-300 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedLog.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                    } text-white`}>
                      {selectedLog.status?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Timestamp:</span>
                    <span className="text-white ml-2">
                      {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {selectedLog.rawEmail && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Raw Email Content:</h4>
                    <pre className="bg-slate-900 p-4 rounded text-gray-300 text-xs overflow-x-auto max-h-60">
                      {selectedLog.rawEmail}
                    </pre>
                  </div>
                )}
                
                {selectedLog.gptResponse && (
                  <div>
                    <h4 className="text-white font-medium mb-2">GPT Response:</h4>
                    <pre className="bg-slate-900 p-4 rounded text-gray-300 text-xs overflow-x-auto max-h-60">
                      {selectedLog.gptResponse}
                    </pre>
                  </div>
                )}
                
                {selectedLog.createdEventsArray && selectedLog.createdEventsArray.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Created Events:</h4>
                    <div className="space-y-2">
                      {selectedLog.createdEventsArray.map((event, i) => (
                        <div key={i} className="bg-slate-900 p-3 rounded">
                          <div className="text-white font-medium">{event.title}</div>
                          <div className="text-gray-400 text-sm">
                            {event.start_date} {event.start_time && `at ${event.start_time}`}
                          </div>
                          {event.location && (
                            <div className="text-gray-400 text-sm">📍 {event.location}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedLog.error && (
                  <div>
                    <h4 className="text-red-300 font-medium mb-2">Error Details:</h4>
                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded text-red-200">
                      {selectedLog.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
