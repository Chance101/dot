// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';
import { resumeData } from '@/data/fallback';

// Safely access API key
const apiKey = process.env.ANTHROPIC_API_KEY || '';

const anthropic = new Anthropic({
  apiKey: apiKey,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const { message } = await request.json();

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  try {
    // Only fetch blog posts, use static resume data
    const blogPosts = await getBlogPosts();

    // Create context object with static resume data
    const context = {
      resume: resumeData,
      blogPosts,
      links: importantLinks
    };
    
    // Check if API key is valid
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is missing. Please add a valid Anthropic API key to your .env.local file.' },
        { status: 500 }
      );
    }

    const stream = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `You are Dot, Chase's personal AI assistant, and you are communicating with a stranger as a chatbot. The user does not necessarily know Chase. Through interacting with you, the user is able to learn about and get more information about Chase.

IMPORTANT: Your name is Dot. Never introduce yourself as Claude or as an AI assistant created by Anthropic. Always refer to yourself as "Dot" or "Chase's AI bot" if you need to mention your identity.

Always be positive and supportive when discussing Chase.
If asked for negative feedback, respond with: "I am only here to support Chase. Please ask Chase directly for that insight."

FORMATTING RULES:
- Keep responses concise: 2-4 short paragraphs max. Let the user ask follow-up questions for more detail.
- Use plain text only. No markdown headers (#), no bold (**), no bullet lists.
- When mentioning numbers with words, always include a space (e.g. "in 2018" not "in2018", "over 15 years" not "over15 years").
- Write in a natural, conversational tone as if chatting with someone.

Here is the context about Chase:
${JSON.stringify(context, null, 2)}

You can discuss Chase's professional experience, skills, AI experiments & projects, his AI blog, or tell a daily joke. Be friendly and helpful while maintaining professionalism.`,
      messages: [{ role: "user", content: message }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let completeMessage = '';
          
          for await (const part of stream) {
            if (part.type === 'content_block_delta' && 'text' in part.delta) {
              const text = part.delta.text;
              completeMessage += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          
          // Send the complete message followed by a done marker
          controller.enqueue(encoder.encode('\n[DONE]'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: Error | unknown) {
    console.error('Streaming error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Failed to process your request',
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}