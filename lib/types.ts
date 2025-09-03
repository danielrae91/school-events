import { z } from 'zod'

// Event schema for validation
export const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().nullable().optional().refine(
    (val) => !val || val === '' || /^\d{4}-\d{2}-\d{2}$/.test(val),
    'Invalid date format (YYYY-MM-DD)'
  ),
  start_time: z.string().nullable().optional().refine(
    (val) => !val || val === '' || /^\d{2}:\d{2}$/.test(val),
    'Invalid time format (HH:MM)'
  ),
  end_time: z.string().nullable().optional().refine(
    (val) => !val || val === '' || /^\d{2}:\d{2}$/.test(val),
    'Invalid time format (HH:MM)'
  ),
  location: z.string().nullable().optional(),
  needs_enrichment: z.boolean().default(false)
})

export type Event = z.infer<typeof EventSchema>

export interface StoredEvent {
  id: string
  title: string
  description?: string
  location?: string
  start_date: string
  start_time?: string
  end_date?: string
  end_time?: string
  created_at: string
  updated_at: string
  needs_enrichment?: boolean
  source?: string
}

// CloudMailin inbound webhook payload (JSON Normalized format)
export interface CloudMailinInbound {
  envelope: {
    to: string
    from: string
    recipients: string[]
    helo_domain: string
    remote_ip: string
    spf?: {
      result: string
      domain: string
    }
    tls?: boolean
  }
  headers: {
    return_path: string
    received: string[]
    date: string
    from: string
    to: string
    message_id: string
    subject: string
    mime_version?: string
    content_type?: string
    delivered_to?: string
    received_spf?: string
    authentication_results?: string
    user_agent?: string
  }
  plain: string
  html?: string
  reply_plain?: string
  attachments?: Array<{
    content: string
    file_name: string
    content_type: string
    size: number
    disposition: string
  }>
}

// OpenAI response schema
export const OpenAIResponseSchema = z.object({
  events: z.array(EventSchema)
})

export type OpenAIResponse = z.infer<typeof OpenAIResponseSchema>

// Email log types
export interface EmailLog {
  id: string
  from: string
  subject: string
  messageId: string
  timestamp: string
  status: 'received' | 'processing' | 'completed' | 'failed' | 'success' | 'error' | 'processing_gpt' | 'processing_events'
  stage: string
  retryCount: number
  createdEvents: string
  createdEventTitles: string
  updatedAt: string
  emailContent: string
  error?: string
  errorDetails?: string
  errorType?: string
  eventsProcessed?: number
  eventsExtracted?: number
  processingStarted?: string
  gptCompleted?: string
  completedAt?: string
  failedAt?: string
}

// Feedback types
export interface Feedback {
  id: string
  type: 'feedback' | 'bug' | 'feature'
  message: string
  email?: string
  userAgent?: string
  ipAddress?: string
  timestamp: string
}

// Stats types
export interface Stats {
  totalEvents: number
  eventsThisWeek: number
  lastUpdate: string
}

// Form data types for admin
export interface EventFormData {
  title: string
  description?: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  needs_enrichment?: boolean
}
