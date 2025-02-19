// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getResume } from '@/services/googleDocs';
import { getBlogPosts } from '@/services/wordpress';
import { importantLinks } from '@/data';

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
    // Fetch both resume and blog posts
    const [resume, blogPosts] = await Promise.all([
      getResume(),
      getBlogPosts()
    ]);

    // Create context object
    const context = {
      resume,
      blogPosts,
      links: importantLinks
    };

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
              const chunk = part.delta.text;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          // Send an empty chunk to signal completion
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
