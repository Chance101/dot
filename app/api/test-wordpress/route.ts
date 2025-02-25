// app/api/test-wordpress/route.ts
import { NextResponse } from 'next/server';
import { getBlogPosts } from '@/services/wordpress';

export async function GET() {
  try {
    // Test the connection and get blog posts
    const posts = await getBlogPosts();
    
    // Return successful response with data
    return NextResponse.json({
      status: 'success',
      message: 'WordPress API connection successful',
      data: posts,
      credentials: {
        wpApiUrl: process.env.WORDPRESS_API_URL ? 'Set' : 'Missing',
      }
    });
  } catch (error) {
    // Return error details
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      credentials: {
        wpApiUrl: process.env.WORDPRESS_API_URL ? 'Set' : 'Missing',
      }
    }, { status: 500 });
  }
}
