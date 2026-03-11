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

Your task is to analyze a set of user signals and produce decision-grade themes.

Your top priority is auditability, not eloquence.

${contextPart}

### OPERATING RULES

1. Assignment first, writing second
- Before writing any theme narrative, create a hidden assignment table mapping every signal ID to exactly one top-level theme.
- Do not write themes until this assignment table is complete.
- If any signal is unassigned or assigned to more than one top-level theme, stop and fix it before continuing.

2. Hard accounting rule
- Every input signal must be assigned exactly once at the top-level.
- No dropped signals.
- No duplicated signals.
- No theme can claim a message count unless the count exactly matches the assigned signal IDs.

3. Fail-safe validation
Before finalizing, silently validate:
- total input signals = total unique assigned signals
- duplicate assigned signals = 0
- unassigned signals = 0
If validation fails, revise the clustering instead of generating prose.

4. Two layers only
Produce only:
- Top-level product themes
- Latent tensions

Do not create extra layers.
Do not mix top-level themes with latent tensions.

5. Top-level theme standard
Top-level themes must be:
- mutually distinct
- product-actionable
- understandable in a roadmap review
- based on directly observable evidence in the signals

6. Latent tension standard
Latent tensions must:
- synthesize across multiple top-level themes
- explain a deeper strategic pattern
- not simply rename a top-level theme
- reference top-level themes, not raw signals only

7. Naming rules
Use plain, functional names.
Avoid dramatic, academic, or consultant-style labels.
Bad: "The Performative Facade of AI-Driven Insight"
Good: "Low trust in AI-generated themes"

8. Preserve key distinctions
Do not collapse these unless the evidence is extremely strong:
- theme quality/control vs traceability/trust
- import/ingestion friction vs sharing/export friction
- privacy/governance vs permissions/access
- actionability vs workflow confusion
- role-based needs vs automation-vs-control tension
- cross-source deduplication vs source integration
- onboarding vs ongoing usability
- pricing for experimentation vs general pricing complaints
- segmentation/filtering needs vs broad granularity issues

9. Singleton rule
- If a pattern appears in only one signal, treat it as an isolated issue unless there is strong justification to elevate it.
- Do not inflate singleton issues into major themes.
- You may keep important singleton issues, but label them clearly as isolated or emerging.

10. Positive signal rule
- Capture positive signals explicitly.
- Do not produce a pain-only report.
- If users value something, list it under a Strengths section or as a positive theme when justified.

11. Recommendation rule
Every recommendation must be:
- directly tied to the evidence
- proportional to the evidence
- concrete, not vague

Label each recommendation as one of:
- UX fix
- IA/content fix
- model/AI improvement
- integration/platform fix
- trust/governance fix
- pricing/packaging fix

12. No narrative inflation
- Do not use abstract language to make weak evidence sound profound.
- Do not infer hidden motives unless clearly supported.
- If the evidence is mixed or weak, say so plainly.

### OUTPUT FORMAT

Respond with a JSON object:

{
  "dataset_accounting": {
    "total_signals": 0,
    "total_top_level_themes": 0,
    "total_assigned_signals": 0,
    "unassigned_signals": "none" or ["id1", "id2"],
    "duplicate_assigned_signals": "none" or ["id1", "id2"]
  },
  "top_level_themes": [
    {
      "name": "Plain theme name",
      "definition": "1-sentence definition",
      "signal_ids": ["1", "2"],
      "message_count": 2,
      "why_together": "central organizing concept",
      "evidence": ["signal excerpt 1", "signal excerpt 2"],
      "user_need": "what users need",
      "product_implication": "what this means for product",
      "recommendation": "specific recommendation",
      "recommendation_type": "UX fix",
      "confidence": "High"
    }
  ],
  "strengths": [
    {
      "description": "what users value",
      "evidence": "signal excerpt",
      "how_to_preserve": "how to maintain this strength"
    }
  ],
  "latent_tensions": [
    {
      "name": "Tension name",
      "deeper_pattern": "what deeper pattern it explains",
      "connected_themes": ["theme1", "theme2"],
      "strategic_meaning": "why it matters strategically",
      "confidence": "Medium"
    }
  ],
  "isolated_issues": [
    {
      "issue": "issue description",
      "signal_id": "id",
      "reason_not_elevated": "why treated as isolated"
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

    // Handle new rigorous format with dataset_accounting and top_level_themes
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
        dataset_accounting: parsed.dataset_accounting,
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
  // New rigorous analysis fields
  dataset_accounting?: {
    total_signals: number;
    total_top_level_themes: number;
    total_assigned_signals: number;
    unassigned_signals: string | string[];
    duplicate_assigned_signals: string | string[];
  };
  latent_tensions?: Array<{
    name: string;
    deeper_pattern: string;
    connected_themes: string[];
    strategic_meaning: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  strengths?: Array<{
    description: string;
    evidence: string;
    how_to_preserve?: string;
  }>;
  isolated_issues?: Array<{
    issue: string;
    signal_id: string;
    reason_not_elevated: string;
  }>;
  // Theme-specific fields
  message_count?: number;
  why_together?: string;
  evidence?: string[];
  user_need?: string;
  product_implication?: string;
  recommendation?: string;
  recommendation_type?: string;
}
