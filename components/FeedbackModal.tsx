'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { toast } from 'sonner'

interface FeedbackModalProps {
  onClose: () => void
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Entrance animation
    const tl = gsap.timeline()
    tl.fromTo(overlayRef.current, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.3, ease: "power2.out" }
    )
    .fromTo(modalRef.current, 
      { opacity: 0, scale: 0.9, y: 50 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }, 
      "-=0.1"
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${screen.width}x${screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ipAddress: 'client-side' // Will be replaced server-side
        }),
      })

      if (response.ok) {
        setName('')
        setEmail('')
        setMessage('')
        toast.success('Thank you for your message!')
        onClose()
      } else {
        toast.error('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Exit animation
    const tl = gsap.timeline()
    tl.to(modalRef.current, 
      { opacity: 0, scale: 0.9, y: 50, duration: 0.3, ease: "power2.in" }
    )
    .to(overlayRef.current, 
      { opacity: 0, duration: 0.2, ease: "power2.in" }, 
      "-=0.1"
    )
    .call(() => onClose())
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Contact Us</h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Your message or question..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
