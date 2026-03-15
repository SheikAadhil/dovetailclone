-- FEATURE: Advanced Theme Analysis Engine

-- Add theme-specific fields
ALTER TABLE themes
ADD COLUMN IF NOT EXISTS scope text,
ADD COLUMN IF NOT EXISTS confidence text CHECK (confidence IN ('High', 'Medium', 'Low')),
ADD COLUMN IF NOT EXISTS product_implication text,
ADD COLUMN IF NOT EXISTS recommendation_direction text,
ADD COLUMN IF NOT EXISTS recommendation_type text CHECK (recommendation_type IN ('UX fix', 'IA/content fix', 'model/AI improvement', 'integration/platform fix', 'trust/governance fix', 'pricing/packaging fix', 'workflow/process fix')),
ADD COLUMN IF NOT EXISTS user_need text,
ADD COLUMN IF NOT EXISTS representative_evidence jsonb DEFAULT '[]'; -- JSON array of strings

-- Add global analysis fields to channels
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS latent_tensions jsonb DEFAULT '[]', -- JSON array of objects
ADD COLUMN IF NOT EXISTS strengths jsonb DEFAULT '[]', -- JSON array of objects
ADD COLUMN IF NOT EXISTS isolated_issues jsonb DEFAULT '[]'; -- JSON array of objects
