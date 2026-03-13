# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Pulse Dovetail Clone** - a feedback analysis platform that aggregates qualitative data from multiple sources (Slack, CSV, Markdown) and uses LLMs to extract actionable themes, identify trends, and categorize insights into topics.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Authentication:** Clerk (middleware protects `/channels` routes)
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI/LLM:** OpenRouter via `src/lib/ai.ts` (multi-model fallback: Gemini 2.0 Flash, Llama 3.3 70B, Mistral 7B)
- **Styling:** Tailwind CSS + Shadcn UI components
- **Visualization:** Recharts
- **Email:** Resend (weekly digest)
- **CSV Parsing:** Papaparse

## Common Commands

```bash
# Development
npm run dev           # Start development server at http://localhost:3000
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Database (Supabase)
npx supabase start    # Start local Supabase instance
npx supabase db reset # Reset local database
```

## Environment Variables

Required environment variables in `.env.local`:

- **Authentication:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Database:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Slack:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`
- **AI:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (defaults to `gemini-3-flash-preview`), `OPENROUTER_API_KEY` (fallback only)
- **Email:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **App:** `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`

Copy `.env.local.example` to `.env.local` and fill in values.

## Architecture

### Data Model (see `src/types/index.ts`)

- **Workspace** - Top-level container for organizations
- **Channel** - Project/stream within a workspace (`channels` table)
- **DataPoint** - Individual feedback signals stored in `data_points` with vector embeddings
- **Theme** - AI-clustered groups of data points with sentiment analysis
- **Topic** - High-level categorization for themes (Topic > Theme > Signal hierarchy)
- **ChannelSource** - Tracks data sources (Slack channel, CSV import)
- **ThemeSnapshot** - Time-series data for trend charts
- **AnomalyAlert** - Spike/drop detection alerts
- **ChannelField** - Custom field definitions for CSV imports (text, select, date, number types)

### Key API Routes (`src/app/api/`)

**Channel Management:**
- `/api/channels` - Channel CRUD
- `/api/channels/[id]` - Single channel operations
- `/api/channels/[id]/analyze` - AI theme extraction
- `/api/channels/[id]/csv-import` - CSV upload with column mapping
- `/api/channels/[id]/md-import` - Markdown/observation node import
- `/api/channels/[id]/backfill` - Historical Slack message sync

**Themes & Topics:**
- `/api/channels/[id]/themes` - Theme CRUD
- `/api/channels/[id]/themes/[themeId]` - Theme operations
- `/api/channels/[id]/themes/[themeId]/assign` - Assign signals to theme
- `/api/channels/[id]/themes/[themeId]/copy` - Copy theme content to clipboard
- `/api/channels/[id]/themes/merge` - Merge multiple themes
- `/api/channels/[id]/topics` - Topic CRUD
- `/api/channels/[id]/enhance-context` - Update AI context

**Data & Sources:**
- `/api/channels/[id]/sources` - Source management
- `/api/channels/[id]/fields` - Custom field definitions
- `/api/data-points/[id]` - Individual data point CRUD
- `/api/data-points/embed` - Generate embeddings

**Snapshots & Alerts:**
- `/api/channels/[id]/snapshots` - Trend snapshots
- `/api/channels/[id]/snapshots/create` - Create snapshot
- `/api/channels/[id]/snapshots/generate-history` - Generate historical data
- `/api/alerts` - Anomaly detection alerts

**Integrations:**
- `/api/slack/events` - Slack Events API for real-time ingestion
- `/api/slack/install` - Slack app installation
- `/api/slack/callback` - OAuth callback
- `/api/slack/channels` - List Slack channels
- `/api/email/digest` - Weekly digest email

**Testing:**
- `/api/channels/[id]/test-digest-slack` - Test Slack webhook notifications

**Workspace:**
- `/api/workspace/usage` - Usage statistics

### Core Libraries (`src/lib/`)

- `ai.ts` - LLM theme extraction, sentiment analysis, topic categorization with multi-model fallback via OpenRouter
- `supabase.ts` / `supabase-server.ts` - Database client
- `embeddings.ts` - Vector embedding generation for semantic search
- `slack.ts` - Slack API helpers
- `utils.ts` - Shared utility functions (cn, formatting)

### Authentication Flow

The app uses Clerk for auth. The middleware (`src/middleware.ts`) protects all `/channels` routes. Public routes include the landing page and API endpoints.

## UI Components

UI components are in `src/components/ui/` (Shadcn) and feature-specific components in `src/components/channels/`:
- **Shadcn components:** button, card, dialog, dropdown-menu, input, select, tabs, etc.
- **Channel components:** MessageCard, ThemeCard, ChannelCard, CSVImportDialog, ThemeDrawer, SourcesPanel

## Data Ingestion

1. **Slack** - Real-time via Events API (`/api/slack/events`) or manual sync
2. **CSV** - Multi-part upload with column mapping to Content/Date/custom fields
3. **Markdown** - High-density "Observation Nodes" (interviews, long-form feedback)

## AI Analysis Pipeline

The analysis uses:
- **Gemini** (via Google AI) for primary and reviewer models - configured with `GEMINI_API_KEY` and `GEMINI_MODEL` env vars
- **OpenRouter** for fallback models (if Gemini fails) - uses `OPENROUTER_API_KEY`

1. Signals are ingested as DataPoints with vector embeddings
2. `/analyze` endpoint clusters signals into 2-8 themes with sentiment classification
3. Topics are suggested (3-5 broad buckets) and themes are classified into topics
4. ThemeSnapshots record daily state for trend visualization
5. Results stream back to client via Server-Sent Events (SSE)

## Sensing (Strategic Foresight)

A separate tool for strategic foresight research accessible at `/sensing`:
- AI-powered research queries to discover weak signals and trends
- Categories: Signals, Weak Signals, Trends, Drivers
- Results can be copied to a channel as DataPoints
- API routes: `/api/sensing`, `/api/sensing/[id]`, `/api/sensing/[id]/execute`, `/api/sensing/copy-to-channel`

## Alerts & Notifications

- **Anomaly Detection** (`/api/alerts`) - Spike/drop detection based on `alert_threshold_percent`
- **Weekly Digest** (`/api/email/digest`) - Email summaries via Resend
- **Slack Digest** (`/api/channels/[id]/test-digest-slack`) - Slack webhook notifications

## Database

Supabase migrations in `supabase/migrations/`:
- `001_initial_schema.sql` - Core tables (workspaces, channels, data_points, themes, topics)
- `002_channel_enhancements.sql` - Additional features (sources, alerts, fields, snapshots)

Run local Supabase with: `npx supabase start`
