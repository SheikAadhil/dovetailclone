import OpenAI from "openai";

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

// Get models from environment variables, with fallbacks
const getPrimaryModels = (): string[] => {
  const envModel = process.env.PRIMARY_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    ...fallbacks
  ];
};

const getReviewerModels = (): string[] => {
  const envModel = process.env.REVIEWER_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-001"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return [
    "google/gemini-2.0-flash-001",
    ...fallbacks
  ];
};

const getFallbackModels = (): string[] => {
  const envModel = process.env.FALLBACK_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return fallbacks;
};

async function getCompletion(prompt: string, modelSet: 'primary' | 'reviewer' | 'fallback' = 'primary') {
  const models = modelSet === 'primary' ? getPrimaryModels() :
                modelSet === 'reviewer' ? getReviewerModels() :
                getFallbackModels();

  const client = getOpenRouterClient();
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

  // Timeout for each model attempt (in ms)
  const MODEL_TIMEOUT = 120000; // 2 minutes per model

  let lastError: any;
  for (const model of models) {
    try {
      console.log(`Trying model: ${model} (${modelSet} set)`);

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
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try to find the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (e2) {
        // 3. Try to find the first '[' and last ']' if it returned an array
        const startArr = text.indexOf('[');
        const endArr = text.lastIndexOf(']');
        if (startArr !== -1 && endArr !== -1) {
          const arrStr = text.substring(startArr, endArr + 1);
          return JSON.parse(arrStr);
        }
      }
    }
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

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are a rigorous qualitative analysis engine for mixed-source signal analysis.

Your job is to analyze a dataset of signals and produce a complete, auditable theme analysis.

You must behave like a disciplined qualitative analyst, not a generic summarizer.

This prompt supports a two-stage workflow:
- Stage 1: First-pass analysis, coding, clustering, and theme generation
- Stage 2: Review, audit, challenge, and correction of the first-pass output

You are performing STAGE 1: PRIMARY ANALYSIS.

${contextPart}

==================================================
GLOBAL RULES
==================================================

1. Coverage first
- Every signal must be represented exactly once in the primary analysis layer.
- Every signal must end up in one of:
  - top-level theme
  - isolated issue
  - positive strength
  - unassigned / ambiguous
- Never silently omit a signal.

2. Code before theming
- Do not jump directly to themes.
- Move through this sequence: signal -> code -> category -> theme

3. Evidence before interpretation
- Every theme must be supported by real evidence from the dataset.

4. Theme count must be data-derived
- Do not impose any fixed limit on the number of themes.
- Return as many themes as the evidence supports.
- Do not compress distinct issues just to make the output shorter.

5. Distinguish analytical levels
- Codes are close to the data.
- Categories group related codes.
- Themes explain broader patterns of shared meaning.
- Latent tensions explain deeper cross-theme dynamics.

6. Preserve important distinctions when supported by data
- theme quality vs trust/traceability
- privacy/governance vs permissions/access
- import/integration friction vs export/sharing friction
- onboarding vs ongoing usability
- actionability vs workflow confusion
- role-based needs vs automation/manual-control tension

7. Preserve strengths
- If the dataset contains positive signals, include them explicitly.

8. Handle weak evidence honestly
- If a pattern has only one signal, treat it as an isolated issue unless highly consequential.

9. Avoid narrative inflation
- Prefer plain, product-usable names.

==================================================
STAGE 1: PRIMARY ANALYSIS
==================================================

PHASE 1: DATASET FAMILIARIZATION
- Read all signals before finalizing any themes.
- Note source mix, role mix, context, contradictions, and outliers.

PHASE 2: SIGNAL LEDGER
Build a ledger with one row per signal containing:
- signal_id
- short paraphrase
- source
- primary issue
- signal type: pain point / request / workaround / concern / strength / ambiguity

PHASE 3: FIRST-CYCLE CODING
For each signal, create:
- primary code
- optional secondary code(s)
- short evidence note

PHASE 4: CODE CONSOLIDATION
- merge duplicates
- separate look-alike codes with different meanings
- identify positive codes separately

PHASE 5: CATEGORY BUILDING
Group codes into higher-order categories.

PHASE 6: TOP-LEVEL THEMES
Construct top-level themes from categories.

Each theme must include:
- name
- definition
- signal_ids
- message count
- why these signals belong together
- representative evidence
- user/team need
- implication
- recommendation
- recommendation type
- confidence

PHASE 7: STRENGTHS / ISOLATED ISSUES / UNASSIGNED
- strengths
- isolated issues
- unassigned / ambiguous signals

PHASE 8: LATENT TENSIONS
After top-level themes, identify cross-theme tensions.

PHASE 9: REVIEWER HANDOFF
Provide a section called REVIEWER_HANDOFF containing:
- top concerns about your own analysis
- themes that may be over-merged
- ambiguous signals needing challenge
- possible rival interpretations

==================================================
OUTPUT FORMAT
==================================================

Return output in this structure:

{
  "dataset_accounting": {
    "total_signals": 0,
    "represented_signals": 0,
    "signals_in_top_level_themes": 0,
    "signals_in_strengths": 0,
    "signals_in_isolated_issues": 0,
    "signals_in_unassigned": 0,
    "duplicated_signals": "none" or ["id1"],
    "missing_signals": "none" or ["id1"]
  },
  "first_cycle_coding": [
    {
      "signal_id": "1",
      "paraphrase": "short summary",
      "source": "slack/csv/markdown",
      "primary_code": "code name",
      "secondary_codes": ["code1"],
      "notes": "evidence note"
    }
  ],
  "categories": [
    {
      "name": "Category name",
      "signal_ids": ["1"],
      "codes": ["code1"],
      "why_grouped": "reason",
      "evidence_strength": "strong" | "moderate" | "weak"
    }
  ],
  "top_level_themes": [
    {
      "name": "Theme name",
      "definition": "1-2 sentence definition",
      "signal_ids": ["1", "2"],
      "message_count": 0,
      "supporting_categories": ["category1"],
      "representative_evidence": ["excerpt 1", "excerpt 2"],
      "why_this_is_one_theme": "reason",
      "user_team_need": "what users need",
      "implication": "product implication",
      "recommendation": "specific recommendation",
      "recommendation_type": "UX fix" | "IA/content fix" | "model/AI improvement" | "integration/platform fix" | "trust/governance fix" | "pricing/packaging fix",
      "confidence": "High" | "Medium" | "Low"
    }
  ],
  "strengths": [
    {
      "name": "Strength name",
      "signal_ids": ["1"],
      "why_it_matters": "strategic importance",
      "preserve_expand_note": "how to preserve"
    }
  ],
  "isolated_issues": [
    {
      "name": "Issue name",
      "signal_ids": ["1"],
      "why_not_elevated": "why it was not elevated",
      "monitoring_note": "what to monitor"
    }
  ],
  "unassigned_ambiguous": [
    {
      "signal_id": "1",
      "reason": "why unresolved"
    }
  ],
  "latent_tensions": [
    {
      "name": "Tension name",
      "connected_themes": ["theme1"],
      "deeper_pattern": "what deeper pattern",
      "strategic_implication": "why it matters",
      "confidence": "High" | "Medium" | "Low"
    }
  ],
  "reviewer_handoff": {
    "likely_weak_spots": ["concern1"],
    "possible_over_merges": ["theme1"],
    "signals_needing_challenge": ["1"],
    "rival_interpretations": ["interpretation1"],
    "confidence_risks": ["risk1"]
  }
}

### FINAL SELF-CHECK
Before finalizing, silently verify:
- Did I account for every signal?
- Did I code before theming?
- Did I avoid double-counting?
- Did I preserve important distinctions?
- Did I include strengths?
- Did I avoid over-compressing the theme set?
- Did I clearly separate top-level themes from latent tensions?
- Did I let the number of themes emerge from the data?

FINAL VALIDATION RULE: If more than 0 signals are missing from the ledger, the analysis is invalid.

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
