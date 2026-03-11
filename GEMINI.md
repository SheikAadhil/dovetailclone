# Pulse Dovetail Clone: Senior Engineer's Guide

This document provides foundational context for AI agents and developers working on the Pulse Dovetail Clone project.

## Project Overview
Pulse Dovetail Clone is a qualitative feedback analysis platform designed to aggregate feedback "signals" from Slack, CSV, and Markdown, then synthesize them into actionable insights using Large Language Models (LLMs).

### Core Mission
- **De-noising Feedback:** Clustering high volumes of messages into coherent themes.
- **Deep Analysis:** Moving beyond surface-level summaries to identify latent organizational patterns and systemic issues.
- **Trend Visualization:** Tracking sentiment and volume changes over time.

---

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Authentication:** Clerk
- **Database:** Supabase (PostgreSQL + pgvector for semantic search)
- **AI Engine:** OpenRouter (Multi-model fallback: Gemini 2.0 Flash [Preferred], Llama 3.3 70B, Mistral 7B)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Email:** Resend + React Email

---

## Key Architectural Concepts

### 1. Data Signals (`data_points`)
Every piece of incoming feedback is a **Signal**.
- **Slack:** Real-time ingestion via Event Subscriptions (`/api/slack/events`).
- **CSV:** Bulk import with column mapping (`/api/channels/[id]/csv-import`).
- **Markdown:** High-density "Observation Nodes" (e.g., transcripts) (`/api/channels/[id]/md-import`).

### 2. Analysis Layers (`src/lib/ai.ts`)
The system uses a dual-layer analysis approach:
- **Layer 1: Product Insights:** Actionable feedback, bugs, and UI friction points.
- **Layer 2: Deep Analysis:** Interpretive patterns based on **Braun & Clarke’s Reflexive Thematic Analysis** (e.g., "Invisible Labor", "Ownership Gaps").

### 3. Theme Hierarchy
- **Topic:** High-level bucket (e.g., "Onboarding", "UX/UI").
- **Theme:** A synthesized insight representing a cluster of signals.
- **Signal:** The raw evidence (linked via `data_point_themes`).

### 4. Vector Embeddings
Messages are embedded in Supabase using `pgvector` (1536 dimensions) to support semantic search and duplication detection.

---

## Building and Running

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Required variables (refer to `.env.local.example`):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- `OPENROUTER_API_KEY`
- `SLACK_SIGNING_SECRET` & `SLACK_BOT_TOKEN`
- `CRON_SECRET` (for securing analysis endpoints)

---

## Development Conventions

### 1. AI Implementation
- **Fallback Logic:** Always check `src/lib/ai.ts` when modifying AI behavior. The system uses a model array to handle rate limits or provider failures.
- **JSON Stability:** The `extractJson` helper is used to clean AI responses that might include markdown code blocks or preamble text.

### 2. Database & RLS
- All tables have **Row Level Security (RLS)** enabled.
- Workspace-level multi-tenancy is enforced: users can only access data belonging to workspaces where they are the owner.

### 3. Styling & UI
- Use **Tailwind CSS** for layout and **shadcn/ui** for core components.
- Themes utilize a custom **Sentiment Spectrum** (CSS progress bars) to visualize the positive/neutral/negative mix.

### 4. TODOs & Future Improvements
- [ ] **Tests:** Implement unit and integration tests (Playwright/Jest).
- [ ] **Semantic Search:** Improve the embedding generation pipeline.
- [ ] **Model Selection:** Expose model selection to users in channel settings.

---

## Key Files for Reference
- `src/lib/ai.ts`: The core AI prompting and multi-model logic.
- `src/app/api/channels/[id]/analyze/route.ts`: Main analysis workflow.
- `TEAM_ANALYSIS_ENGINE.md`: Detailed framework for thematic analysis logic.
- `PROJECT_GUIDE.md`: Higher-level project goals and setup instructions.
- `supabase/migrations/001_initial_schema.sql`: Database source of truth.
