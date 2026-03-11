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

  const prompt = `You are a strict thematic synthesis engine for product signals.

Your goal is to derive product-insight themes from mixed-source signals without losing coverage, collapsing important distinctions, or hiding unassigned evidence.

${contextPart}

### PRIORITY ORDER

1. Full coverage
2. Clean top-level clustering
3. Clear evidence traceability
4. Strategic interpretation
5. Good writing

### NON-NEGOTIABLE RULES

1. Every signal must be handled explicitly
- Start by creating a hidden assignment table with every signal ID.
- Each signal must end in exactly one of these buckets:
  a) a top-level theme
  b) isolated issue
  c) positive strength
- No signal may disappear.
- No signal may be counted twice across top-level themes.

2. Do not over-compress
- Do not reduce the taxonomy so much that important patterns vanish.
- If simplifying the theme set causes distinct issues to disappear, keep more themes.
- Coverage is more important than elegance.

3. Preserve these issue types when present
Do not accidentally bury these inside broad buckets:
- collaboration / export friction
- privacy / data governance
- permissions / access control
- AI trust / traceability
- theme quality / grouping accuracy
- analyst control features like rename / merge / split
- pricing for experimentation
- cross-source deduplication
- positive strengths
- automation vs manual control tensions

4. Broad themes need justification
- Do not use one broad theme like "usability and workflow issues" unless the grouped signals truly share the same product problem and same likely solution.
- A bug, an onboarding issue, a mobile UI problem, and terminology confusion should not be merged just because they all create friction.

5. Positive signals must survive
- If the dataset contains strengths, capture them explicitly.
- Do not produce a pain-only analysis.
- Positive signals can be listed under a separate "Strengths" section when they do not justify a larger theme.

6. Isolated issues must be visible
- If a signal does not belong in a broad theme, place it in "Isolated issues" instead of forcing it into the wrong bucket.
- Never hide isolated issues by omitting them.

7. Recommendations must match scope
- Give recommendations only at the level supported by evidence.
- One signal = narrow recommendation.
- Multiple related signals = broader recommendation.
- Do not suggest major platform redesigns from weak evidence.

8. Latent themes come after top-level themes
- Deep analysis must synthesize the top-level themes.
- It must not act as a dumping ground for missing issues.
- If a concept is important enough to appear in deep analysis but missing from top-level themes, fix the top-level themes first.

9. Plain naming only
- Use short, product-usable names.
- Avoid dramatic or academic labels.
- Prefer "Export traceability issues" over "The burden of validation."

10. Hard validation before output
Silently check:
- total input signals = total signals represented in top-level themes + isolated issues + strengths
- duplicated signals = 0
- unrepresented signals = 0

If not true, revise before answering.

### OUTPUT FORMAT

Respond with JSON:

{
  "coverage_check": {
    "total_signals": 0,
    "signals_in_top_level_themes": 0,
    "signals_in_strengths": 0,
    "signals_in_isolated_issues": 0,
    "unrepresented_signals": "none" or ["id1"],
    "duplicate_signals": "none" or ["id1"]
  },
  "top_level_themes": [
    {
      "name": "Theme name",
      "definition": "1-2 sentence definition",
      "signal_ids": ["1", "2"],
      "message_count": 0,
      "why_together": "why these signals belong in one theme",
      "evidence": ["excerpt 1", "excerpt 2"],
      "user_need": "what users need",
      "product_implication": "what this means for product",
      "recommendation": "specific recommendation",
      "confidence": "High"
    }
  ],
  "strengths": [
    {
      "signal_ids": ["1"],
      "what_users_value": "what users value",
      "why_it_matters": "strategic importance"
    }
  ],
  "isolated_issues": [
    {
      "signal_ids": ["1"],
      "why_not_grouped": "why it doesn't fit broader themes",
      "what_to_monitor": "monitoring guidance"
    }
  ],
  "latent_tensions": [
    {
      "name": "Tension name",
      "connected_themes": ["theme1", "theme2"],
      "deeper_pattern": "what deeper pattern it explains",
      "strategic_importance": "why it matters",
      "confidence": "Medium"
    }
  ]
}

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

    // Handle new format with top_level_themes
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
        confidence: theme.confidence,
        // Coverage check
        coverage_check: parsed.coverage_check,
        // Additional fields
        latent_tensions: parsed.latent_tensions,
        strengths: parsed.strengths,
        isolated_issues: parsed.isolated_issues
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
  // Coverage check
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
    signal_ids?: string[];
    description?: string;
    what_users_value?: string;
    why_it_matters?: string;
    evidence?: string;
    how_to_preserve?: string;
  }>;
  isolated_issues?: Array<{
    signal_ids?: string[];
    issue?: string;
    why_not_grouped?: string;
    what_to_monitor?: string;
    reason_not_elevated?: string;
    signal_id?: string;
  }>;
}
