'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
    
    // Check if it's a chunk loading error and auto-reload
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk')) {
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }, [error])

  // Check if it's a chunk loading error
  const isChunkError = error.name === 'ChunkLoadError' || 
                      error.message.includes('Loading chunk') ||
                      error.message.includes('Loading CSS chunk')

  if (isChunkError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-white text-lg mb-2">Loading updated content...</h2>
          <p className="text-slate-400 text-sm">The page will refresh automatically</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-white text-xl mb-4">Something went wrong!</h2>
        <p className="text-slate-400 mb-6 text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}
