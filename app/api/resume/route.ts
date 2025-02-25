// app/api/resume/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resume = await getResume();
    return NextResponse.json({ resume });
  } catch (error) {
    console.error('Resume fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}
