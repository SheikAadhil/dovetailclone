import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Google Gemini client for Sensing
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Get the Gemini model name from env or use default
const getSensingModel = (): string => {
  return process.env.GEMINI_MODEL || "gemini-3-flash-preview";
};

// OpenRouter client for fallback (if Gemini fails)
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

// Fallback models for Sensing
const getFallbackModels = (): string[] => {
  const envModel = process.env.FALLBACK_MODEL;
  const fallbacks = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-8b-instruct:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return fallbacks;
};

// ======== WEB SEARCH FUNCTIONS ========

interface SearchResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

async function performWebSearch(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!tavilyKey) {
    console.log("[Sensing] No Tavily API key, using AI-only mode");
    return [];
  }

  try {
    // Search for recent information (last 6 months)
    const searchQuery = `${query} 2025 2026 latest news trends`;
    const response = await fetch(`https://api.tavily.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${tavilyKey}&max_results=15&include_answer=true&include_raw_content=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error("[Sensing] Tavily search failed:", response.status);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = (data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      published_date: r.published_date || ""
    }));

    console.log(`[Sensing] Web search returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error("[Sensing] Web search error:", error);
    return [];
  }
}

async function getSearchResultsSummary(query: string, searchResults: SearchResult[]): Promise<string> {
  if (searchResults.length === 0) {
    return "";
  }

  const context = searchResults.slice(0, 10).map(r => `
Source: ${r.title}
URL: ${r.url}
Date: ${r.published_date || 'Unknown'}
Content: ${r.content.substring(0, 800)}
`).join('\n---\n');

  const summaryPrompt = `You are a research assistant. Summarize the key information from these search results about "${query}". Focus on:
- Recent developments and news (2025-2026)
- Key trends and patterns
- Important announcements
- Industry shifts

SEARCH RESULTS:
${context}

Provide a comprehensive summary (3-4 paragraphs) of the most important recent information.`;

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: getSensingModel() });
    const result = await model.generateContent(summaryPrompt);
    return result.response.text();
  } catch (error) {
    console.error("[Sensing] Failed to summarize search results:", error);
    return "";
  }
}

// ======== AI COMPLETION ========

async function getCompletion(prompt: string) {
  // Try Gemini first for Sensing
  try {
    const genAI = getGeminiClient();
    const modelName = getSensingModel();
    console.log(`[Sensing] Using Gemini: ${modelName}`);

    const model = genAI.getGenerativeModel({ model: modelName });

    // Timeout for Gemini request (3 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const result = await model.generateContent(prompt);
      clearTimeout(timeoutId);

      const response = result.response;
      const text = response.text();

      // Convert Gemini response to OpenAI-compatible format
      return {
        choices: [{
          message: {
            content: text,
            role: "assistant" as const
          }
        }]
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.warn(`[Sensing] Gemini failed: ${error.message}`);
  }

  // Fallback to OpenRouter if Gemini fails
  const models = getFallbackModels();
  const client = getOpenRouterClient();

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const MODEL_TIMEOUT = 180000; // 3 minutes

  let lastError: any;
  for (const model of models) {
    try {
      console.log(`[Sensing] Trying fallback model: ${model}`);
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
      console.warn(`[Sensing] Fallback model ${model} failed: ${error.message}`);
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

// The main research function - expert-level strategic foresight
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
  sources_summary?: string;
}> {
  console.log(`[Sensing] Starting research on: ${query}`);

  // Step 1: Perform web search for recent information
  const searchResults = await performWebSearch(query);

  // Step 2: Get summary of search results if we have any
  const sourcesSummary = await getSearchResultsSummary(query, searchResults);

  // Step 3: Build the expert-level research prompt
  const prompt = `You are a Senior Strategic Foresight Expert with 20+ years of experience in futures research, scenario planning, and trend analysis. You've worked with Fortune 500 companies and government agencies to identify emerging signals and strategic opportunities.

## MISSION
Research the topic below and conduct a thorough, expert-level analysis to identify:
1. SIGNALS - Specific, concrete data points, events, or observations that indicate change is ALREADY happening
2. WEAK SIGNALS - Early, ambiguous indicators of potential future changes (emerging patterns)
3. TRENDS - Directional patterns that can be measured over time
4. DRIVERS - Underlying forces using STEEPLE (Social, Technological, Economic, Environmental, Political, Legal, Ethical)

## CRITICAL REQUIREMENTS

### For SIGNALS (minimum 15):
- Must be SPECIFIC and VERIFIABLE
- Must have clear DATES (2025-2026 preferred, 2024 acceptable)
- Must cite SOURCE (publication, company, research institution)
- Each signal must be a distinct, non-overlapping data point
- Prioritize RECENT signals (2025-2026)

### For WEAK SIGNALS (minimum 10):
- These are early indicators, not yet proven
- Focus on emerging technologies, shifting consumer behaviors, regulatory discussions
- Explain WHY they might matter in 3-5 years

### For TRENDS (minimum 8):
- Must have clear DIRECTION (rising/falling/stable)
- Must cite quantitative evidence where possible
- Must explain the mechanism driving the trend

### For DRIVERS (minimum 6):
- Cover multiple STEEPLE categories
- Explain the causal mechanism

${sourcesSummary ? `## RECENT WEB RESEARCH (use this information to inform your analysis)
${sourcesSummary}
` : ''}

## OUTPUT FORMAT
STRICT: You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations.

Output format:
{
  "signals": [
    {
      "title": "specific event/announcement/data point",
      "description": "detailed explanation of what this signal is and why it matters",
      "source": "publication name, company, or institution",
      "source_url": "url if available",
      "date": "YYYY-MM-DD or just year if unknown",
      "relevance": "high|medium|low"
    }
  ],
  "weak_signals": [
    {
      "description": "description of the weak signal",
      "potential_impact": "how this could impact the industry/market in 3-5 years",
      "uncertainty_level": "high|medium|low"
    }
  ],
  "trends": [
    {
      "name": "clear trend name",
      "direction": "rising|falling|stable",
      "description": "what the trend is and its current state",
      "evidence": ["specific data point 1", "specific data point 2", "specific data point 3"]
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

Remember:
- Prioritize RECENT (2025-2026) information
- Be specific and actionable
- Each signal must be unique and non-overlapping
- Provide comprehensive coverage (aim for maximum items in each category)`;

  console.log(`[Sensing] Sending prompt to AI (${prompt.length} chars)`);
  const response = await getCompletion(prompt);
  const text = response.choices[0]?.message?.content || "";

  console.log(`[Sensing] Received response (${text.length} chars)`);

  const parsed = extractJson(text);

  console.log(`[Sensing] Parsed: ${parsed.signals?.length || 0} signals, ${parsed.weak_signals?.length || 0} weak signals, ${parsed.trends?.length || 0} trends, ${parsed.drivers?.length || 0} drivers`);

  // Validate the structure
  return {
    signals: parsed.signals || [],
    weak_signals: parsed.weak_signals || [],
    trends: parsed.trends || [],
    drivers: parsed.drivers || [],
    sources_summary: sourcesSummary
  };
}
