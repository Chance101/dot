/**
 * Chat API Route Handler
 * Build: 1.0.6
 * Date: 2024-02-19
 * 
 * Changes:
 * - Updated to use resumeData from fallback.ts
 * - Aligned with existing data structure
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';
import { resumeData } from '@/data/fallback';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  const { message, history = [] } = await request.json();

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  // Build conversation messages from history (limit to last 10 exchanges)
  let conversationHistory: ConversationMessage[] = history
    .slice(-20) // Last 20 messages (10 exchanges)
    .map((msg: { type: string; content: string }) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
    .filter((msg: ConversationMessage) => msg.content.trim() !== '');

  // Claude API requires first message to be from user - skip leading assistant messages
  while (conversationHistory.length > 0 && conversationHistory[0].role === 'assistant') {
    conversationHistory = conversationHistory.slice(1);
  }

  // Add current message
  conversationHistory.push({ role: 'user', content: message });

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
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      system: `You are Chase's personal AI assistant, and you are communicating with a stranger as a chatbot. The user does not necessarily know Chase. Through interacting with you, the user is able to learn about and get more information about Chase.

Always be positive and supportive when discussing Chase.
Be concise but polite. Let the user ask for more detail. 
If asked for negative feedback, respond with: "I am only here to support Chase. Please ask Chase directly for that insight."

Here is the context about Chase:
${JSON.stringify(context, null, 2)}

You can discuss: 

* Chase's professional experience and skills
* Chase's AI experiments & projects
* Chase's AI blog
* A daily joke
     
Be friendly and helpful while maintaining professionalism.`,
      messages: conversationHistory,
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
    console.error('Conversation history:', JSON.stringify(conversationHistory, null, 2));

    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process your request', details: errorMessage },
      { status: 500 }
    );
  }
}
