'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  chunkError: boolean
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, chunkError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Loading CSS chunk')
    
    return {
      hasError: true,
      chunkError: isChunkError
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chunk loading error:', error, errorInfo)
    
    // If it's a chunk error, reload the page after a short delay
    if (this.state.chunkError) {
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.chunkError) {
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
          <div className="text-center">
            <h2 className="text-white text-xl mb-4">Something went wrong</h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
