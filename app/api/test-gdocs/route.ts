// app/api/test-gdocs/route.ts
import { NextResponse } from 'next/server';
import { getResume } from '@/services/googleDocs';

export async function GET() {
  try {
    // Test the connection and get resume data
    const resume = await getResume();
    
    // Return successful response with data
    return NextResponse.json({
      status: 'success',
      message: 'Google Docs API connection successful',
      data: resume,
      credentials: {
        clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? 'Set' : 'Missing',
        docId: process.env.GOOGLE_DOC_ID ? 'Set' : 'Missing'
      }
    });
  } catch (error) {
    // Return error details
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      credentials: {
        clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? 'Set' : 'Missing',
        docId: process.env.GOOGLE_DOC_ID ? 'Set' : 'Missing'
      }
    }, { status: 500 });
  }
}
