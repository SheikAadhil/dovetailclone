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
IMPORTANT: You MUST use the EXACT "id" strings provided in the input for the "message_ids" array in your response. Do not invent new IDs or use numbers.
Even if the messages are varied, you MUST find common threads or group them by general intent.
Respond ONLY with a valid JSON object. 
Format: { "themes": [ { "name": "Theme Name", "summary": "Theme Summary", "message_ids": ["PROVIDED_ID_1", "PROVIDED_ID_2"], "sentiment": "positive/negative/mixed/neutral" } ] }`;

  const user = `Messages to analyze (Format: ID | Content):\n${messages.map(m => `${m.id} | ${m.content}`).join('\n')}`;

  try {
    const response = await getCompletion(system, user, true);
    const content = response.choices[0].message.content || "{}";
    
    console.log("AI Raw Response:", content);

    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    let themes = [];
    if (Array.isArray(parsed)) themes = parsed;
    else if (parsed.themes && Array.isArray(parsed.themes)) themes = parsed.themes;

    console.log(`AI identified ${themes.length} potential themes.`);
    return themes;
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
