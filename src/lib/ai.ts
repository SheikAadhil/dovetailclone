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

export async function analyzeThemes(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are a Dual-Layer Analyst: acting as both a Senior Product Strategist and a Qualitative Researcher (Reflexive Thematic Analysis). 
Your goal is to extract patterns that are both immediately actionable and deeply interpretive.

${contextPart}

### ANALYSIS PRINCIPLES:
1. DUAL-LAYER INSIGHTS: For every theme, you must provide both a Surface/Product Layer and a Deep/Latent Layer.
2. IDENTIFY MULTIPLE THEMES: Identify 3-8 distinct themes. Do not consolidate unrelated insights. Even a few signals can contain multiple distinct insights.
3. INTERPRETIVE DEPTH: Use Latent Analysis to identify underlying meanings, assumptions, and organizational dynamics (e.g., "Invisible Labor", "Voice Not Valued", "The Paradox of Speed").

### YOUR DUAL-LAYER PROCESS:
- LAYER 1 (SURFACE): What is explicitly stated? What product friction or user needs are immediate? How do we fix this now?
- LAYER 2 (DEEP): What are the underlying patterns? What does this say about team health, latent assumptions, or the broader customer relationship? 

### FORMAT: 
Respond ONLY with a JSON object. No other text.
JSON SCHEMA: { 
  "themes": [ 
    { 
      "name": "Coherent Theme Title", 
      "summary": "Product-Focused Insight: 1-2 sentences on actionable friction and immediate recommendations.", 
      "deep_analysis": "Reflexive/Latent Analysis: 1-2 paragraphs exploring the underlying meaning, conceptual significance, and systemic patterns.",
      "message_ids": ["1", "2"], 
      "sentiment": "mixed" 
    } 
  ] 
}

### DATASET (MESSAGES): 
${JSON.stringify(simplifiedMessages)}`;

  try {
    const response = await getCompletion(prompt);
    const text = response.choices[0].message.content || "{}";
    const parsed = extractJson(text);
    
    const rawThemes = Array.isArray(parsed) ? parsed : (parsed.themes || []);

    const finalThemes = rawThemes.map((theme: any) => ({
      ...theme,
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
}
