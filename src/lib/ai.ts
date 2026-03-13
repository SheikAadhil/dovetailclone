import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Progress callback type
type ProgressCallback = (progress: string) => void;
let globalProgressCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback | null) {
  globalProgressCallback = callback;
}

function sendProgress(progress: string) {
  if (globalProgressCallback) {
    globalProgressCallback(progress);
  }
}

// Google Gemini client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Get the Gemini model name from env or use default
const getGeminiModel = (): string => {
  return process.env.GEMINI_MODEL || "gemini-3-flash-preview";
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
      sendProgress(`Calling Gemini ${modelName}...`);

      const model = genAI.getGenerativeModel({ model: modelName });

      // Timeout for Gemini request (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        sendProgress("Waiting for AI response...");
        const result = await model.generateContent(prompt);
        clearTimeout(timeoutId);

        const response = result.response;
        const text = response.text();

        console.log(`AI response received: ${text.length} chars`);
        sendProgress(`Response received (${text.length} chars), parsing...`);

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
      sendProgress(`Gemini error: ${error.message}`);
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
      sendProgress(`Trying fallback model: ${model}...`);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT);

      try {
        sendProgress("Waiting for AI response...");
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

  sendProgress(`Preparing ${messages.length} signals for Layer 1 analysis...`);

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  sendProgress("Building Layer 1 analysis prompt...");

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

## MISSION

You are revising a theme-analysis that has important gaps and taxonomy problems.

Your job is to improve it into a complete, decision-grade analysis.

## EXPECTED CHANGES

### 1. Fix full signal accounting
- Every input signal must be represented exactly once in the primary output layer.
- Every signal must end up in one of:
  - top-level theme
  - strength
  - isolated issue
  - unassigned / ambiguous
- No signal may disappear.
- No signal may be counted twice across top-level themes.

### 2. Restore the missing signals explicitly
The revised output must account for all currently missing signals, including:
- reliability / processing failure signals
- positive strength signals
- mobile usability issues
- pricing for experimentation concerns
- role differences between managers and individual contributors

### 3. Do not let deep themes rescue top-level omissions
- If an issue appears in a deep theme but not in the product-level output, move it into the correct top-level layer.
- Deep themes must synthesize across top-level themes.
- Deep themes must not compensate for incomplete product-level coverage.

### 4. Improve theme boundaries
Review the current top-level themes and tighten any that are still over-merged.
Pay special attention to these possible problems:
- "Workflow and IA Ambiguity" may be mixing onboarding, conceptual confusion, and ongoing usability
- "Permissions and Governance" may be mixing privacy/data governance with access/permission friction
- "Actionability and Output Utility" may need clearer boundaries from prioritization and role-based reporting needs

### 5. Preserve good distinctions already found
Keep these distinctions visible when supported by the data:
- actionability vs prioritization
- trust/traceability vs analyst control
- permissions/access vs privacy/governance
- integration/ingestion vs cross-source analysis
- onboarding/IA confusion vs general usability
- automation needs vs manual-control needs
- role-based needs vs general workflow friction

### 6. Preserve positive evidence
- If users explicitly value something, it must appear in a Strengths section unless there is a strong reason not to.
- Do not output a pain-only report.

### 7. Use plain product language
- Keep top-level theme names simple and roadmap-usable.
- Avoid theatrical, philosophical, or consultant-style wording.
- Deep themes may be somewhat interpretive, but still should remain clear and useful.

### 8. Keep singleton issues visible
- If a signal does not belong in a broader theme, keep it as an isolated issue.
- Do not erase a valid signal just because it has low frequency.

### 9. Recommendations must map to evidence
For each top-level theme, give a recommendation that fits the evidence and label it as one of:
- UX fix
- IA/content fix
- model/AI improvement
- integration/platform fix
- trust/governance fix
- pricing/packaging fix
- workflow/process fix

## MANDATORY WORKFLOW

### STEP 1: Build a signal ledger
Create a hidden ledger with one row per input signal:
- signal_id
- short paraphrase
- current theme assignment if any
- revised primary bucket
- optional secondary tag
- notes on why it belongs there

### STEP 2: Run a coverage audit before rewriting
Silently verify:
- total input signals
- represented signals
- missing signals
- duplicate signals

If missing signals > 0, revise before finalizing.

### STEP 3: Revise the product-level layer
- Keep strong existing themes where they are valid.
- Split themes only where boundaries are unclear or multiple product problems are being mixed.
- Add a Strengths section if positive evidence exists.
- Add an Isolated Issues section if some signals should not be forced into broader themes.

### STEP 4: Revise the deep themes
- Make deep themes synthesize across the corrected top-level structure.
- Remove any deep theme content that is only compensating for top-level gaps.
- Use clearer, less theatrical names.

## ISSUE TYPES TO TRACK EXPLICITLY

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
- mobile usability
- onboarding friction
- conceptual/IA confusion
- prioritization needs
- manual control vs automation needs

## SPLIT TRIGGERS

Do not hide different problems inside vague themes. Split when:
- "usability and onboarding" contains both onboarding-specific AND ongoing usability issues
- "permissions and governance" mixes privacy concerns with access friction
- "actionability" blends output utility with prioritization needs
- A theme implies different product fixes for different signal subgroups

## OUTPUT FORMAT

A. Dataset accounting
- Total signals
- Represented signals
- Signals in top-level themes
- Signals in strengths
- Signals in isolated issues
- Signals in unassigned / ambiguous
- Missing signals: none or list
- Duplicate signals: none or list

B. Revised product themes
For each theme:
- Name
- Definition
- Signal IDs
- Why these signals belong together
- Representative evidence
- User need
- Product implication
- Recommendation
- Recommendation type
- Confidence

C. Strengths
For each:
- Name
- Signal IDs
- Why it matters
- How to preserve or expand it

D. Isolated issues
For each:
- Name
- Signal IDs
- Why not elevated into a broader theme
- Monitoring note

E. Unassigned / ambiguous
- Signal IDs
- Why unresolved

F. Revised deep themes
For each:
- Name
- Connected top-level themes
- What deeper pattern it explains
- Why it matters strategically
- Confidence

## FINAL QUALITY GATE

Before finalizing, silently check:
- Did I account for every signal exactly once at the primary layer?
- Did I restore the missing signals?
- Did I keep strengths visible?
- Did I stop deep themes from rescuing top-level omissions?
- Did I improve over-merged boundaries?
- Are the top-level names plain and product-usable?

If any answer is no, revise before output.

### DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap, 'primary');
}

export async function analyzeThemesLayer2(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  sendProgress(`Preparing ${messages.length} signals for Layer 2 deep analysis...`);

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  sendProgress("Building Layer 2 deep analysis prompt...");

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are an expert Qualitative Researcher specializing in Reflexive Thematic Analysis (Braun & Clarke).

STRICT OUTPUT REQUIREMENT: You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations. No introductions. Just pure JSON.

Output format must be:
{
  "deep_themes": [ { "name": "...", ... } ]
}

## MISSION

Your goal is to synthesize DEEP, LATENT, and INTERPRETIVE patterns that connect the top-level themes.

## CRITICAL CONSTRAINT

Deep themes must SYNTHESIZE across top-level themes, not RESCUE them.

- If a deep theme would contain signals that are missing from top-level, that's a TOP-LEVEL problem - fix the top-level layer first.
- Deep themes explain PATTERNS across themes, they do not fill coverage gaps.
- If you find signals that should be in top-level but aren't, note them but do not elevate them to deep themes.

## ANALYSIS PRINCIPLES (LAYER 2 - DEEP ANALYSIS)

1. INTERPRETIVE DEPTH: Go beyond the surface. Identify underlying assumptions, organizational dynamics, and systemic issues.

2. DEVELOPED THEMES: Themes must represent a pattern of shared meaning united by a central organizing concept that spans multiple top-level themes.

3. CROSS-THEME SYNTHESIS: A deep theme should connect insights from at least 2 different top-level themes. If it only explains one theme, it's not deep - it's just elaboration.

4. NO COVERAGE RESCUE: Do not let deep themes compensate for incomplete top-level coverage. If signals are missing from top-level, flag them separately.

${contextPart}

### FORMAT:
Respond ONLY with a JSON object. No other text.
JSON SCHEMA: {
  "deep_themes": [
    {
      "name": "Deep Theme Title",
      "summary": "Central Organizing Concept: 1-2 sentences on the underlying interpretive pattern.",
      "deep_analysis": "Latent Analysis: 1-2 paragraphs exploring conceptual significance, assumptions, and systemic dynamics.",
      "connected_top_level_themes": ["theme1", "theme2"],
      "message_ids": ["1", "2"],
      "sentiment": "mixed",
      "why_synthesizes": "How this connects across multiple top-level themes"
    }
  ],
  "signals_that_need_top_level_coverage": [
    { "signal_id": "1", "why_missing": "explanation" }
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
    console.log(`Raw AI response (first 500 chars): ${text.substring(0, 500)}`);
    const parsed = extractJson(text);
    console.log(`Parsed JSON keys: ${Object.keys(parsed).join(', ')}`);

    // Handle two-stage workflow format with top_level_themes or revised_product_themes
    const themesArray = parsed.top_level_themes || parsed.revised_product_themes;
    if (themesArray && Array.isArray(themesArray)) {
      console.log(`Found ${themesArray.length} top-level themes`);
      const finalThemes = themesArray.map((theme: any) => ({
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
        // Coverage reports - handle both old and new field names
        coverage_report: parsed.dataset_accounting ? {
          total_signals: parsed.dataset_accounting.total_signals,
          signals_in_top_level_themes: parsed.dataset_accounting.signals_in_top_level_themes,
          signals_in_isolated_issues: parsed.dataset_accounting.signals_in_isolated_issues,
          signals_in_strengths: parsed.dataset_accounting.signals_in_strengths,
          signals_in_unrepresented: parsed.dataset_accounting.signals_in_unassigned || parsed.dataset_accounting.signals_in_unassigned_ambiguous,
          missing_signals: parsed.dataset_accounting.missing_signals,
          duplicated_signals: parsed.dataset_accounting.duplicated_signals,
        } : (parsed.coverage_report || parsed.coverage_check),
        // Additional sections - handle both old and new field names
        latent_tensions: parsed.latent_tensions || parsed.revised_deep_themes,
        strengths: parsed.strengths,
        isolated_issues: parsed.isolated_issues,
        unassigned_ambiguous: parsed.unassigned_ambiguous || parsed.unassigned,
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
