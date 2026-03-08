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

const PRIMARY_MODEL = process.env.PRIMARY_MODEL || "google/gemini-2.0-flash-exp:free";
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

export interface ThemeResult {
  name: string;
  summary: string;
  message_ids: string[];
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
}

async function getCompletion(system: string, user: string, useJson = false) {
  const client = getOpenRouterClient();
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  try {
    return await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Some models via OpenRouter handle JSON mode better than others
      response_format: useJson ? { type: "json_object" } : undefined,
    });
  } catch (error: any) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed, switching to fallback. Error:`, error.message);
    
    return await client.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: useJson ? { type: "json_object" } : undefined,
    });
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
    
    // Clean up content (remove markdown if any)
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    // Robustness: Handle cases where model returns array directly instead of { themes: [] }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    if (parsed.themes && Array.isArray(parsed.themes)) {
      return parsed.themes;
    }

    console.warn("AI returned unexpected JSON structure:", parsed);
    return [];
  } catch (error) {
    console.error('AI Theme Analysis failed:', error);
    return [];
  }
}
