# School Newsletter to iCal Feed

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdanielrae91%2Fschool-events&env=OPENAI_API_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN,ADMIN_TOKEN)

Automated pipeline that processes school newsletter emails and generates iCal feeds for calendar subscription.

## Architecture

**Email Processing**: CloudMailin webhook → Next.js API → GPT-5 extraction → Redis storage → iCal generation

**Tech Stack**:
- Next.js 14 (App Router, TypeScript)
- CloudMailin (email-to-webhook)
- OpenAI GPT-5 (event extraction)
- Upstash Redis (event storage)
- ical-generator (calendar feeds)
- Tailwind CSS (UI)
- Zod (validation)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/danielrae91/school-events.git
cd school-events
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

**Required:**
- `OPENAI_API_KEY` - OpenAI API key
- `UPSTASH_REDIS_REST_URL` - Redis database URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis access token
- `ADMIN_TOKEN` - Admin panel password

**Optional:**
- `FEED_SECRET` - Calendar feed protection
- `CLOUDMAILIN_SECRET` - Webhook signature verification

### 3. Deploy

```bash
npm run build
```

Deploy to Vercel via GitHub integration or CLI.

## Configuration

### CloudMailin Setup
1. Create CloudMailin account
2. Create email address
3. Set target URL: `https://your-domain.vercel.app/api/inbound`
4. Choose JSON (Normalized) format
5. Forward newsletters to CloudMailin address

### Usage

**Calendar Feed**: `https://your-domain.vercel.app/calendar.ics`  
**Admin Panel**: `https://your-domain.vercel.app/admin`

## API

- `POST /api/inbound` - CloudMailin webhook
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event
- `GET /calendar.ics` - iCal feed

## Event Schema

```typescript
{
  id: string              // Auto-generated hash
  title: string           // Event name
  description?: string    // Event details
  start_date: string      // YYYY-MM-DD
  end_date?: string       // YYYY-MM-DD (optional)
  start_time?: string     // HH:MM (optional)
  end_time?: string       // HH:MM (optional)
  location?: string       // Event location (optional)
  needs_enrichment: boolean // Requires manual review
  created_at: string      // ISO timestamp
  updated_at: string      // ISO timestamp
}
```

## Implementation

**GPT-5 Extraction**: Processes newsletter content to extract structured event data with fallback regex parsing.

**Deduplication**: Events are deduplicated using content hashing (title + date).

**Storage**: Redis ZSET for chronological event retrieval.

**Feed Generation**: Standard iCal format compatible with all calendar applications.

## License

MIT
