# AGENTS.md - Developer Guidelines

This document provides guidance for agentic coding agents working in this repository.

## Project Overview

**Pulse Dovetail Clone** - A feedback analysis platform that aggregates qualitative data from multiple sources (Slack, CSV, Markdown) and uses LLMs to extract actionable themes, identify trends, and categorize insights into topics.

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode enabled)
- **Authentication:** Clerk
- **Database:** Supabase (PostgreSQL + pgvector)
- **Styling:** Tailwind CSS + Shadcn UI

---

## Commands

### Development
```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

To fix lint errors automatically: `npx next lint --fix`

### Testing
No test framework is configured. To add tests, install Vitest (recommended):
```bash
npm install -D vitest @vitejs/plugin-react
```
Then run a single test: `npx vitest run src/path/to/test.test.ts`

---

## Code Style Guidelines

### General Principles
- Follow existing patterns in the codebase
- Use TypeScript strictly - avoid `any` types
- Keep components small and focused
- Use functional components with hooks
- Avoid comments unless explaining complex logic

### TypeScript
- Always use explicit types for function parameters and return types
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` - use `unknown` if type is truly unknown
- Strict mode is enabled in tsconfig.json

```typescript
// Good
function getChannel(id: string): Promise<Channel | null>

// Bad
function getChannel(id: any)
```

### Imports
Use path alias `@/*` for imports from src. Order imports:
1. React/Next imports
2. Third-party libraries
3. Local imports (using `@` alias)

```typescript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { clsx } from 'clsx'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Channel } from '@/types'
```

### Naming Conventions
- **Files:** camelCase for utilities, PascalCase for components
- **Components:** PascalCase
- **Functions/variables:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE
- **Interfaces/Types:** PascalCase (avoid `I` prefix)

### React/Next.js Patterns
- Use functional components with hooks
- Server components go in `app/` directory
- Use `"use client"` directive for client-side interactivity
- Prefer Server Actions over API routes for mutations

```typescript
"use client"
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Error Handling
- Use try/catch with async/await
- Provide user-friendly error messages
- Log errors appropriately (console.error for dev)

```typescript
try {
  const { data, error } = await supabase.from('channels').select('*')
  if (error) throw error
  return data
} catch (err) {
  console.error('Failed to fetch channels:', err)
  throw new Error('Unable to load channels. Please try again.')
}
```

### Database (Supabase)
- Use the Supabase client from `@/lib/supabase`
- Handle null values appropriately
- Use TypeScript types from `@/types`

### API Routes
- Place in `src/app/api/` directory
- Use Next.js App Router route handlers (route.ts)
- Return proper HTTP status codes
- Validate inputs using Zod

### Tailwind CSS
- Use shadcn/ui components when available
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow mobile-first responsive design

---

## File Organization

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/   # React components (UI, features)
│   └── ui/        # Shadcn UI components
├── lib/           # Utilities, clients, helpers
├── types/         # TypeScript type definitions
└── middleware.ts  # Clerk auth middleware
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@clerk/nextjs` | Authentication |
| `@supabase/supabase-js` | Database client |
| `recharts` | Data visualization |
| `lucide-react` | Icons |
| `date-fns` | Date utilities |

---

## Getting Started

1. Run `npm install` to install dependencies
2. Copy `.env.example` to `.env.local` and configure env vars
3. Run `npm run dev` to start development server
4. Access at http://localhost:3000
