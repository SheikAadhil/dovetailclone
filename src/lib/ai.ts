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

/**
 * VERIFIED FREE MODELS (MARCH 2026)
 * These models use the :free suffix to ensure they target the free endpoints.
 */
const MODELS_TO_TRY = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];

async function getCompletion(system: string, user: string, useJson = false) {
  const client = getOpenRouterClient();
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  let lastError: any;

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Attempting AI analysis with model: ${model}`);
      return await client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
    console.error('AI Sentiment Error:', error);
    return null;
  }
}

export async function analyzeThemes(messages: { id: string; content: string }[]): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const system = `You are a customer feedback analyst. Your goal is to group similar messages into 2-5 clear themes.
Even if the messages are varied, you MUST find common threads or group them by general intent.
Respond ONLY with a valid JSON object. 
Format: { "themes": [ { "name": "Theme Name", "summary": "Theme Summary", "message_ids": ["id1", "id2"], "sentiment": "positive/negative/mixed/neutral" } ] }`;

  const user = `Analyze these messages and find patterns:\n${JSON.stringify(messages)}`;

  try {
    const response = await getCompletion(system, user, true);
    const content = response.choices[0].message.content || "{}";
    
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    if (Array.isArray(parsed)) return parsed;
    if (parsed.themes && Array.isArray(parsed.themes)) return parsed.themes;

    return [];
  } catch (error) {
    console.error('AI Theme Analysis failed:', error);
    return [];
  }
}

export interface ThemeResult {
  name: string;
  summary: string;
  message_ids: string[];
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
}
