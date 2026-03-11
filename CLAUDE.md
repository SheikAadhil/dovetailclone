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

## Common Commands

```bash
# Development
npm run dev           # Start development server at http://localhost:3000
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
```

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

### Key API Routes (`src/app/api/`)

- `/api/channels` - Channel CRUD
- `/api/channels/[id]/analyze` - AI theme extraction
- `/api/channels/[id]/csv-import` - CSV upload with column mapping
- `/api/channels/[id]/md-import` - Markdown/observation node import
- `/api/channels/[id]/themes` - Theme CRUD
- `/api/channels/[id]/sources` - Source management
- `/api/channels/[id]/snapshots` - Trend snapshots
- `/api/slack/events` - Slack Events API for real-time ingestion
- `/api/slack/callback` - OAuth callback
- `/api/alerts` - Anomaly detection alerts
- `/api/email` - Email digest sending
- `/api/workspace` - Workspace operations

### Core Libraries (`src/lib/`)

- `ai.ts` - LLM theme extraction, sentiment analysis, topic categorization with multi-model fallback
- `supabase.ts` / `supabase-server.ts` - Database client
- `embeddings.ts` - Vector embedding generation for semantic search
- `slack.ts` - Slack API helpers

### Authentication Flow

The app uses Clerk for auth. The middleware (`src/middleware.ts`) protects all `/channels` routes. Public routes include the landing page and API endpoints.

## Data Ingestion

1. **Slack** - Real-time via Events API (`/api/slack/events`) or manual sync
2. **CSV** - Multi-part upload with column mapping to Content/Date/custom fields
3. **Markdown** - High-density "Observation Nodes" (interviews, long-form feedback)

## AI Analysis Pipeline

1. Signals are ingested as DataPoints with vector embeddings
2. `/analyze` endpoint clusters signals into 2-8 themes with sentiment classification
3. Topics are suggested (3-5 broad buckets) and themes are classified into topics
4. ThemeSnapshots record daily state for trend visualization

## Database

Supabase migrations in `supabase/migrations/`:
- `001_initial_schema.sql` - Core tables
- `002_channel_enhancements.sql` - Additional features (fields, sources, alerts, etc.)
