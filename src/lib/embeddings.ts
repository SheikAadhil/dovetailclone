import OpenAI from 'openai';

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text) return null;
  
  // Initialize OpenRouter client for embeddings
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Pulse Dovetail Clone",
    },
  });

  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY is missing. Skipping embedding generation.');
    return null;
  }

  try {
    // OpenRouter supports OpenAI embedding models
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    }
    return null;
  } catch (error) {
    console.error('Error generating embedding via OpenRouter:', error);
    return null;
  }
}
