import OpenAI from "openai";

const getOpenRouterClient = () => {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Pulse Dovetail Clone - Sensing",
    },
  });
};

// Research models - prioritize fast and capable models
const getResearchModels = (): string[] => {
  const envModel = process.env.SENSING_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-001",
    "google/gemma-3-4b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return fallbacks;
};

async function getCompletion(prompt: string) {
  const models = getResearchModels();
  const client = getOpenRouterClient();

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const MODEL_TIMEOUT = 180000; // 3 minutes

  let lastError: any;
  for (const model of models) {
    try {
      console.log(`[Sensing] Trying model: ${model}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT);

      try {
        const response = await client.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }, { signal: controller.signal });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.warn(`[Sensing] Model ${model} failed: ${error.message}`);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("All models failed");
}

function extractJson(text: string) {
  if (!text || typeof text !== 'string') {
    throw new Error("Invalid response: empty");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Invalid response: empty after trim");
  }

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.substring(start, end + 1));
      } catch (e2) {
        // Try markdown code blocks
        const withoutMarkdown = trimmed
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '');
        try {
          return JSON.parse(withoutMarkdown);
        } catch (e3) {
          // Try finding any JSON
          const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch (e4) {
              // Ignore
            }
          }
        }
      }
    }
    throw new Error("Could not find valid JSON in AI response");
  }
}

// The main research function
export async function researchTopic(query: string): Promise<{
  signals: Array<{
    title: string;
    description: string;
    source: string;
    source_url?: string;
    date?: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  weak_signals: Array<{
    description: string;
    potential_impact: string;
    uncertainty_level: 'high' | 'medium' | 'low';
  }>;
  trends: Array<{
    name: string;
    direction: 'rising' | 'falling' | 'stable';
    description: string;
    evidence: string[];
  }>;
  drivers: Array<{
    category: 'social' | 'technological' | 'economic' | 'environmental' | 'political' | 'legal' | 'ethical';
    description: string;
    impact: string;
  }>;
}> {
  const prompt = `You are a strategic foresight researcher. Your task is to research the topic below and identify:
1. SIGNALS - Specific data points, events, or observations that indicate change is happening
2. WEAK SIGNALS - Early, unclear indicators of potential future changes
3. TRENDS - Directional patterns over time (rising/falling/stable)
4. DRIVERS - Underlying forces (STEEPLE: Social, Technological, Economic, Environmental, Political, Legal, Ethical)

STRICT OUTPUT REQUIREMENT: You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations.

Output format:
{
  "signals": [
    {
      "title": "signal title",
      "description": "what this signal is",
      "source": "where you found it",
      "source_url": "url if available",
      "date": "when it was observed",
      "relevance": "high|medium|low"
    }
  ],
  "weak_signals": [
    {
      "description": "description of weak signal",
      "potential_impact": "how it might impact the future",
      "uncertainty_level": "high|medium|low"
    }
  ],
  "trends": [
    {
      "name": "trend name",
      "direction": "rising|falling|stable",
      "description": "what the trend is",
      "evidence": ["evidence 1", "evidence 2"]
    }
  ],
  "drivers": [
    {
      "category": "social|technological|economic|environmental|political|legal|ethical",
      "description": "what the driver is",
      "impact": "how it drives change"
    }
  ]
}

Research topic: ${query}

Provide as many relevant signals, weak signals, trends, and drivers as you can find. Be specific and cite sources where possible.`;

  const response = await getCompletion(prompt);
  const text = response.choices[0]?.message?.content || "";

  const parsed = extractJson(text);

  // Validate the structure
  return {
    signals: parsed.signals || [],
    weak_signals: parsed.weak_signals || [],
    trends: parsed.trends || [],
    drivers: parsed.drivers || []
  };
}
