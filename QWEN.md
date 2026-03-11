# Pulse Dovetail Clone - QWEN.md

## Project Overview

**Pulse Dovetail Clone** is a feedback analysis platform that aggregates qualitative data from multiple sources (Slack, CSV, Markdown) and uses Large Language Models (LLMs) to extract actionable themes, identify trends, and categorize insights into high-level topics.

### Core Purpose
- Treats every piece of feedback as a **Signal** (stored as `data_points`)
- Uses AI to cluster signals into **Themes** with sentiment analysis
- Organizes themes into **Topics** (hierarchy: Topic > Theme > Signal)
- Provides trend visualization and anomaly detection

### Tech Stack
| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Authentication | Clerk (`@clerk/nextjs`) |
| Database | Supabase (PostgreSQL + pgvector) |
| AI/LLM | OpenRouter (multi-model fallback: Gemini 2.0 Flash, Llama 3.3 70B, Mistral 7B) |
| Styling | Tailwind CSS + Shadcn UI |
| Visualization | Recharts |
| Language | TypeScript |

---

## Building and Running

### Environment Setup
Copy `.env.local.example` to `.env.local` and configure:
```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
NEXT_PUBLIC_SLACK_REDIRECT_URI=http://localhost:3000/api/slack/callback

# AI
OPENROUTER_API_KEY=  # Note: Uses OpenRouter, not direct OpenAI/Anthropic

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

### Development Commands
```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Deployment
- Deployed on **Vercel** (see `vercel.json`)
- Production builds ignore TypeScript/ESLint errors (configured in `next.config.mjs`)

---

## Architecture

### Directory Structure
```
src/
├── app/
│   ├── (dashboard)/     # Protected dashboard routes
│   │   └── channels/    # Channel management UI
│   ├── api/             # API routes
│   │   ├── alerts/      # Anomaly detection
│   │   ├── channels/    # Channel CRUD, analysis, imports
│   │   ├── data-points/ # Signal management
│   │   ├── email/       # Email digests
│   │   ├── slack/       # Slack OAuth and events
│   │   └── workspace/   # Workspace operations
│   ├── fonts/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx         # Landing page
├── components/          # React components
├── lib/                 # Core utilities
│   ├── ai.ts            # LLM theme extraction, sentiment, topics
│   ├── embeddings.ts    # Vector embedding generation
│   ├── slack.ts         # Slack API helpers
│   ├── supabase.ts      # Client-side DB
│   ├── supabase-server.ts # Server-side DB
│   └── utils.ts
├── types/
│   └── index.ts         # TypeScript interfaces
└── middleware.ts        # Clerk auth protection
```

### Data Model (from `src/types/index.ts`)
| Entity | Description |
|--------|-------------|
| `Workspace` | Top-level container for organizations |
| `Channel` | Project/stream within a workspace |
| `DataPoint` | Individual feedback signals with vector embeddings |
| `Theme` | AI-clustered groups of data points with sentiment |
| `Topic` | High-level categorization (Topic > Theme > Signal) |
| `ChannelSource` | Tracks data sources (Slack channel, CSV import) |
| `ThemeSnapshot` | Time-series data for trend charts |
| `AnomalyAlert` | Spike/drop detection alerts |
| `ChannelField` | Custom field mappings for CSV imports |

### Authentication Flow
- **Clerk** handles all authentication
- **Middleware** (`src/middleware.ts`) protects `/channels` routes
- Public routes: landing page (`/`), API endpoints
- Authenticated users are redirected to `/channels`

---

## Data Ingestion Pipelines

### 1. Slack Messages (Real-time)
- **Endpoint:** `/api/slack/events`
- **Mechanism:** Slack Events API listening for `message` events
- **Setup:**
  1. Configure Slack App with Event Subscriptions
  2. Set Request URL to `https://<domain>/api/slack/events`
  3. Subscribe to `message.channels` event
  4. Add bot scopes: `channels:history`, `groups:history`
  5. Invite bot to channels with `/invite @PulseBot`

### 2. CSV Imports
- **Endpoint:** `/api/channels/[id]/csv-import`
- **Features:**
  - Column mapping (Content, Date, custom fields)
  - Auto-detection: `select`, `number`, `date`, `text`
  - Batch processing (chunks of 100)

### 3. Markdown (Observation Nodes)
- **Endpoint:** `/api/channels/[id]/md-import`
- **Purpose:** High-density documents (interviews, long-form feedback)
- **AI Logic:** Extracts more granular themes than single messages

---

## AI Analysis Engine (`src/lib/ai.ts`)

### Theme Extraction
- **Layer 1 (`analyzeThemesLayer1`):** Product insights and UX friction (actionable)
- **Layer 2 (`analyzeThemesLayer2`):** Deep interpretive analysis (Reflexive Thematic Analysis)
- **Output:** 2-8 themes with name, summary, deep_analysis, message_ids, sentiment

### Sentiment Analysis
- Classifies each signal as `positive`, `negative`, or `neutral`
- Builds sentiment spectrum for each theme

### Topic Categorization
- `suggestTopics()`: AI suggests 3-5 broad categories
- `classifyThemesIntoTopics()`: Maps themes to topic IDs

### Multi-Model Fallback
Models tried in order (continues on failure):
1. `google/gemini-2.0-flash-001`
2. `meta-llama/llama-3.3-70b-instruct:free`
3. `mistralai/mistral-7b-instruct:free`
4. `meta-llama/llama-3.2-3b-instruct:free`
5. `google/gemma-3-27b-it:free`

---

## Database Schema (Supabase)

Key tables (see `supabase/migrations/`):
- `workspaces` - Organization containers
- `channels` - Projects/streams
- `data_points` - Raw signals + vector embeddings
- `themes` - AI clusters
- `topics` - High-level categories
- `theme_snapshots` - Daily trend data
- `data_point_themes` - Join table with relevance scores
- `channel_sources` - Source tracking
- `anomaly_alerts` - Spike/drop alerts
- `channel_fields` - Custom field mappings

---

## Development Conventions

### TypeScript
- **Strict mode** enabled (`tsconfig.json`)
- Path alias: `@/*` → `./src/*`
- Module resolution: `bundler`

### Code Style
- ESLint configured via `.eslintrc.json`
- Uses `eslint-config-next`
- Production builds ignore errors (for deployment flexibility)

### Component Patterns
- Shadcn UI components (see `components.json`)
- Tailwind CSS for styling with `tailwindcss-animate`
- Lucide React for icons

### Testing
- No test framework currently configured
- Consider adding Jest/React Testing Library for future development

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/channels` | GET/POST | Channel CRUD |
| `/api/channels/[id]/analyze` | POST | AI theme extraction |
| `/api/channels/[id]/csv-import` | POST | CSV upload |
| `/api/channels/[id]/md-import` | POST | Markdown import |
| `/api/channels/[id]/themes` | GET/POST | Theme management |
| `/api/channels/[id]/sources` | GET/POST | Source management |
| `/api/channels/[id]/snapshots` | POST | Trend snapshots |
| `/api/slack/events` | POST | Slack event handler |
| `/api/slack/callback` | GET | OAuth callback |
| `/api/alerts` | GET | Anomaly alerts |
| `/api/email` | POST | Email digests |
| `/api/workspace` | GET/POST | Workspace operations |

---

## Workflow Summary

1. **Ingest:** Signal arrives via Slack, CSV, or MD
2. **Embed:** Async job generates vector embedding
3. **Analyze:** AI clusters signals into Themes, classifies into Topics
4. **Snapshot:** System records state for trend tracking
5. **Visualize:** Dashboard shows themes with sentiment bars and growth indicators
6. **Alert:** Anomaly detection flags spikes/drops

---

## Additional Documentation

- `PROJECT_GUIDE.md` - Comprehensive architecture and workflow guide
- `CLAUDE.md` - Quick reference for Claude Code
- `TEAM_ANALYSIS_ENGINE.md` - Team analysis features
- `THEMES_GUIDE.md` - Theme extraction methodology
- `GEMINI.md` - Gemini-specific integration notes
