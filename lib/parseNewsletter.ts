import OpenAI from 'openai'
import { Event, EventSchema, OpenAIResponseSchema } from './types'
import { redis } from './db'
import { z } from 'zod'

// Only throw error if we're actually trying to use OpenAI (not during build)
const openaiKey = process.env.OPENAI_API_KEY
if (!openaiKey && process.env.NODE_ENV !== 'development') {
  console.warn('Missing OPENAI_API_KEY environment variable')
}

const openai = openaiKey ? new OpenAI({
  apiKey: openaiKey,
}) : null

const EXTRACTION_PROMPT = `You are an expert at extracting school events from newsletter content. Extract ALL date-based events from the provided newsletter text.

For each event, provide:
- title: Short, clear event name
- description: Include all relevant details (dress code, items to bring, etc.)
- start_date: YYYY-MM-DD format
- end_date: Only if multi-day event, YYYY-MM-DD format
- start_time: HH:MM format if time is mentioned
- end_time: HH:MM format if end time is mentioned
- location: If specified
- needs_enrichment: true if information is missing, vague, or references "Hero", "TBD", or similar placeholders

Important rules:
1. Only extract events with specific dates (not "next week" or "soon")
2. Convert relative dates to absolute dates based on newsletter date
3. Mark needs_enrichment=true for incomplete information
4. Include recurring events as separate entries if dates are specified
5. Be conservative - only extract clear, actionable events

Return ONLY valid JSON in this format:
{
  "events": [
    {
      "title": "Event Name",
      "description": "Event details",
      "start_date": "2024-03-15",
      "start_time": "09:00",
      "location": "School Hall",
      "needs_enrichment": false
    }
  ]
}`

export async function parseNewsletterWithGPT(content: string): Promise<Event[]> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

    // Get custom GPT prompt from Redis, fallback to default
    let promptToUse = EXTRACTION_PROMPT
    try {
      const customPrompt = await redis.get('gpt_prompt')
      if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
        promptToUse = customPrompt
        console.log('Using custom GPT prompt from admin settings')
      } else {
        console.log('Using default GPT prompt')
      }
    } catch (err) {
      console.warn('Failed to fetch custom prompt, using default:', err)
    }

    // Log GPT parsing start - removed logId dependency

    console.log('Calling OpenAI with content length:', content.length)
    console.log('OpenAI API key present:', !!process.env.OPENAI_API_KEY)
    console.log('OpenAI client initialized:', !!openai)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: promptToUse
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    console.log('OpenAI response received, choices:', completion.choices?.length || 0)

    const responseText = completion.choices[0]?.message?.content
    console.log('OpenAI response text length:', responseText?.length || 0)
    console.log('OpenAI response preview:', responseText?.substring(0, 200))
    
    if (!responseText) {
      console.error('No response content from OpenAI')
      throw new Error('No response from OpenAI')
    }

    // Parse and validate the JSON response
    let parsedResponse
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseText.trim()
      console.log('Raw response before cleaning:', cleanedResponse)
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('Cleaned response:', cleanedResponse)
      parsedResponse = JSON.parse(cleanedResponse)
      console.log('Parsed response:', parsedResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', responseText)
      console.error('Parse error:', parseError)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Validate against schema
    console.log('Validating response against schema...')
    const validatedResponse = OpenAIResponseSchema.parse(parsedResponse)
    console.log('Schema validation passed, events found:', validatedResponse.events?.length || 0)
    
    // Additional validation for each event
    const validEvents: Event[] = []
    for (const event of validatedResponse.events) {
      try {
        console.log('Validating event:', event.title)
        const validEvent = EventSchema.parse(event)
        validEvents.push(validEvent)
        console.log('Event validation passed:', event.title)
      } catch (validationError) {
        console.error('Event validation failed:', event, validationError)
        // Mark as needing enrichment if validation fails
        const fallbackEvent: Event = {
          title: event.title || 'Untitled Event',
          description: event.description || '',
          start_date: event.start_date || new Date().toISOString().split('T')[0],
          needs_enrichment: true
        }
        validEvents.push(fallbackEvent)
        console.log('Added fallback event:', fallbackEvent.title)
      }
    }

    console.log('Final valid events count:', validEvents.length)
    return validEvents

  } catch (error) {
    console.error('Error parsing newsletter with GPT:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      openaiError: error
    })
    
    // Log error for debugging
    console.error('GPT parsing failed, falling back to regex extraction')
    
    // Fallback: try regex-based extraction
    return parseNewsletterWithRegex('', content)
  }
}

// Fallback regex-based parser for when GPT fails
export function parseNewsletterWithRegex(subject: string, textBody: string): Event[] {
  const events: Event[] = []
  
  // Common date patterns
  const datePatterns = [
    /(\w+day),?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi, // Monday, March 15th, 2024
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi, // March 15th, 2024
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/gi, // 03/15/2024
    /(\d{4})-(\d{2})-(\d{2})/gi // 2024-03-15
  ]

  // Time patterns
  const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/gi

  const lines = textBody.split('\n')
  
  for (const line of lines) {
    // Skip very short lines
    if (line.trim().length < 10) continue
    
    // Look for date patterns
    for (const pattern of datePatterns) {
      const matches = Array.from(line.matchAll(pattern))
      
      for (const match of matches) {
        try {
          let dateStr = ''
          
          if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
            // Already in YYYY-MM-DD format
            dateStr = match[0]
          } else {
            // Convert to YYYY-MM-DD format
            const year = match[4] || match[3] || new Date().getFullYear().toString()
            const month = getMonthNumber(match[2] || match[1])
            const day = (match[3] || match[2]).padStart(2, '0')
            dateStr = `${year}-${month.toString().padStart(2, '0')}-${day}`
          }

          // Extract potential event title (text before the date)
          const beforeDate = line.substring(0, match.index).trim()
          const afterDate = line.substring(match.index! + match[0].length).trim()
          
          const title = beforeDate || afterDate.split('.')[0] || 'School Event'
          
          // Look for time in the same line
          const timeMatch = line.match(timePattern)
          let startTime: string | undefined
          
          if (timeMatch) {
            const hour = parseInt(timeMatch[1])
            const minute = timeMatch[2]
            const ampm = timeMatch[3]?.toLowerCase()
            
            let hour24 = hour
            if (ampm === 'pm' && hour !== 12) hour24 += 12
            if (ampm === 'am' && hour === 12) hour24 = 0
            
            startTime = `${hour24.toString().padStart(2, '0')}:${minute}`
          }

          const event: Event = {
            title: title.substring(0, 100), // Limit title length
            description: line.trim(),
            start_date: dateStr,
            start_time: startTime,
            needs_enrichment: true // Always mark regex-parsed events as needing enrichment
          }

          events.push(event)
        } catch (error) {
          console.error('Error parsing date from regex:', error)
        }
      }
    }
  }

  return events
}

function getMonthNumber(monthName: string): number {
  const months = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
  }
  
  return months[monthName.toLowerCase() as keyof typeof months] || 1
}
