// app/api/test-claude/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET() {
  try {
    // Simple test to check if API connection works
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 100,
      messages: [
        { role: "user", content: "Hello, please respond with a simple greeting." }
      ]
    });

    // Safety check for content structure
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);

    return NextResponse.json({
      status: 'success',
      message: 'Claude API connection successful',
      response: responseText,
      credentials: {
        anthropicKey: 'Set'
      }
    });
  } catch (error: any) {
    console.error('Claude API test error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to Claude API',
        error: error.message || 'Unknown error',
        credentials: {
          anthropicKey: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'
        }
      },
      { status: 500 }
    );
  }
}