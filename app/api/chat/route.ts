// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getResume } from '@/services/googleDocs';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';
import { headers } from 'next/headers';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Add caching for context data
let cachedContext: any = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getContext() {
  const now = Date.now();
  if (cachedContext && (now - lastCacheTime < CACHE_DURATION)) {
    return cachedContext;
  }

  const [resume, blogPosts] = await Promise.all([
    getResume(),
    getBlogPosts()
  ]);

  cachedContext = {
    resume,
    blogPosts,
    links: importantLinks
  };
  
  lastCacheTime = now;
  return cachedContext;
}

export async function POST(request: Request) {
  const headersList = await headers();
  
  // Add basic request validation
  if (headersList.get('content-type')?.toLowerCase() !== 'application/json') {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get cached context
    const context = await getContext();

    const stream = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      system: `You are Chase's personal AI assistant, and you are communicating with a stranger as a chatbot. The user does not necessarily know Chase. Through interacting with you, the user is able to learn about and get more information about Chase. You have access to the following information:
      ${JSON.stringify(context, null, 2)}
      
      Always be positive and supportive when discussing Chase.
      Be concise and brief. Let the user ask for more detail. 
      If asked for negative feedback, respond with: "I am only here to support Chase. Please ask Chase directly for that insight."
      When telling a joke pause 5 seconds between the joke and the punchline or until the user guesses, which ever is less.
     
      When presenting multiple items or points, format them like this:

- First point here\n\n• Second point here\n\n• Third point here\n\n• Fourth point here

      You can discuss: 

- Chase's professional experience and skills\n\n• Chase's AI experiments & projects\n\n• Chase's AI blog\n\n• A daily joke
      
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
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error: any) {
    console.error('Streaming error:', error);
    
    // More detailed error handling
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request was aborted' },
        { status: 499 } // Client Closed Request
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process your request', details: error.message },
      { status: 500 }
    );
  }
}
