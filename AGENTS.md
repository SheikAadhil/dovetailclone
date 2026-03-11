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
- **Linting:** ESLint (next/core-web-vitals, next/typescript)

---

## Commands

### Development

```bash
npm run dev           # Start development server at http://localhost:3000
npm run build         # Build for production
npm run start         # Start production server
```

### Linting & Type Checking

```bash
npm run lint          # Run ESLint
```

To fix lint errors automatically where possible:

```bash
npx next lint --fix
```

### Testing

**No test framework is currently configured.** To add tests, install one of:

```bash
# Vitest (recommended for Next.js)
npm install -D vitest @vitejs/plugin-react

# Jest
npm install -D jest @testing-library/react @testing-library/jest-dom
```

To run a single test file once a test framework is added:

```bash
# Vitest
npx vitest run src/path/to/test.test.ts

# Jest
npx jest src/path/to/test.test.ts
```

---

## Code Style Guidelines

### General Principles

- Follow existing patterns in the codebase
- Use TypeScript strictly - avoid `any` types
- Keep components small and focused
- Use functional components with hooks

### TypeScript

- Always use explicit types for function parameters and return types
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` - use `unknown` if type is truly unknown
- Enable strict mode in tsconfig (already enabled)

```typescript
// Good
function getChannel(id: string): Promise<Channel | null>

// Avoid
function getChannel(id: any) // No!
```

### Imports

- Use path alias `@/*` for imports from src (configured in tsconfig)
- Order imports: external libraries, then relative paths
- Group imports: React/Next imports, third-party, then local

```typescript
// 1. React/Next
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// 2. Third-party
import { clsx } from 'clsx'
import { ChevronRight } from 'lucide-react'

// 3. Local (using @ alias)
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Channel } from '@/types'
```

### Naming Conventions

- **Files:** camelCase for utilities, PascalCase for components
  - `useAuth.ts` (hook), `ChannelList.tsx` (component)
- **Components:** PascalCase
- **Functions/variables:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE
- **Interfaces:** PascalCase, prefix with `I` only when ambiguous (avoid `IUser`)
- **Types:** PascalCase

### React/Next.js Patterns

- Use functional components with hooks
- Place server components in `app/` directory
- Use `"use client"` directive for client-side interactivity
- Prefer Server Actions over API routes for mutations when possible

```typescript
// Client component
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
- Log errors appropriately (console.error for dev, proper logging in production)

```typescript
// Good
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
- Use proper TypeScript types from `@/types`

### API Routes

- Place in `src/app/api/` directory
- Use Next.js App Router route handlers (route.ts)
- Return proper HTTP status codes
- Validate inputs using Zod or similar

```typescript
// src/app/api/channels/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('channels').select('*')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
```

### Tailwind CSS

- Use shadcn/ui components when available
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow mobile-first responsive design

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)} />
```

### Environment Variables

- Never commit secrets to repository
- Use `.env.local` for local development
- Document required env vars in `.env.example`

---

## File Organization

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components (UI, features)
│   └── ui/        # Shadcn UI components
├── lib/           # Utilities, clients, helpers
├── types/         # TypeScript type definitions
└── middleware.ts # Clerk auth middleware
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

## Getting Started for Agents

1. Run `npm install` to install dependencies
2. Copy `.env.example` to `.env.local` and configure env vars
3. Run `npm run dev` to start development server
4. Access at http://localhost:3000

For database setup, see `supabase/migrations/` for schema.
