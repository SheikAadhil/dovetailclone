import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Google Gemini client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Get the Gemini model name from env or use default
const getGeminiModel = (): string => {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
};

// OpenRouter client for fallback models
const getOpenRouterClient = () => {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Pulse Dovetail Clone",
    },
  });
};

// Get fallback models from environment variables
const getFallbackModels = (): string[] => {
  const envModel = process.env.FALLBACK_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-8b-instruct:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return fallbacks;
};

async function getCompletion(prompt: string, modelSet: 'primary' | 'reviewer' | 'fallback' = 'primary') {
  // Primary and Reviewer models use Gemini directly
  if (modelSet === 'primary' || modelSet === 'reviewer') {
    try {
      const genAI = getGeminiClient();
      const modelName = getGeminiModel();
      console.log(`Using Gemini: ${modelName} (${modelSet} set)`);

      const model = genAI.getGenerativeModel({ model: modelName });

      // Timeout for Gemini request (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const result = await model.generateContent(prompt);
        clearTimeout(timeoutId);

        const response = result.response;
        const text = response.text();

        // Convert Gemini response to OpenAI-compatible format
        return {
          choices: [{
            message: {
              content: text,
              role: "assistant" as const
            }
          }]
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.warn(`Gemini failed for ${modelSet}: ${error.message}`);
      throw error;
    }
  }

  // Fallback models use OpenRouter
  const models = getFallbackModels();
  const client = getOpenRouterClient();
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

  // Timeout for each model attempt (in ms)
  const MODEL_TIMEOUT = 120000; // 2 minutes per model

  let lastError: any;
  for (const model of models) {
    try {
      console.log(`Trying model: ${model} (fallback set)`);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT);

      try {
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }, {
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed: ${error.message}`);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("All models failed");
}

function extractJson(text: string) {
  // Handle empty or non-string input
  if (!text || typeof text !== 'string') {
    throw new Error("Invalid response: empty or non-string");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Invalid response: empty after trim");
  }

  try {
    // 1. Try direct parse
    return JSON.parse(trimmed);
  } catch (e) {
    // 2. Try to find the first '{' and last '}'
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const jsonStr = trimmed.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (e2) {
        // 3. Try to find the first '[' and last ']' if it returned an array
        const startArr = trimmed.indexOf('[');
        const endArr = trimmed.lastIndexOf(']');
        if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
          try {
            const arrStr = trimmed.substring(startArr, endArr + 1);
            return JSON.parse(arrStr);
          } catch (e3) {
            // 4. Try removing markdown code blocks
            const withoutMarkdown = trimmed
              .replace(/```json\n?/gi, '')
              .replace(/```\n?/g, '');
            try {
              return JSON.parse(withoutMarkdown);
            } catch (e4) {
              // 5. Try finding any balanced JSON-like structure
              const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  return JSON.parse(jsonMatch[0]);
                } catch (e5) {
                  // Ignore
                }
              }
            }
          }
        }
      }
    }
    // Log the problematic response for debugging
    console.error("Failed to parse AI response:", trimmed.substring(0, 500));
    throw new Error("Could not find valid JSON in AI response");
  }
}

export async function analyzeThemesLayer1(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  const prompt = `You are a rigorous qualitative analysis engine.

STRICT OUTPUT REQUIREMENT: You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations. No introductions. Just pure JSON.

Output format must be:
{
  "dataset_accounting": { ... },
  "top_level_themes": [ ... ],
  ...
}

If you cannot produce valid JSON for any reason, output: {"error": "reason"}

Now produce the analysis:

You are revising a theme-analysis output that is currently too compressed and incomplete.

Your primary goal is not to make the report shorter or cleaner.

Your primary goal is to make the analysis complete, auditable, and decision-grade.

CURRENT FAILURE MODE TO CORRECT

The current analysis is over-compressing the top-level themes.

It creates a neat-looking summary by merging too many issues into broad buckets and silently dropping important signals.

You must fix that.

MANDATORY CORRECTIONS

1. Do not drop signals

- Every signal must be represented exactly once at the primary analysis layer.

- Every signal must end in one of:

  - top-level theme

  - isolated issue

  - positive strength

  - unassigned / ambiguous

- No silent omissions.

- If a signal does not fit a major theme, keep it visible as an isolated issue or unassigned signal.

2. Do not over-compress top-level themes

- Do not force the dataset into too few themes.

- If broad themes hide important distinctions, split them.

- A neat 4-theme output is worse than a complete 8-theme output if the 4-theme version loses signal coverage.

3. Restore missing issue types when present

Make sure the analysis preserves these as distinct concerns when supported by data:

- reliability / processing bugs

- integration friction

- privacy / data governance concerns

- notification overload

- pricing for experimentation

- positive strengths

- analyst control features like rename / merge / split

- actionability gaps

- trust / traceability

- permissions / access issues

- role-based needs

- cross-source deduplication

- regional filtering / segmentation

4. Split broad buckets when needed

Do not hide different problems inside vague themes like:

- "usability and onboarding"

- "grouping and filtering"

- "general friction"

If the grouped signals imply different product fixes, separate them.

5. Preserve positive evidence

- If users explicitly value a feature, keep it in a Strengths section.

- Do not output a pain-only report.

6. Handle singleton issues honestly

- If a pattern has only one signal, keep it as an isolated issue unless it is strategically important enough to elevate.

- Do not inflate weak evidence into big themes.

- Do not erase singleton issues either.

7. Deep themes cannot compensate for missing top-level coverage

- If an issue appears in deep analysis but not in top-level themes, fix the top-level layer first.

- Deep themes must synthesize top-level themes, not rescue missing signal coverage.

8. Plain naming only

- Use clear product-usable names.

- Avoid theatrical or consultant-style labels.

- Theme names must make sense in a roadmap review.

9. Recommendations must match evidence

For each theme, give a recommendation that is proportional to the evidence and label it as one of:

- UX fix

- IA/content fix

- model/AI improvement

- integration/platform fix

- trust/governance fix

- pricing/packaging fix

- workflow/process fix

REQUIRED WORKFLOW

STEP 1: Build a signal ledger

Create a hidden ledger with one row per signal:

- signal_id

- paraphrase

- primary issue

- optional secondary issue

- role/stakeholder if visible

- source type if visible

- final bucket:

  - top-level theme

  - isolated issue

  - positive strength

  - unassigned / ambiguous

STEP 2: Validate coverage

Before writing any narrative, silently verify:

- total input signals = total represented signals

- missing signals = 0

- duplicate signals = 0

If validation fails, revise the clustering before writing the output.

STEP 3: Rebuild top-level themes

- Create as many themes as the evidence supports.

- Do not optimize for fewer themes.

- Split themes when they hide distinct product problems.

- Merge themes only when they truly represent the same issue.

STEP 4: Separate layers

Produce:

- top-level themes

- strengths

- isolated issues

- unassigned / ambiguous

- latent tensions

Latent tensions must connect multiple top-level themes.

They must not replace missing top-level themes.

OUTPUT FORMAT

A. Dataset accounting

- Total signals

- Represented signals

- Signals in top-level themes

- Signals in strengths

- Signals in isolated issues

- Signals in unassigned / ambiguous

- Missing signals: none or list

- Duplicate signals: none or list

B. Top-level themes

For each theme:

- Name

- Definition

- Signal IDs

- Message count

- Why these signals belong together

- Representative evidence

- User need

- Product implication

- Recommendation

- Recommendation type

- Confidence

C. Strengths

For each strength:

- Name

- Signal IDs

- Why it matters

- How to preserve or expand it

D. Isolated issues

For each issue:

- Name

- Signal IDs

- Why not elevated into a broader theme

- Monitoring note

E. Unassigned / ambiguous

- Signal IDs

- Why unresolved

F. Latent tensions

For each tension:

- Name

- Connected top-level themes

- What deeper pattern it explains

- Why it matters strategically

- Confidence

FINAL QUALITY GATE

Before finalizing, silently verify:

- Did I account for every signal?

- Did I avoid over-compressing the top-level taxonomy?

- Did I preserve positive signals?

- Did I keep singleton issues visible?

- Did I prevent deep themes from hiding top-level omissions?

- Are recommendations tied directly to evidence?

If any answer is no, revise before output.

### DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap, 'primary');
}

export async function analyzeThemesLayer2(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are an expert Qualitative Researcher specializing in Reflexive Thematic Analysis (Braun & Clarke).

STRICT OUTPUT REQUIREMENT: You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations. No introductions. Just pure JSON.

Output format must be:
{
  "themes": [ { "name": "...", ... } ]
}

Your goal is to extract Deep, Latent, and Interpretive patterns from these signals.

${contextPart}

### ANALYSIS PRINCIPLES (LAYER 2 - DEEP ANALYSIS):
1. INTERPRETIVE DEPTH: Go beyond the surface. Identify underlying assumptions, organizational dynamics, and systemic issues (e.g. "Invisible Labor", "The Silence Paradox").
2. DEVELOPED THEMES: Themes must represent a pattern of shared meaning united by a central organizing concept.
3. REFLEXIVITY: Actively interpret the data. What is being said *implicitly*?

### FORMAT: 
Respond ONLY with a JSON object. No other text.
JSON SCHEMA: { 
  "themes": [ 
    { 
      "name": "Deep Theme Title", 
      "summary": "Central Organizing Concept: 1-2 sentences on the underlying interpretive pattern.", 
      "deep_analysis": "Latent Analysis: 1-2 paragraphs exploring conceptual significance, assumptions, and systemic dynamics.",
      "message_ids": ["1", "2"], 
      "sentiment": "mixed" 
    } 
  ] 
}

### DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap, 'reviewer');
}

async function performAnalysis(prompt: string, idMap: Map<string, string>, modelSet: 'primary' | 'reviewer' | 'fallback' = 'primary'): Promise<ThemeResult[]> {
  try {
    const response = await getCompletion(prompt, modelSet);
    const text = response.choices[0].message.content || "{}";
    const parsed = extractJson(text);

    // Handle two-stage workflow format with top_level_themes
    if (parsed.top_level_themes && Array.isArray(parsed.top_level_themes)) {
      const finalThemes = parsed.top_level_themes.map((theme: any) => ({
        name: theme.name,
        summary: theme.definition || theme.summary || "",
        deep_analysis: theme.implication || theme.product_implication || theme.recommendation || "",
        message_ids: (theme.signal_ids || theme.message_ids || [])
          .map((sid: any) => idMap.get(sid.toString()))
          .filter((realId: any) => !!realId),
        sentiment: theme.sentiment || 'neutral',
        message_count: theme.message_count,
        why_together: theme.why_this_is_one_theme || theme.why_together,
        evidence: theme.representative_evidence || theme.evidence,
        user_need: theme.user_team_need || theme.user_need,
        product_implication: theme.implication || theme.product_implication,
        implication: theme.implication,
        recommendation: theme.recommendation,
        recommendation_type: theme.recommendation_type,
        confidence: theme.confidence,
        supporting_categories: theme.supporting_categories,
        representative_evidence: theme.representative_evidence,
        // Two-stage workflow fields
        dataset_accounting: parsed.dataset_accounting,
        first_cycle_coding: parsed.first_cycle_coding,
        categories: parsed.categories,
        reviewer_handoff: parsed.reviewer_handoff,
        // Coverage reports
        coverage_report: parsed.dataset_accounting ? {
          total_signals: parsed.dataset_accounting.total_signals,
          signals_in_top_level_themes: parsed.dataset_accounting.signals_in_top_level_themes,
          signals_in_isolated_issues: parsed.dataset_accounting.signals_in_isolated_issues,
          signals_in_strengths: parsed.dataset_accounting.signals_in_strengths,
          signals_in_unrepresented: parsed.dataset_accounting.signals_in_unassigned,
          missing_signals: parsed.dataset_accounting.missing_signals,
          duplicated_signals: parsed.dataset_accounting.duplicated_signals,
        } : (parsed.coverage_report || parsed.coverage_check),
        // Additional sections
        latent_tensions: parsed.latent_tensions,
        strengths: parsed.strengths,
        isolated_issues: parsed.isolated_issues,
        unassigned_ambiguous: parsed.unassigned_ambiguous,
        unrepresented_needs_review: parsed.unrepresented_needs_review
      }));
      return finalThemes;
    }

    // Legacy format handling
    const rawThemes = Array.isArray(parsed) ? parsed : (parsed.themes || []);

    const finalThemes = rawThemes.map((theme: any) => ({
      ...theme,
      deep_analysis: theme.deep_analysis || theme.analysis || "",
      message_ids: (theme.message_ids || [])
        .map((sid: any) => idMap.get(sid.toString()))
        .filter((realId: any) => !!realId)
    }));

    return finalThemes;
  } catch (error) {
    console.error('AI Theme Analysis failed:', error);
    return [];
  }
}

export async function analyzeSentiment(content: string): Promise<'positive' | 'negative' | 'neutral' | null> {
  const systemPrompt = "Classify the sentiment of the message as exactly one word: positive, negative, or neutral.";
  const userPrompt = `Message: "${content}"`;
  try {
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
    const result = response.choices[0].message.content?.trim().toLowerCase();
    if (result?.includes('positive')) return 'positive';
    if (result?.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    return 'neutral';
  }
}

export async function suggestTopics(themes: { name: string; summary: string }[]): Promise<{ name: string; description: string }[]> {
  if (themes.length === 0) return [];

  const systemPrompt = `You are a Senior Team Researcher. Based on a set of developed themes, your task is to identify 3-5 broad, logical Topic Categories that provide a coherent structure for the analysis.
Each topic should represent a distinct facet of team dynamics or organizational health.

FORMAT: Respond ONLY with a valid JSON object.
JSON SCHEMA: { "topics": [ { "name": "Topic Name", "description": "Max 200 chars explaining the scope of this category." } ] }`;

  const userPrompt = `Based on these developed themes, suggest high-level Topics:\n${JSON.stringify(themes)}`;

  try {
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
    const text = response.choices[0].message.content || "{}";
    const parsed = extractJson(text);
    return parsed.topics || [];
  } catch (error) {
    console.error('AI Topic Suggestions failed:', error);
    return [];
  }
}

export async function classifyThemesIntoTopics(themes: { id: string; name: string; summary: string }[], topics: { id: string; name: string; description: string | null }[]): Promise<{ theme_id: string; topic_id: string | null }[]> {
  if (themes.length === 0 || topics.length === 0) return [];

  const systemPrompt = `You are classifying themes into topics.
Assign each theme to the most appropriate topic ID from the list. If none fit, use null.
Respond ONLY with a JSON array: [ { "theme_id": "...", "topic_id": "..." } ]`;

  const userPrompt = `TOPICS:\n${JSON.stringify(topics)}\n\nTHEMES:\n${JSON.stringify(themes)}`;

  try {
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
    const text = response.choices[0].message.content || "[]";
    const parsed = extractJson(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('AI Topic Classification failed:', error);
    return [];
  }
}

export interface ThemeResult {
  name: string;
  summary: string;
  deep_analysis: string;
  message_ids: string[];
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';

  // Two-stage workflow fields
  dataset_accounting?: {
    total_signals: number;
    represented_signals: number;
    signals_in_top_level_themes: number;
    signals_in_strengths: number;
    signals_in_isolated_issues: number;
    signals_in_unassigned: number;
    duplicated_signals: string | string[];
    missing_signals: string | string[];
  };
  first_cycle_coding?: Array<{
    signal_id: string;
    paraphrase: string;
    source: string;
    primary_code: string;
    secondary_codes?: string[];
    notes?: string;
  }>;
  categories?: Array<{
    name: string;
    signal_ids: string[];
    codes: string[];
    why_grouped: string;
    evidence_strength: 'strong' | 'moderate' | 'weak';
  }>;
  reviewer_handoff?: {
    likely_weak_spots?: string[];
    possible_over_merges?: string[];
    signals_needing_challenge?: string[];
    rival_interpretations?: string[];
    confidence_risks?: string[];
  };
  // Coverage report (new format)
  coverage_report?: {
    total_signals: number;
    signals_in_top_level_themes: number;
    signals_in_isolated_issues: number;
    signals_in_strengths: number;
    signals_in_unrepresented: number;
    missing_signals: string | string[];
    duplicated_signals: string | string[];
  };
  // Legacy coverage check
  coverage_check?: {
    total_signals: number;
    signals_in_top_level_themes: number;
    signals_in_strengths: number;
    signals_in_isolated_issues: number;
    unrepresented_signals: string | string[];
    duplicate_signals: string | string[];
  };
  // Theme-specific fields
  message_count?: number;
  why_together?: string;
  evidence?: string[];
  user_need?: string;
  user_team_need?: string;
  product_implication?: string;
  implication?: string;
  recommendation?: string;
  recommendation_type?: 'UX fix' | 'IA/content fix' | 'model/AI improvement' | 'integration/platform fix' | 'trust/governance fix' | 'pricing/packaging fix';
  confidence?: 'High' | 'Medium' | 'Low';
  supporting_categories?: string[];
  representative_evidence?: string[];
  // Additional sections
  latent_tensions?: Array<{
    name: string;
    deeper_pattern?: string;
    connected_themes: string[];
    strategic_importance?: string;
    strategic_implication?: string;
    strategic_meaning?: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  strengths?: Array<{
    name?: string;
    signal_ids?: string[];
    description?: string;
    what_users_value?: string;
    why_it_matters?: string;
    evidence?: string;
    how_to_preserve?: string;
    preserve_expand_note?: string;
  }>;
  isolated_issues?: Array<{
    name?: string;
    signal_ids?: string[];
    issue?: string;
    why_not_grouped?: string;
    why_not_elevated?: string;
    what_to_monitor?: string;
    monitoring_note?: string;
    reason_not_elevated?: string;
    signal_id?: string;
  }>;
  unassigned_ambiguous?: Array<{
    signal_id: string;
    reason: string;
  }>;
  unrepresented_needs_review?: Array<{
    signal_id: string;
    signal_content: string;
    reason: string;
  }>;
}
