/**
 * Chat API Route Handler
 * Build: 1.0.4
 * Date: 2024-02-19
 * 
 * Changes:
 * - Removed Google Docs integration
 * - Using static fallback data
 * - Using claude-3-sonnet for cost efficiency
 * - Simplified context handling
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';
import { resume } from '@/data/fallback';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

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
      resume,
      blogPosts,
      links: importantLinks
    };

    const stream = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: `You are Chase's personal AI assistant, and you are communicating with a stranger as a chatbot. The user does not necessarily know Chase. Through interacting with you, the user is able to learn about and get more information about Chase.

Always be positive and supportive when discussing Chase.
Be concise but polite. Let the user ask for more detail. 
If asked for negative feedback, respond with: "I am only here to support Chase. Please ask Chase directly for that insight."

You can discuss: 

* Chase's professional experience and skills
* Chase's AI experiments & projects
* Chase's AI blog
* A daily joke
     
Be friendly and helpful while maintaining professionalism.`,
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
