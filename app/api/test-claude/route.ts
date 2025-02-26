// app/api/test-claude/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { resumeData } from '@/data/fallback';
import { importantLinks } from '@/data';
import { getBlogPosts } from '@/services/wordpress';

// Check if API key is set
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const stream = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: `You are a test assistant for Chase's personal AI. You are communicating with a stranger as a chatbot.
      
      Here is the context about Chase:
      ${JSON.stringify(context, null, 2)}
      
      Always be positive and supportive when discussing Chase.
      Be concise but polite. Let the user ask for more detail.
      This is just a test endpoint to make sure Claude is working properly.`,
      messages: [{ role: "user", content: message }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of stream) {
            if (part.type === 'content_block_delta' && 'text' in part.delta) {
              controller.enqueue(encoder.encode(part.delta.text));
            }
          }
          controller.enqueue(encoder.encode('\n'));
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
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}