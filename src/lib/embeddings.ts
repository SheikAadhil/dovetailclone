import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text) return null;
  
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
