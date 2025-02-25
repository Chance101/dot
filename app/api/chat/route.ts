/**
 * Chat API Route Handler
 * Build: 2.0.0
 * Date: 2025-02-25
 * 
 * Features:
 * - Edge Runtime enabled
 * - Claude 3.7 Sonnet integration
 * - Enhanced error handling
 * - Fallback mechanism
 * - Response timeout handling
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';
import { resumeData } from '@/data/fallback';

export const runtime = 'edge';

// Constants
const MODEL = "claude-3-7-sonnet-20250219";
const MAX_TOKENS = 2048;
const REQUEST_TIMEOUT = 30000; // 30 seconds

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  let response: Response;
  
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
    });

    // Create API call promise
    const apiCallPromise = createStreamResponse(message);

    // Race the API call against the timeout
    response = await Promise.race([apiCallPromise, timeoutPromise]);
    
    return response;
  } catch (error: unknown) {
    console.error('API route error:', error instanceof Error ? error.message : 'Unknown error');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Request timeout') {
      return NextResponse.json(
        { error: 'The request timed out. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}

async function createStreamResponse(message: string): Promise<Response> {
  try {
    // Fetch blog posts with a timeout
    let blogPosts = [];
    try {
      blogPosts = await getBlogPosts();
    } catch (error) {
      console.warn('Failed to fetch blog posts, using empty array:', error);
      // Continue with empty blog posts rather than failing
    }

    // Create context object with static resume data
    const context = {
      resume: resumeData,
      blogPosts,
      links: importantLinks
    };

    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are Chase's personal AI assistant named Dot, and you are communicating with a stranger as a chatbot. The user does not necessarily know Chase. Through interacting with you, the user is able to learn about and get more information about Chase.

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
     
Be friendly and helpful while maintaining professionalism.

Always format bulleted lists and numbered lists properly, with each point on a new line preceded by "• " for bullet points.`,
      messages: [{ role: "user", content: message }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let isFirstChunk = true;
          
          for await (const part of stream) {
            if (part.type === 'content_block_delta' && 'text' in part.delta) {
              // If this is the first chunk, log for debugging
              if (isFirstChunk) {
                console.log('First chunk received successfully');
                isFirstChunk = false;
              }
              
              controller.enqueue(encoder.encode(part.delta.text));
            }
          }
          
          // Add end marker to signal completion to the client
          controller.enqueue(encoder.encode('\n[DONE]'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream creation error:', error);
    throw error;
  }
}
