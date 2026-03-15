import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Progress callback type
type ProgressCallback = (progress: string) => void;
let globalProgressCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback | null) {
  globalProgressCallback = callback;
}

function sendProgress(progress: string) {
  if (globalProgressCallback) {
    globalProgressCallback(progress);
  }
}

// Get the primary AI provider from environment
const getPrimaryProvider = (): 'mistral' | 'gemini' => {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'mistral') return 'mistral';
  if (provider === 'gemini') return 'gemini';
  // Default to mistral if MISTRAL_API_KEY is set
  if (process.env.MISTRAL_API_KEY) return 'mistral';
  return 'gemini';
};

// Google Gemini client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Get the Gemini model name from env or use default
const getGeminiModel = (): string => {
  return process.env.GEMINI_MODEL || "gemini-3-flash-preview";
};

// Mistral client
const getMistralClient = () => {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is missing");
  }
  return new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: "https://api.mistral.ai/v1"
  });
};

// Get the Mistral model name from env or use default
const getMistralModel = (): string => {
  return process.env.MISTRAL_MODEL || "mistral-large-latest";
};

// OpenRouter client for fallback models
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

// Get fallback models from environment variables
const getFallbackModels = (): string[] => {
  const envModel = process.env.FALLBACK_MODEL;
  const fallbacks = [
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen3-8b-instruct:free",
    "deepseek/deepseek-chat:free"
  ];
  if (envModel) return [envModel, ...fallbacks];
  return fallbacks;
};

async function getCompletion(prompt: string, modelSet: 'primary' | 'reviewer' | 'fallback' = 'primary') {
  // Primary and Reviewer models - use Mistral by default, fallback to Gemini
  if (modelSet === 'primary' || modelSet === 'reviewer') {
    const provider = getPrimaryProvider();

    // Try Mistral first if configured
    if (provider === 'mistral') {
      try {
        const client = getMistralClient();
        const modelName = getMistralModel();
        console.log(`Using Mistral: ${modelName} (${modelSet} set)`);
        sendProgress(`Calling Mistral ${modelName}...`);

        // Timeout for Mistral request (2 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
          sendProgress("Waiting for AI response...");
          const result = await client.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
          }, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          console.log(`AI response received: ${result.choices[0].message.content?.length || 0} chars`);
          sendProgress(`Response received, parsing...`);

          return {
            choices: [{
              message: {
                content: result.choices[0].message.content || "",
                role: "assistant" as const
              }
            }]
          };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        console.warn(`Mistral failed for ${modelSet}: ${error.message}`);
        sendProgress(`Mistral error: ${error.message}`);
        // Fall through to try Gemini
      }
    }

    // Try Gemini
    try {
      const genAI = getGeminiClient();
      const modelName = getGeminiModel();
      console.log(`Using Gemini: ${modelName} (${modelSet} set)`);
      sendProgress(`Calling Gemini ${modelName}...`);

      const model = genAI.getGenerativeModel({ model: modelName });

      // Timeout for Gemini request (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        sendProgress("Waiting for AI response...");
        const result = await model.generateContent(prompt);
        clearTimeout(timeoutId);

        const response = result.response;
        const text = response.text();

        console.log(`AI response received: ${text.length} chars`);
        sendProgress(`Response received (${text.length} chars), parsing...`);

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
      console.warn(`Gemini failed for ${modelSet}: ${error.message}`);
      sendProgress(`Gemini error: ${error.message}`);
      throw error;
    }
  }

  // Fallback models use OpenRouter
  const models = getFallbackModels();
  const client = getOpenRouterClient();
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

  // Timeout for each model attempt (in ms)
  const MODEL_TIMEOUT = 120000; // 2 minutes per model

  let lastError: any;
  for (const model of models) {
    try {
      console.log(`Trying model: ${model} (fallback set)`);
      sendProgress(`Trying fallback model: ${model}...`);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT);

      try {
        sendProgress("Waiting for AI response...");
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }, {
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed: ${error.message}`);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("All models failed");
}

function extractJson(text: string) {
  // Handle empty or non-string input
  if (!text || typeof text !== 'string') {
    throw new Error("Invalid response: empty or non-string");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Invalid response: empty after trim");
  }

  try {
    // 1. Try direct parse
    return JSON.parse(trimmed);
  } catch (e) {
    // 2. Try to find the first '{' and last '}'
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const jsonStr = trimmed.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (e2) {
        // 3. Try to find the first '[' and last ']' if it returned an array
        const startArr = trimmed.indexOf('[');
        const endArr = trimmed.lastIndexOf(']');
        if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
          try {
            const arrStr = trimmed.substring(startArr, endArr + 1);
            return JSON.parse(arrStr);
          } catch (e3) {
            // 4. Try removing markdown code blocks
            const withoutMarkdown = trimmed
              .replace(/```json\n?/gi, '')
              .replace(/```\n?/g, '');
            try {
              return JSON.parse(withoutMarkdown);
            } catch (e4) {
              // 5. Try finding any balanced JSON-like structure
              const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  return JSON.parse(jsonMatch[0]);
                } catch (e5) {
                  // Ignore
                }
              }
            }
          }
        }
      }
    }
    // Log the problematic response for debugging
    console.error("Failed to parse AI response:", trimmed.substring(0, 500));
    throw new Error("Could not find valid JSON in AI response");
  }
}

export async function analyzeThemesLayer1(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  if (messages.length === 0) return [];

  sendProgress(`Preparing ${messages.length} signals for Layer 1 analysis...`);

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  sendProgress("Building Layer 1 analysis prompt...");

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are the Layer 1 analysis engine for product-level qualitative synthesis.

Your job is to transform raw user signals into evidence-backed product themes that help a team improve its product or service.

You are NOT a summarizer. You are NOT a quote collector. You are NOT a topic bucketer.
You are acting like a skilled senior UX researcher.

${contextPart}

## STRICT OUTPUT REQUIREMENT
You MUST respond with ONLY valid JSON. No conversational text. No markdown. No explanations. No introductions. Just pure JSON.

Output format must be:
{
  "worklog": [ ... ],
  "dataset_accounting": { ... },
  "signal_ledger": [ ... ],
  "categories": [ ... ],
  "top_level_themes": [ ... ],
  "latent_tensions": [ ... ],
  "strengths": [ ... ],
  "isolated_issues": [ ... ],
  "unassigned_ambiguous": [ ... ]
}

If you cannot produce valid JSON for any reason, output: {"error": "reason"}

--------------------------------------------------
LIVE RESEARCHER WORKLOG
--------------------------------------------------

Your analysis process must be VISIBLE to the user. Do not keep your reasoning opaque.

As you work through each stage, output structured progress updates in this exact JSON format:

{
  "worklog": [
    {
      "stage": "STAGE NAME",
      "goal": "What you are trying to determine",
      "doing": ["bullet 1", "bullet 2", "bullet 3"],
      "observations": ["pattern 1", "pattern 2"],
      "decisions": ["decision 1", "decision 2"],
      "open_questions": ["question 1", "question 2"],
      "progress": "X/Y signals processed - status"
    }
  ]
}

IMPORTANT: After each worklog entry, IMMEDIATELY return to your analysis. Do not wait.
The worklog should be embedded within your JSON output as you progress through stages.

Your worklog entries should appear AFTER you complete each stage:
- After reading the dataset (Stage 1)
- After first-pass coding (Stage 3)
- After clustering codes (Stage 4)
- After forming candidate themes (Stage 5)
- After theme boundary audit (Stage 6)
- After assigning strengths/isolated/ambiguous (Stage 7)
- Before final audit (Stage 8)

Do not reveal hidden private chain-of-thought.
Do show professional research trace: what stage, what you're doing, what patterns you notice, what decisions you make, what remains uncertain.

--------------------------------------------------
1. WHAT A THEME IS (CRITICAL)
--------------------------------------------------

A theme is a pattern of shared meaning organized by a central concept.

A theme is NOT:
- a product area label
- a list of quotes
- a cluster of similar words
- a summary of one screen or feature
- a catch-all topic bucket
- a clever phrase with weak evidence

A good theme:
- explains what pattern is occurring
- explains why the included signals belong together
- explains why the pattern matters for the product
- is supported by multiple relevant signals or by strategically weighty evidence
- is distinct from neighboring themes
- implies a reasonably coherent product response

--------------------------------------------------
2. NON-NEGOTIABLE RULES (VIOLATIONS MAKE OUTPUT INVALID)
--------------------------------------------------

1. Every signal must be accounted for exactly once in the primary layer.
2. No signal may disappear - ALL signals must appear in output.
3. No signal may belong to multiple top-level themes.
4. You must code before building themes.
5. You must not jump directly from raw data to polished themes.
6. You must not force all valid signals into full themes.
7. You must preserve strengths explicitly.
8. You must preserve important isolated issues explicitly.
9. You must keep ambiguous signals visible instead of hiding them.
10. You must prefer completeness over elegance.
11. You must use plain, product-usable theme names.
12. You must not use deep analysis to compensate for weak product-level synthesis.
13. DO NOT drop signals to make themes cleaner - every signal needs a home.
14. COMPLETENESS IS MORE IMPORTANT THAN ELEGANCE.

If any of these rules are violated, the analysis is invalid.

--------------------------------------------------
3. ANALYSIS STAGES (FOLLOW EXACTLY)
--------------------------------------------------

STAGE 1: Dataset familiarization
- Read the full dataset
- Note signal types, sources, repeated ideas, contradictions, standout quotes
- Print what patterns you are noticing

STAGE 2: Signal ledger creation
- Create one row per signal
- Classify: pain point, request, workaround, concern, strength, ambiguity

STAGE 3: First-pass coding
- Create concise primary codes for each signal
- Show examples of code families emerging

STAGE 4: Code clustering
- Group related codes into categories
- Call out weak or tentative categories

STAGE 5: Candidate theme generation
- Build themes from categories
- Explain central organizing idea for each

STAGE 6: Theme boundary audit
- Compare themes for overlap
- Merge if same evidence/same intervention
- Split if different interventions needed
- Show what changed

STAGE 7: Strengths / isolated issues / ambiguous
- Create explicit buckets
- Explain why items not in full themes

STAGE 8: Final coverage audit
- Verify every signal has exactly one home
- Print final audit result

--------------------------------------------------
4. OUTPUT STRUCTURE
--------------------------------------------------

Return:

A. Dataset accounting (MUST be complete - no missing signals)
- total_signals: number (must match input)
- represented_signals: number (signals in themes + strengths + isolated + ambiguous)
- signals_in_top_level_themes: number
- signals_in_strengths: number
- signals_in_isolated_issues: number
- signals_in_unassigned_ambiguous: number
- missing_signals: [] (MUST be empty - every signal accounted for)
- duplicate_assignments: [] (MUST be empty - no signal in multiple places)

B. Signal ledger (summary - key fields only)
- signal_id
- paraphrase
- source_type
- primary_code
- secondary_codes
- signal_type

C. Category map
- category_name
- codes
- signal_ids
- why_grouped
- evidence_strength

D. Top-level product themes
For each:
- name
- definition (what the theme is and why signals belong together)
- scope (what is included and excluded)
- signal_ids
- message_count
- supporting_categories
- why_this_is_one_theme
- representative_evidence (JSON array of strings)
- user_need / user_friction
- product_implication
- recommendation_direction
- recommendation_type (UX fix, IA/content fix, model/AI improvement, integration/platform fix, trust/governance fix, pricing/packaging fix, workflow/process fix)
- confidence (High, Medium, Low)

E. Latent Tensions (Section D in documentation)
For each:
- name
- deeper_pattern
- connected_themes (list of theme names)
- strategic_importance
- confidence (High, Medium, Low)

F. Strengths (MUST include - array can be empty if no strengths found)
For each:
- name
- signal_ids
- what_users_value
- why_it_matters
- how_to_preserve

G. Isolated issues (MUST include - array can be empty if no isolated issues)
For each:
- name
- signal_ids
- issue_description
- why_not_elevated (low frequency but worth monitoring)
- what_to_monitor

H. Unassigned / ambiguous (MUST include - array can be empty if all assigned)
For each:
- signal_id
- reason (why cannot be confidently placed)

--------------------------------------------------
5. FINAL SELF-CHECK (MANDATORY)
--------------------------------------------------

CRITICAL: Before finalizing, you MUST verify the following:

1. SIGNAL ACCOUNTING:
   - Every input signal must appear EXACTLY once in the output
   - signals_in_top_level_themes + signals_in_strengths + signals_in_isolated_issues + signals_in_unassigned_ambiguous MUST equal total_signals
   - missing_signals MUST be an empty array (0 missing)
   - duplicate_assignments MUST be an empty array (0 duplicates)

2. THEME INTEGRITY:
   - If one theme contains signals that would lead to DIFFERENT roadmap actions, SPLIT it
   - Decision rule: Different product interventions = different themes
   - Do not optimize for fewer themes if it causes signal loss

3. COVERAGE REQUIREMENTS:
   - Do NOT drop any signals to make themes cleaner
   - Every signal must have a home: theme, strength, isolated issue, or ambiguous
   - Prefer completeness over elegance

4. NAMING:
   - Use plain, product-language names
   - Names should tell a PM what to do, not just what users talked about

If ANY of these fail, REVISE before output.

DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap, 'primary');
}

export async function analyzeThemesLayer2(messages: { id: string; content: string }[], aiContext?: string | null): Promise<ThemeResult[]> {
  // Layer 2 is now integrated into Layer 1 as "Latent Tensions", but we keep this function 
  // if a dedicated deep dive is explicitly requested or for legacy support.
  // It effectively acts as a "Reviewer" pass now.
  
  if (messages.length === 0) return [];

  sendProgress(`Preparing ${messages.length} signals for Deep Strategic Review...`);

  const idMap = new Map<string, string>();
  const simplifiedMessages = messages.map((m, index) => {
    const simpleId = (index + 1).toString();
    idMap.set(simpleId, m.id);
    return { id: simpleId, content: m.content };
  });

  sendProgress("Building Strategic Review prompt...");

  const contextPart = aiContext ? `\nUSER-PROVIDED CONTEXT:\n${aiContext}\n` : '';

  const prompt = `You are an expert Strategic Product Analyst.

STRICT OUTPUT REQUIREMENT: You MUST respond with ONLY valid JSON.

Output format must be:
{
  "latent_tensions": [ { "name": "...", ... } ]
}

## MISSION

Your goal is to synthesize DEEP, LATENT, and INTERPRETIVE patterns that connect the top-level themes.

## ANALYSIS PRINCIPLES

1. INTERPRETIVE DEPTH: Go beyond the surface. Identify underlying assumptions, organizational dynamics, and systemic issues.
2. CROSS-THEME SYNTHESIS: A deep tension should connect insights from multiple areas.

${contextPart}

### FORMAT:
Respond ONLY with a JSON object. No other text.
JSON SCHEMA: {
  "latent_tensions": [
    {
      "name": "Tension Title",
      "deeper_pattern": "Latent Analysis: 1-2 paragraphs exploring conceptual significance.",
      "connected_themes": ["theme1", "theme2"],
      "strategic_importance": "Why this matters strategically",
      "confidence": "High"
    }
  ]
}

### DATASET (MESSAGES):
${JSON.stringify(simplifiedMessages)}`;

  return await performAnalysis(prompt, idMap, 'reviewer');
}

async function performAnalysis(prompt: string, idMap: Map<string, string>, modelSet: 'primary' | 'reviewer' | 'fallback' = 'primary'): Promise<ThemeResult[]> {
  try {
    const response = await getCompletion(prompt, modelSet);
    const text = response.choices[0].message.content || "{}";
    console.log(`Raw AI response (first 500 chars): ${text.substring(0, 500)}`);
    const parsed = extractJson(text);
    console.log(`Parsed JSON keys: ${Object.keys(parsed).join(', ')}`);

    // Extract and send worklog entries as progress updates (for Layer 1)
    if (parsed.worklog && Array.isArray(parsed.worklog)) {
      for (const entry of parsed.worklog) {
        const stage = entry.stage || 'Processing';
        const progress = entry.progress || '';
        const observations = (entry.observations || []).join('; ');
        const decisions = (entry.decisions || []).join('; ');
        const doing = (entry.doing || []).join('; ');
        const goal = entry.goal || '';
        const openQuestions = (entry.open_questions || []).join('; ');

        // Send structured progress that frontend can parse
        sendProgress(`[${stage}] GOAL: ${goal} | DOING: ${doing} | OBSERVATIONS: ${observations} | DECISIONS: ${decisions} | QUESTIONS: ${openQuestions} | PROGRESS: ${progress}`);
      }
    }

    // Handle standard format with top_level_themes (Layer 1)
    const themesArray = parsed.top_level_themes;
    if (themesArray && Array.isArray(themesArray)) {
      console.log(`Found ${themesArray.length} top-level themes`);
      const finalThemes = themesArray.map((theme: any) => ({
        name: theme.name,
        summary: theme.definition || theme.summary || "",
        deep_analysis: theme.implication || theme.product_implication || theme.recommendation || "", // Map to description in DB
        message_ids: (theme.signal_ids || theme.message_ids || [])
          .map((sid: any) => idMap.get(sid.toString()))
          .filter((realId: any) => !!realId),
        sentiment: theme.sentiment || 'neutral',
        message_count: theme.message_count,
        why_together: theme.why_this_is_one_theme || theme.why_together,
        evidence: theme.representative_evidence || theme.evidence,
        user_need: theme.user_team_need || theme.user_need || theme.user_friction,
        product_implication: theme.implication || theme.product_implication,
        implication: theme.implication,
        recommendation: theme.recommendation,
        recommendation_direction: theme.recommendation_direction,
        recommendation_type: theme.recommendation_type,
        confidence: theme.confidence,
        scope: theme.scope,
        supporting_categories: theme.supporting_categories,
        representative_evidence: theme.representative_evidence, // New field mapping
        
        // Global analysis fields attached to every theme (filtered at save time)
        dataset_accounting: parsed.dataset_accounting,
        signal_ledger: parsed.signal_ledger,
        categories: parsed.categories,
        latent_tensions: parsed.latent_tensions,
        strengths: parsed.strengths,
        isolated_issues: parsed.isolated_issues,
        unassigned_ambiguous: parsed.unassigned_ambiguous
      }));
      return finalThemes;
    }

    // Handle Layer 2 latent tensions format
    const latentTensionsArray = parsed.latent_tensions;
    if (latentTensionsArray && Array.isArray(latentTensionsArray)) {
      console.log(`Found ${latentTensionsArray.length} latent tensions`);
      return latentTensionsArray.map((tension: any) => ({
        name: tension.name,
        summary: tension.deeper_pattern || "",
        deep_analysis: tension.strategic_importance || "",
        message_ids: [], // Tensions connect themes, not usually direct signals in this format
        sentiment: 'mixed',
        confidence: tension.confidence,
        // Mark as tension for DB saving
        is_latent_tension: true,
        connected_themes: tension.connected_themes
      }));
    }

    return [];
  } catch (error) {
    console.error('AI Theme Analysis failed:', error);
    return [];
  }
}

export async function analyzeSentiment(content: string): Promise<'positive' | 'negative' | 'neutral' | null> {
  const systemPrompt = "Classify the sentiment of the message as exactly one word: positive, negative, or neutral.";
  const userPrompt = `Message: "${content}"`;
  try {
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
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
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
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
    const response = await getCompletion(`${systemPrompt}\n\nINPUT: ${userPrompt}`, 'fallback');
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

  // Live researcher worklog
  worklog?: Array<{
    stage: string;
    goal: string;
    doing: string[];
    observations: string[];
    decisions: string[];
    open_questions: string[];
    progress: string;
  }>;

  // New fields
  scope?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  product_implication?: string;
  recommendation_direction?: string;
  recommendation_type?: 'UX fix' | 'IA/content fix' | 'model/AI improvement' | 'integration/platform fix' | 'trust/governance fix' | 'pricing/packaging fix' | 'workflow/process fix';
  user_need?: string;
  representative_evidence?: string[];
  
  // Global analysis fields attached to theme result
  dataset_accounting?: any;
  signal_ledger?: any[];
  categories?: any[];
  latent_tensions?: any[];
  strengths?: any[];
  isolated_issues?: any[];
  unassigned_ambiguous?: any[];
  
  // Internal flags
  is_latent_tension?: boolean;
  connected_themes?: string[];

  // Legacy fields kept for compatibility
  message_count?: number;
  why_together?: string;
  evidence?: string[];
  user_team_need?: string;
  implication?: string;
  recommendation?: string;
  supporting_categories?: string[];
}
