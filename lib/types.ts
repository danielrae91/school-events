import { z } from 'zod'

// Event schema for validation
export const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  location: z.string().optional(),
  needs_enrichment: z.boolean().default(false)
})

export type Event = z.infer<typeof EventSchema>

export interface StoredEvent extends Event {
  id: string
  created_at: string
  updated_at: string
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
