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

const PRIMARY_MODEL = process.env.PRIMARY_MODEL || "anthropic/claude-3.5-sonnet";
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

export interface ThemeResult {
  name: string;
  summary: string;
  message_ids: string[];
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
}

/**
 * Generic chat completion with fallback logic
 */
async function getCompletion(system: string, user: string, useJson = false) {
  const client = getOpenRouterClient();
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  try {
    // Try Primary Model
    return await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: useJson ? { type: "json_object" } : undefined,
    });
  } catch (error: any) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed, switching to fallback. Error:`, error.message);
    
    // Try Fallback Model
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

    if (result === 'positive' || result === 'negative' || result === 'neutral') {
      return result as any;
    }
    return 'neutral';
  } catch (error) {
    console.error('AI Sentiment Error:', error);
    return null;
  }
}

export async function analyzeThemes(messages: { id: string; content: string }[]): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  const system = `You are an expert user feedback analyst. Identify 3-8 recurring themes. 
Respond ONLY with a JSON object containing a "themes" array.
Each theme must have: "name" (max 5 words), "summary" (1-2 sentences), "message_ids" (matching provided IDs), and "sentiment" (positive/negative/mixed/neutral).`;

  const user = `Analyze these ${messages.length} messages:\n${JSON.stringify(messages)}`;

  try {
    const response = await getCompletion(system, user, true);
    const content = response.choices[0].message.content || "{}";
    
    // Clean JSON string if model includes markdown markers
    const cleanJson = content.replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(cleanJson);
    
    return parsed.themes || [];
  } catch (error) {
    console.error('AI Theme Error:', error);
    return [];
  }
}
