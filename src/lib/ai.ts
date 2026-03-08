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

const MODELS_TO_TRY = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free"
];

async function getCompletion(system: string, user: string, useJson = false) {
  const client = getOpenRouterClient();
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

  let lastError: any;
  for (const model of MODELS_TO_TRY) {
    try {
      // Robust message structure: Combine system and user into one prompt for maximum compatibility
      const fullPrompt = `INSTRUCTIONS: ${system}\n\nINPUT DATA: ${user}`;
      
      return await client.chat.completions.create({
        model: model,
        messages: [
          { role: "user", content: fullPrompt },
        ],
        response_format: useJson ? { type: "json_object" } : undefined,
      });
    } catch (error: any) {
      console.warn(`Model ${model} failed: ${error.message}`);
      lastError = error;
      continue; 
    }
  }
  throw lastError || new Error("All AI models failed");
}

export async function analyzeThemes(messages: { id: string; content: string }[]): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  const systemPrompt = `You are a customer feedback analyst. Group similar messages into 2-5 clear themes.
Each theme MUST have: 
- "name": Short title (max 5 words)
- "summary": 1-2 sentence description
- "message_ids": An array of the numeric IDs (e.g. ["1", "3"]) that belong to this theme.
- "sentiment": positive, negative, mixed, or neutral.

Respond ONLY with valid JSON in this format: { "themes": [...] }`;

  const userPrompt = `Analyze these messages:\n${JSON.stringify(simplifiedMessages)}`;

  try {
    const response = await getCompletion(systemPrompt, userPrompt, true);
    const content = response.choices[0].message.content || "{}";
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
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
  const system = "Classify the sentiment of the message as exactly one word: positive, negative, or neutral.";
  const user = `Message: "${content}"`;
  try {
    const response = await getCompletion(system, user);
    const result = response.choices[0].message.content?.trim().toLowerCase();
    if (result?.includes('positive')) return 'positive';
    if (result?.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    return null;
  }
}

export interface ThemeResult {
  name: string;
  summary: string;
  message_ids: string[];
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
}
