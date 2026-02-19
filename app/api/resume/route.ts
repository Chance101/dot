// app/api/resume/route.ts
import { NextResponse } from 'next/server';
import { resumeData } from '@/data/fallback';

export async function GET() {
  try {
    // Simply return the static resume data
    return NextResponse.json({ resume: resumeData });
  } catch (error) {
    console.error('Resume fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}