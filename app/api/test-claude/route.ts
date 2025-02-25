// app/api/test-claude/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'ANTHROPIC_API_KEY is not set',
        credentials: {
          anthropicKey: 'Missing'
        }
      }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Test the connection with a simple request
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Respond with 'Connection successful'" }],
    });

    return NextResponse.json({
      status: 'success',
      message: 'Claude API connection successful',
      response: response.content[0].text,
      credentials: {
        anthropicKey: 'Set'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      credentials: {
        anthropicKey: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Missing'
      }
    }, { status: 500 });
  }
}
