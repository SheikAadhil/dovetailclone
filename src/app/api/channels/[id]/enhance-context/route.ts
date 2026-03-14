import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { context } = await request.json();
  if (!context) {
    return new NextResponse('Context is required', { status: 400 });
  }

  const client = getOpenRouterClient();
  const MODELS_TO_TRY = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free"
  ];

  const systemPrompt = `You are an expert at writing AI analysis instructions. 
You rewrite vague context prompts into precise, structured instructions that help AI identify the most relevant themes from user feedback. 
Keep the result under 400 characters. 
Return only the enhanced text, no explanation.`;

  const userPrompt = `Rewrite this context to be more precise and actionable: "${context}"`;

  let enhanced = context;
  let lastError: any;

  for (const model of MODELS_TO_TRY) {
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: "user", content: `INSTRUCTIONS: ${systemPrompt}\n\nINPUT: ${userPrompt}` },
        ],
      });
      enhanced = response.choices[0].message.content?.trim() || context;
      break; 
    } catch (error: any) {
      lastError = error;
      continue;
    }
  }

  if (!enhanced && lastError) {
    return new NextResponse(lastError.message, { status: 500 });
  }

  return NextResponse.json({ enhanced });
}
