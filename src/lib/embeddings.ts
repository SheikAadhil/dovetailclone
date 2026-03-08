import OpenAI from 'openai';

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text) return null;
  
  // Initialize client inside the function to prevent build-time crashes
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  });

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is missing. Skipping embedding generation.');
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    }
    return null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}
