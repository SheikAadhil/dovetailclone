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

  const prompt = `You are a Senior Product Strategist and UX Researcher.
Your goal is to extract immediately actionable Product Insights and UX Friction points from these signals.

${contextPart}

### RIGOROUS ANALYSIS REQUIREMENTS (MANDATORY):

1. COVERAGE DISCIPLINE (MANDATORY):
- You MUST count EVERY signal exactly once in the top-level theme layer
- Do NOT drop any signal
- Do NOT double-count signals across top-level themes
- If a signal relates to multiple ideas, assign it to ONE primary theme and optionally list secondary tags separately

2. OUTPUT FORMAT (MANDATORY):
You MUST include a dataset accounting section in your response:
```
## A. Dataset Accounting
- Total signals: [EXACT COUNT]
- Assigned to top-level themes: [MUST EQUAL TOTAL]
- Unassigned: none (or list any that couldn't be assigned)
- Duplicates: none (or list any duplicates)
```

3. THEME OUTPUT FORMAT (MANDATORY):
For each theme, include:
- Name (plain, product-usable - avoid theatrical labels)
- Definition (1 sentence)
- Signal IDs (list all message IDs assigned)
- Why this is one theme (central organizing concept)
- Representative evidence (2-3 signal excerpts)
- User need
- Product implication
- Recommendation (labeled as: UX fix, IA/content fix, model/AI improvement, integration/platform fix, trust/governance fix, or pricing/packaging consideration)
- Confidence: High / Medium / Low

4. TWO-LAYER STRUCTURE (MANDATORY):
- TOP-LEVEL THEMES: For prioritization and roadmap decisions
- LATENT TENSIONS: Cross-cutting dynamics that synthesize across multiple themes (NOT just renamed themes)

5. NON-OVERLAPPING THEMES (MANDATORY):
- Each theme must be DISTINCT
- Do NOT have overlapping themes like "trust vs accuracy vs transparency" saying the same thing
- If themes could be merged without losing decision value, MERGE them

6. INCLUDE POSITIVE SIGNALS (MANDATORY):
- Do NOT output only pain points
- If signals include strengths, wins, or sticky behaviors, capture them as "Strengths / Pull Factors"

7. EVIDENCE-BASED (MANDATORY):
- Every theme claim must be grounded in signal evidence
- If evidence is weak, state "Confidence: Low"

### ANALYSIS PRINCIPLES (LAYER 1 - PRODUCT INSIGHTS):
1. ACTIONABILITY: Every theme must be something a product team can act on (Feature requests, bugs, UI friction, workflow gaps).
2. MULTIPLE THEMES: Identify 3-8 distinct themes.
3. SURFACE PATTERNS: Focus on what is explicitly stated and common pain points.

### FORMAT:
Respond with a JSON object containing:
1. "dataset_accounting": { total_signals, assigned_to_themes, unassigned, duplicates }
2. "top_level_themes": [ { name, definition, signal_ids, why_this_theme, evidence, user_need, product_implication, recommendation, confidence } ]
3. "latent_tensions": [ { name, deeper_pattern, connected_themes, strategic_importance, confidence } ]
4. "strengths": [ { description, evidence } ]
5. "missed_areas": [ { issue, signal_id } ]

JSON SCHEMA:
{
  "dataset_accounting": {
    "total_signals": 0,
    "assigned_to_themes": 0,
    "unassigned": "none",
    "duplicates": "none"
  },
  "top_level_themes": [
    {
      "name": "Theme Title",
      "definition": "1-sentence definition",
      "signal_ids": ["1", "2"],
      "why_this_theme": "central organizing concept",
      "evidence": ["signal excerpt 1", "signal excerpt 2"],
      "user_need": "what users need",
      "product_implication": "what this means for product",
      "recommendation": "UX fix",
      "confidence": "High"
    }
  ],
  "latent_tensions": [
    {
      "name": "Tension Name",
      "deeper_pattern": "what it explains",
      "connected_themes": ["theme1", "theme2"],
      "strategic_importance": "why it matters",
      "confidence": "Medium"
    }
  ],
  "strengths": [
    { "description": "what users value", "evidence": "signal excerpt" }
  ],
  "missed_areas": [
    { "issue": "singleton or weak area", "signal_id": "id" }
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

    // Handle new rigorous format with dataset_accounting and top_level_themes
    if (parsed.top_level_themes && Array.isArray(parsed.top_level_themes)) {
      const finalThemes = parsed.top_level_themes.map((theme: any) => ({
        name: theme.name,
        summary: theme.definition || theme.summary,
        deep_analysis: theme.product_implication || theme.recommendation || theme.why_this_theme || "",
        message_ids: (theme.signal_ids || theme.message_ids || [])
          .map((sid: any) => idMap.get(sid.toString()))
          .filter((realId: any) => !!realId),
        sentiment: theme.sentiment || 'neutral',
        dataset_accounting: parsed.dataset_accounting,
        latent_tensions: parsed.latent_tensions,
        strengths: parsed.strengths,
        missed_areas: parsed.missed_areas
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
  // New rigorous analysis fields
  dataset_accounting?: {
    total_signals: number;
    assigned_to_themes: number;
    unassigned: string | string[];
    duplicates: string | string[];
  };
  latent_tensions?: Array<{
    name: string;
    deeper_pattern: string;
    connected_themes: string[];
    strategic_importance: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  strengths?: Array<{
    description: string;
    evidence: string;
  }>;
  missed_areas?: Array<{
    issue: string;
    signal_id: string;
  }>;
}
