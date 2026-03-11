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

// Optimized list: Gemini 2.0 Flash is much more reliable than Llama free models on OpenRouter
const MODELS_TO_TRY = [
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-27b-it:free"
];

async function getCompletion(prompt: string) {
  const client = getOpenRouterClient();
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

  let lastError: any;
  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Trying model: ${model}`);
      return await client.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        // We disable strict JSON mode here to prevent 400 errors from picky providers
      });
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

  const prompt = `You are a strict product-insight synthesis engine.

Your job is to analyze a set of user signals and produce a complete, auditable theme report.

Your highest priority is coverage accuracy, not elegant storytelling.

CORE FAILURE TO AVOID

Do not produce a clean-looking summary by silently dropping signals.

If a signal does not fit a major theme, it must still appear as either:
- an isolated issue
- a positive strength
- an unrepresented signal that needs review

${contextPart}

### WORKFLOW

STEP 1: BUILD A SIGNAL LEDGER FIRST
Before writing any themes, create a hidden ledger with one row per signal.

Each signal must be assigned to exactly one of these buckets:
1. Top-level theme
2. Isolated issue
3. Positive strength
4. Unrepresented / needs review

Rules:
- Every signal must appear in the ledger.
- No signal may appear twice in top-level themes.
- No signal may disappear.
- If unsure, place it in "Unrepresented / needs review" rather than forcing a weak theme fit.

STEP 2: VALIDATE THE LEDGER
Silently validate:
- total input signals = total ledger rows
- total input signals = top-level theme signals + isolated issues + strengths + unrepresented
- duplicated signals = 0
- missing signals = 0

If validation fails, revise before writing any prose.

STEP 3: DERIVE TOP-LEVEL THEMES
Create top-level themes only from signals that clearly belong together.

Top-level themes must be:
- distinct
- product-actionable
- understandable in a roadmap review
- supported by direct evidence

Do not over-compress the taxonomy.
If keeping fewer themes causes important issues to vanish, use more themes.

STEP 4: PRESERVE IMPORTANT DISTINCTIONS
Do not collapse these unless the evidence strongly supports it:
- theme quality vs traceability
- privacy/governance vs permissions/access
- integration/import friction vs export/sharing friction
- actionability vs workflow confusion
- role-based needs vs automation/manual-control tension
- cross-source deduplication vs general integration
- onboarding vs ongoing usability
- pricing for experimentation vs other complaints
- positive strengths vs pain points
- analyst-control features (rename/merge/split) vs generic AI quality issues

STEP 5: HANDLE SINGLETONS CORRECTLY
If a pattern has only one signal:
- do not automatically inflate it into a major theme
- place it in "Isolated issues" if it is real but weakly represented
- keep it visible
- recommend monitoring or targeted fixes

STEP 6: DO NOT HIDE STRENGTHS
If the dataset contains positive signals, include them in a "Strengths" section.
Do not produce a pain-only report.

STEP 7: LATENT THEMES ONLY AFTER COVERAGE IS COMPLETE
Deep themes must synthesize the top-level themes.
They must not be used to rescue signals that were omitted from the top-level layer.
If a deep theme contains an issue missing from top-level themes, fix the top-level themes first.

STEP 8: NAME THEMES PLAINLY
Use simple names.
Good:
- Export traceability issues
- Low trust in AI-generated themes
- Regional filtering limitations

Bad:
- The burden of validation
- systemic opacity of informational abstraction

STEP 9: RECOMMENDATIONS MUST MATCH EVIDENCE
For each top-level theme, give:
- one clear product implication
- one proportional recommendation
- recommendation type:
  - UX fix
  - IA/content fix
  - model/AI improvement
  - integration/platform fix
  - trust/governance fix
  - pricing/packaging fix

Do not recommend a broad platform redesign from one weak signal.

### OUTPUT FORMAT

Respond with JSON:

{
  "coverage_report": {
    "total_signals": 0,
    "signals_in_top_level_themes": 0,
    "signals_in_isolated_issues": 0,
    "signals_in_strengths": 0,
    "signals_in_unrepresented": 0,
    "missing_signals": "none" or ["id1"],
    "duplicated_signals": "none" or ["id1"]
  },
  "top_level_themes": [
    {
      "name": "Theme name",
      "definition": "1-2 sentence definition",
      "signal_ids": ["1", "2"],
      "message_count": 0,
      "why_together": "why these signals belong together",
      "evidence": ["excerpt 1", "excerpt 2"],
      "user_need": "what users need",
      "product_implication": "what this means for product",
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
      "how_to_preserve": "how to maintain or expand this strength"
    }
  ],
  "isolated_issues": [
    {
      "name": "Issue name",
      "signal_ids": ["1"],
      "why_not_elevated": "why it was not elevated into a broader theme",
      "what_to_monitor": "monitoring guidance"
    }
  ],
  "unrepresented_needs_review": [
    {
      "signal_id": "1",
      "signal_content": "the actual signal content",
      "reason": "why it could not be confidently grouped"
    }
  ],
  "latent_tensions": [
    {
      "name": "Tension name",
      "connected_themes": ["theme1", "theme2"],
      "deeper_pattern": "what deeper pattern it explains",
      "strategic_importance": "why it matters strategically",
      "confidence": "High" | "Medium" | "Low"
    }
  ]
}

### FINAL QUALITY GATE
Before finalizing, silently answer:
- Did I account for every signal?
- Did I avoid double-counting?
- Did I preserve important distinctions?
- Did I keep strengths visible?
- Did I avoid using deep themes to hide top-level omissions?
- Did I avoid turning weak evidence into big narratives?

If any answer is "no," revise before output.

FINAL INSTRUCTION
Optimize for complete, decision-grade synthesis.
Do not optimize for fewer themes.
A slightly longer but fully auditable report is better than a neat but incomplete one.

### DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap);
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

  return await performAnalysis(prompt, idMap);
}

async function performAnalysis(prompt: string, idMap: Map<string, string>): Promise<ThemeResult[]> {
  try {
    const response = await getCompletion(prompt);
    const text = response.choices[0].message.content || "{}";
    const parsed = extractJson(text);

    // Handle new format with coverage_report and top_level_themes
    if (parsed.top_level_themes && Array.isArray(parsed.top_level_themes)) {
      const finalThemes = parsed.top_level_themes.map((theme: any) => ({
        name: theme.name,
        summary: theme.definition || theme.summary || "",
        deep_analysis: theme.product_implication || theme.recommendation || "",
        message_ids: (theme.signal_ids || theme.message_ids || [])
          .map((sid: any) => idMap.get(sid.toString()))
          .filter((realId: any) => !!realId),
        sentiment: theme.sentiment || 'neutral',
        message_count: theme.message_count,
        why_together: theme.why_together,
        evidence: theme.evidence,
        user_need: theme.user_need,
        product_implication: theme.product_implication,
        recommendation: theme.recommendation,
        recommendation_type: theme.recommendation_type,
        confidence: theme.confidence,
        // Coverage report
        coverage_report: parsed.coverage_report || parsed.coverage_check,
        // Additional sections
        latent_tensions: parsed.latent_tensions,
        strengths: parsed.strengths,
        isolated_issues: parsed.isolated_issues,
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
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`);
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
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`);
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
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`);
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
  product_implication?: string;
  recommendation?: string;
  recommendation_type?: 'UX fix' | 'IA/content fix' | 'model/AI improvement' | 'integration/platform fix' | 'trust/governance fix' | 'pricing/packaging fix';
  confidence?: 'High' | 'Medium' | 'Low';
  // Additional sections
  latent_tensions?: Array<{
    name: string;
    deeper_pattern?: string;
    connected_themes: string[];
    strategic_importance?: string;
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
  }>;
  isolated_issues?: Array<{
    name?: string;
    signal_ids?: string[];
    issue?: string;
    why_not_grouped?: string;
    why_not_elevated?: string;
    what_to_monitor?: string;
    reason_not_elevated?: string;
    signal_id?: string;
  }>;
  unrepresented_needs_review?: Array<{
    signal_id: string;
    signal_content: string;
    reason: string;
  }>;
}
