# Pulse Dovetail Clone: Master Project Guide

This document serves as the comprehensive guide for the Pulse Dovetail Clone project, detailing its architecture, data processing pipelines, AI engine, and visualization strategies.

---

## 1. Project Overview
Pulse Dovetail Clone is a feedback analysis platform that aggregates qualitative data from multiple sources (Slack, CSV, Markdown) and uses Large Language Models (LLMs) to extract actionable themes, identify trends, and categorize insights into high-level topics.

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Authentication:** Clerk
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI/LLM:** OpenRouter (Multi-model fallback: Llama 3, Gemini, Mistral)
- **Styling:** Tailwind CSS + Shadcn UI
- **Visualization:** Recharts

---

## 2. Data Signals & Ingestion
The project treats every incoming piece of feedback as a **Signal** (stored as `data_points`).

### A. Slack Messages
- **Mechanism:** Slack Events API (`/api/slack/events`).
- **Processing:** Listens for `message` events in authorized channels.
- **Metadata:** Captures sender identity, timestamp, and channel source.
- **Automation:** Automatically triggers vector embedding generation for semantic search.

### B. CSV Imports
- **Mechanism:** Multipart form-data upload (`/api/channels/[id]/csv-import`).
- **Features:** 
  - **Column Mapping:** Users map CSV columns to "Content", "Date", and custom metadata fields.
  - **Type Detection:** Automatically detects if a column is a `select` (category), `number`, `date`, or `text`.
  - **Batching:** Processes large files in chunks of 100 to ensure stability.

### C. Markdown (Observation Nodes)
- **Mechanism:** File upload (`/api/channels/[id]/md-import`).
- **Concept:** These are treated as "Observation Nodes"—high-density documents (e.g., user interview transcripts, long-form feedback).
- **AI Logic:** The analyzer recognizes these as "high-density" and is instructed to extract more granular themes than it would from a single Slack message.

---

## 3. AI Analysis Engine
The core intelligence resides in `src/lib/ai.ts` and the `/analyze` API route.

### Theme Extraction (`analyzeThemes`)
- **Process:** The LLM receives a batch of signals and groups them into 2-8 logical themes.
- **Relevance:** Each theme includes a name, summary, and the specific IDs of the signals that support it.
- **Sentiment:** AI classifies the overall sentiment of each signal (Positive, Negative, Neutral) to build a "Sentiment Spectrum" for each theme.

### Topic Categorization
- **Topics:** High-level buckets (e.g., "Performance", "UX/UI", "Pricing").
- **Workflow:** 
  1. AI suggests 3-5 broad topics based on the extracted themes.
  2. AI then "classifies" each theme into one of these topics.
  3. This creates a hierarchy: **Topic > Theme > Signal**.

### Multi-Model Resilience
The system uses a fallback array of models (Llama 3.3 70B, Gemini 2.0 Flash, etc.) via OpenRouter. If one model fails or is rate-limited, it automatically tries the next one.

---

## 4. Visualization & Trends
Insights are visualized to help researchers identify what matters quickly.

### A. Theme Cards
- **Sentiment Spectrum:** A progress-bar style visualization showing the mix of Positive (Green), Neutral (Gray), and Negative (Red) signals within a theme.
- **Pinning:** Important themes can be pinned to the top of the dashboard.
- **Manual Adjustments:** Users can manually edit summaries or merge themes if the AI-generated results need refinement.

### B. Theme Drawer & Deep Dives
- **Analyze Messages:** Clicking a theme opens a side drawer (`ThemeDrawer.tsx`) showing every original signal (Slack msg, CSV row) linked to that theme.
- **Volume Trends:** A sparkline chart (using Recharts) shows the frequency of the theme over time, calculated from daily `theme_snapshots`.

### C. Trend Indicators
- **Rising/Falling:** The system calculates the percentage change in signal volume vs. the previous week.
- **Anomaly Alerts:** Automatically detects "Spikes" or "Drops" in feedback volume for specific themes.

---

## 5. Database Architecture
Key relationships in the Supabase schema:
- **`channels`**: The root container for a specific project/stream.
- **`channel_sources`**: Tracks where data comes from (Slack channel ID or a specific CSV filename).
- **`data_points`**: The raw content + vector embeddings for semantic similarity.
- **`themes`**: Aggregated clusters of data points.
- **`theme_snapshots`**: Time-series data for trend charts.
- **`data_point_themes`**: Join table mapping signals to themes with relevance scores.

---

## 6. Workflow Summary
1. **Ingest:** Signal arrives via Slack, CSV, or MD.
2. **Embed:** Asynchronous job generates a vector embedding for the signal.
3. **Analyze:** AI clusters signals into Themes and classifies them into Topics.
4. **Snapshot:** System records the state for trend tracking.
5. **Visualize:** User sees a dashboard of themes with sentiment bars and growth indicators.
