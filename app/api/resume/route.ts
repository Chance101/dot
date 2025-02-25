// app/api/resume/route.ts
import { NextResponse } from 'next/server';
import { resumeData } from '@/data/fallback';

export async function GET() {
  try {
    // Use resumeData directly instead of calling getResume()
    const resume = resumeData;
    return NextResponse.json({ resume });
  } catch (error) {
    console.error('Resume fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}
